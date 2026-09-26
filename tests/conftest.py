import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["APP_ENV"] = "test"
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api"))
from app.db import Base, get_db
from app.main import app, limits


@pytest.fixture
def db():
    url = os.environ.get("TEST_DATABASE_URL", "sqlite://")
    engine = (
        create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
        if url == "sqlite://"
        else create_engine(url)
    )
    if url == "sqlite://":

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with sessionmaker(engine, expire_on_commit=False)() as s:
        yield s
        s.rollback()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(db):
    def override():
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise

    app.dependency_overrides[get_db] = override
    limits.clear()
    with TestClient(app, headers={"Origin": "http://localhost:3000", "X-Nexora-Request": "1"}) as c:
        yield c
    app.dependency_overrides.clear()
