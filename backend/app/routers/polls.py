import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user, get_household_id
from app.models.user import User
from app.models.poll import MealPoll, PollVote
from app.models.recipe import Recipe
from app.schemas.poll import PollCreate, VoteRequest, PollResponse

router = APIRouter()


@router.post("", response_model=PollResponse, status_code=201)
def create_poll(
    body: PollCreate,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    recipe = session.get(Recipe, body.recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    # Only allow creating polls for public recipes or those in the user's household
    if recipe.household_id is not None and recipe.household_id != household_id:
        raise HTTPException(status_code=403, detail="Recipe does not belong to your household")
    poll = MealPoll(household_id=household_id, recipe_id=body.recipe_id, proposed_by=user.id)
    session.add(poll)
    session.commit()
    session.refresh(poll)
    return _poll_response(poll, session)


@router.post("/{poll_id}/vote")
def vote_on_poll(
    poll_id: uuid.UUID,
    body: VoteRequest,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    poll = session.get(MealPoll, poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    # Reject votes for polls outside the caller's household
    if poll.household_id != household_id:
        raise HTTPException(status_code=404, detail="Poll not found")
    if not poll.is_active:
        raise HTTPException(status_code=400, detail="Poll is closed")
    existing = session.exec(
        select(PollVote).where(PollVote.poll_id == poll_id, PollVote.user_id == user.id)
    ).first()
    if existing:
        existing.vote = body.vote
        session.add(existing)
    else:
        vote = PollVote(poll_id=poll_id, user_id=user.id, vote=body.vote)
        session.add(vote)
    session.commit()
    return {"status": "voted"}


@router.get("/active", response_model=list[PollResponse])
def get_active_polls(household_id: uuid.UUID = Depends(get_household_id), session: Session = Depends(get_session)):
    polls = session.exec(select(MealPoll).where(MealPoll.household_id == household_id, MealPoll.is_active.is_(True))).all()  # type: ignore
    if not polls:
        return []
    # Batch-fetch all votes for active polls (avoids N+1)
    poll_ids = [p.id for p in polls]
    all_votes = session.exec(select(PollVote).where(PollVote.poll_id.in_(poll_ids))).all()
    votes_by_poll: dict[uuid.UUID, list[PollVote]] = {}
    for v in all_votes:
        votes_by_poll.setdefault(v.poll_id, []).append(v)
    return [_poll_response(p, votes=votes_by_poll.get(p.id, [])) for p in polls]


def _poll_response(poll: MealPoll, session: Session | None = None, votes: list[PollVote] | None = None) -> PollResponse:
    if votes is None:
        votes = session.exec(select(PollVote).where(PollVote.poll_id == poll.id)).all()
    return PollResponse(
        id=poll.id,
        recipe_id=poll.recipe_id,
        proposed_by=poll.proposed_by,
        is_active=poll.is_active,
        yes_votes=[v.user_id for v in votes if v.vote == "yes"],
        no_votes=[v.user_id for v in votes if v.vote == "no"],
    )
