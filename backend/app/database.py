from sqlmodel import SQLModel, Session, create_engine

from app.config import settings

engine = create_engine(
    settings.database_url,
    echo=settings.log_level == "DEBUG",
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
