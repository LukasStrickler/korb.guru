"""
Seed Zürich-area stores into the database.
Run: python -m app.seed_stores
"""
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.store import Store

ZURICH_STORES = [
    # Migros
    {"name": "Migros City Zürich", "brand": "migros", "latitude": 47.3744, "longitude": 8.5389, "address": "Löwenstrasse 35, 8001 Zürich"},
    {"name": "Migros Stadelhofen", "brand": "migros", "latitude": 47.3667, "longitude": 8.5486, "address": "Stadelhoferstrasse 10, 8001 Zürich"},
    {"name": "Migros Limmatplatz", "brand": "migros", "latitude": 47.3842, "longitude": 8.5319, "address": "Limmatstrasse 152, 8005 Zürich"},
    {"name": "Migros Oerlikon", "brand": "migros", "latitude": 47.4111, "longitude": 8.5444, "address": "Marktplatz Oerlikon, 8050 Zürich"},
    {"name": "Migros Altstetten", "brand": "migros", "latitude": 47.3911, "longitude": 8.4886, "address": "Badenerstrasse 571, 8048 Zürich"},
    # Coop
    {"name": "Coop City Zürich", "brand": "coop", "latitude": 47.3726, "longitude": 8.5387, "address": "Bahnhofstrasse 57, 8001 Zürich"},
    {"name": "Coop Bellevue", "brand": "coop", "latitude": 47.3664, "longitude": 8.5454, "address": "Theaterstrasse 12, 8001 Zürich"},
    {"name": "Coop Wipkingen", "brand": "coop", "latitude": 47.3936, "longitude": 8.5228, "address": "Röschibachstrasse 20, 8037 Zürich"},
    {"name": "Coop Oerlikon", "brand": "coop", "latitude": 47.4103, "longitude": 8.5450, "address": "Franklinstrasse 20, 8050 Zürich"},
    {"name": "Coop Wiedikon", "brand": "coop", "latitude": 47.3647, "longitude": 8.5208, "address": "Birmensdorferstrasse 320, 8055 Zürich"},
    # Aldi
    {"name": "Aldi Suisse Zürich Sihlcity", "brand": "aldi", "latitude": 47.3561, "longitude": 8.5261, "address": "Kalanderplatz 1, 8045 Zürich"},
    {"name": "Aldi Suisse Zürich Oerlikon", "brand": "aldi", "latitude": 47.4125, "longitude": 8.5483, "address": "Thurgauerstrasse 34, 8050 Zürich"},
    {"name": "Aldi Suisse Zürich Altstetten", "brand": "aldi", "latitude": 47.3903, "longitude": 8.4839, "address": "Hohlstrasse 560, 8048 Zürich"},
    {"name": "Aldi Suisse Affoltern", "brand": "aldi", "latitude": 47.4217, "longitude": 8.5125, "address": "Wehntalerstrasse 540, 8046 Zürich"},
    # Lidl
    {"name": "Lidl Zürich HB", "brand": "lidl", "latitude": 47.3782, "longitude": 8.5392, "address": "Europaallee 36, 8004 Zürich"},
    {"name": "Lidl Zürich Altstetten", "brand": "lidl", "latitude": 47.3889, "longitude": 8.4869, "address": "Badenerstrasse 549, 8048 Zürich"},
    {"name": "Lidl Zürich Oerlikon", "brand": "lidl", "latitude": 47.4097, "longitude": 8.5467, "address": "Schaffhauserstrasse 355, 8050 Zürich"},
    {"name": "Lidl Schlieren", "brand": "lidl", "latitude": 47.3967, "longitude": 8.4500, "address": "Engstringerstrasse 2, 8952 Schlieren"},
    # Denner
    {"name": "Denner Zürich Langstrasse", "brand": "denner", "latitude": 47.3778, "longitude": 8.5278, "address": "Langstrasse 120, 8004 Zürich"},
    {"name": "Denner Zürich Wiedikon", "brand": "denner", "latitude": 47.3650, "longitude": 8.5192, "address": "Birmensdorferstrasse 290, 8055 Zürich"},
    {"name": "Denner Zürich Wipkingen", "brand": "denner", "latitude": 47.3950, "longitude": 8.5208, "address": "Hönggerstrasse 40, 8037 Zürich"},
    {"name": "Denner Zürich Schwamendingen", "brand": "denner", "latitude": 47.4069, "longitude": 8.5681, "address": "Winterthurerstrasse 531, 8051 Zürich"},
    {"name": "Denner Zürich Seebach", "brand": "denner", "latitude": 47.4222, "longitude": 8.5444, "address": "Schaffhauserstrasse 550, 8052 Zürich"},
]


def seed_stores():
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(Store)).all()
        if existing:
            print(f"Stores already seeded ({len(existing)} stores). Skipping.")
            return

        for store_data in ZURICH_STORES:
            store = Store(**store_data)
            session.add(store)

        session.commit()
        print(f"Seeded {len(ZURICH_STORES)} Zürich-area stores.")


if __name__ == "__main__":
    seed_stores()
