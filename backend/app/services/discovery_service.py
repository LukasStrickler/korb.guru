"""
Discovery Service - Qdrant Discovery API with Context Pairs

Implements the context improvement loop:
1. Users swipe recipes (accept/reject)
2. Swipe pairs are stored as context pairs
3. Discovery API uses these pairs to improve recommendations over time
4. Quality metrics are tracked across interactions

This is the key differentiator for the Qdrant hackathon challenge.
"""
import logging
import uuid
from datetime import datetime, timezone

from qdrant_client import models
from sqlmodel import Session, select

from app.models.recipe import SwipeAction
from app.qdrant.client import get_qdrant_client
from app.services.embedding_service import embed_text

logger = logging.getLogger(__name__)


def get_context_pairs(user_id: str, session: Session, max_pairs: int = 10) -> list[models.ContextPair]:
    """
    Build context pairs from user's swipe history.
    Each pair consists of a liked recipe (positive) and a disliked recipe (negative).
    These pairs teach Qdrant what the user prefers relative to alternatives.
    """
    accepts = session.exec(
        select(SwipeAction)
        .where(SwipeAction.user_id == uuid.UUID(user_id), SwipeAction.action == "accept")
        .order_by(SwipeAction.created_at.desc())  # type: ignore
    ).all()

    rejects = session.exec(
        select(SwipeAction)
        .where(SwipeAction.user_id == uuid.UUID(user_id), SwipeAction.action == "reject")
        .order_by(SwipeAction.created_at.desc())  # type: ignore
    ).all()

    if not accepts or not rejects:
        return []

    # Build pairs: each accept paired with a reject
    pairs = []
    for i, accept in enumerate(accepts[:max_pairs]):
        reject = rejects[i % len(rejects)]
        pairs.append(
            models.ContextPair(
                positive=str(accept.recipe_id),
                negative=str(reject.recipe_id),
            )
        )

    return pairs


def _household_filter(household_id: str | None) -> models.Filter | None:
    """Build a Qdrant filter for household-scoped queries (own + public)."""
    if not household_id:
        return None
    return models.Filter(
        should=[
            models.FieldCondition(key="household_id", match=models.MatchValue(value=household_id)),
            models.IsNullCondition(is_null=models.PayloadField(key="household_id")),
        ]
    )


def discover_with_context(
    user_id: str,
    session: Session,
    target_text: str | None = None,
    limit: int = 10,
    household_id: str | None = None,
) -> list:
    """
    Use Qdrant's Discovery API with accumulated context pairs.

    The Discovery API finds points that are closer to positive examples
    and further from negative examples in the context pairs.
    This progressively improves as more swipe data accumulates.
    """
    try:
        client = get_qdrant_client()

        # Build context pairs from swipe history
        context_pairs = get_context_pairs(user_id, session)
        query_filter = _household_filter(household_id)

        # Get target vector: either from text or from user preferences
        if target_text:
            target = embed_text(target_text)
        else:
            # Use user preference vector as target
            pref_results = client.scroll(
                collection_name="user_preferences",
                scroll_filter=models.Filter(
                    must=[models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id))]
                ),
                limit=1,
                with_vectors=True,
            )
            points = pref_results[0]
            if points:
                target = points[0].vector
                if isinstance(target, dict):
                    target = list(target.values())[0]
            else:
                target = embed_text("healthy quick affordable meal")

        if context_pairs:
            # Use Discovery API with context pairs - this is the key feature
            logger.info(f"Discovery search with {len(context_pairs)} context pairs for user {user_id}")
            results = client.discover(
                collection_name="recipes",
                target=target,
                context=context_pairs,
                query_filter=query_filter,
                limit=limit,
            )
        else:
            # Fallback: simple vector search when no context pairs exist yet
            logger.info(f"Discovery fallback (no context pairs) for user {user_id}")
            results = client.query_points(
                collection_name="recipes",
                query=target,
                query_filter=query_filter,
                limit=limit,
            ).points

        return results
    except Exception as e:
        logger.warning("Discovery search failed for user %s: %s", user_id, e)
        return []


def get_discovery_metrics(user_id: str, session: Session) -> dict:
    """
    Track context improvement metrics for the demo.
    Shows how recommendation quality improves as more swipes accumulate.
    """
    client = get_qdrant_client()

    accepts = session.exec(
        select(SwipeAction).where(SwipeAction.user_id == uuid.UUID(user_id), SwipeAction.action == "accept")
    ).all()
    rejects = session.exec(
        select(SwipeAction).where(SwipeAction.user_id == uuid.UUID(user_id), SwipeAction.action == "reject")
    ).all()

    total_swipes = len(accepts) + len(rejects)
    context_pairs = get_context_pairs(user_id, session)

    # Check if user preferences vector exists
    try:
        pref_results = client.scroll(
            collection_name="user_preferences",
            scroll_filter=models.Filter(
                must=[models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id))]
            ),
            limit=1,
        )
        has_preference_vector = len(pref_results[0]) > 0
    except Exception as e:
        logger.warning("Failed to check preference vector for user %s: %s", user_id, e)
        has_preference_vector = False

    # Determine context quality phase
    if total_swipes == 0:
        phase = "cold_start"
        description = "No interactions yet. Using default recommendations."
    elif total_swipes < 5:
        phase = "learning"
        description = "Building initial preference profile. Recommendations improving."
    elif total_swipes < 15:
        phase = "personalized"
        description = "Preference vector established. Discovery API active with context pairs."
    else:
        phase = "refined"
        description = "Rich context history. Highly personalized recommendations."

    return {
        "user_id": user_id,
        "total_swipes": total_swipes,
        "total_accepts": len(accepts),
        "total_rejects": len(rejects),
        "context_pairs_available": len(context_pairs),
        "has_preference_vector": has_preference_vector,
        "phase": phase,
        "phase_description": description,
        "accept_rate": round(len(accepts) / total_swipes * 100, 1) if total_swipes > 0 else 0,
    }
