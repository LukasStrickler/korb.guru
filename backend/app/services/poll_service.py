"""Poll service for meal voting."""
import uuid

from sqlmodel import Session, select

from app.models.poll import MealPoll, PollVote


def create_poll(household_id: uuid.UUID, recipe_id: uuid.UUID, proposed_by: uuid.UUID, session: Session) -> MealPoll:
    poll = MealPoll(household_id=household_id, recipe_id=recipe_id, proposed_by=proposed_by)
    session.add(poll)
    session.commit()
    session.refresh(poll)
    return poll


def cast_vote(poll_id: uuid.UUID, user_id: uuid.UUID, vote: str, session: Session) -> PollVote:
    existing = session.exec(
        select(PollVote).where(PollVote.poll_id == poll_id, PollVote.user_id == user_id)
    ).first()

    if existing:
        existing.vote = vote
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    poll_vote = PollVote(poll_id=poll_id, user_id=user_id, vote=vote)
    session.add(poll_vote)
    session.commit()
    session.refresh(poll_vote)
    return poll_vote


def get_poll_results(poll_id: uuid.UUID, session: Session) -> dict:
    votes = session.exec(select(PollVote).where(PollVote.poll_id == poll_id)).all()
    return {
        "yes_votes": [v.user_id for v in votes if v.vote == "yes"],
        "no_votes": [v.user_id for v in votes if v.vote == "no"],
        "total_votes": len(votes),
    }


def close_poll(poll_id: uuid.UUID, session: Session) -> MealPoll:
    poll = session.get(MealPoll, poll_id)
    if poll:
        poll.is_active = False
        session.add(poll)
        session.commit()
        session.refresh(poll)
    return poll
