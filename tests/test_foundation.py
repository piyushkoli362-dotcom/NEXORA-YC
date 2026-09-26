import importlib.util
import sys
from pathlib import Path

import pytest
from app.config import Settings
from app.db import StartupMember, User
from app.security import passwords
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError


def test_database_rejects_invalid_role_and_foreign_membership(db):
    with pytest.raises(IntegrityError), db.begin_nested():
        db.add(
            User(
                email="invalid@example.com",
                password_hash=passwords.hash("Invalid role test 893"),
                role="ROOT",
            )
        )
        db.flush()
    with pytest.raises(IntegrityError), db.begin_nested():
        db.add(
            StartupMember(
                startup_id="00000000-0000-0000-0000-000000000001",
                user_id="00000000-0000-0000-0000-000000000002",
            )
        )
        db.flush()


def test_production_rejects_insecure_configuration():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            app_env="production",
            database_url="sqlite://",
            redis_url="",
            smtp_host="",
        )
    config = Settings(
        _env_file=None,
        app_env="production",
        database_url="postgresql+psycopg://user:placeholder@db/nexora",
        redis_url="redis://redis:6379",
        smtp_host="smtp.example.com",
        frontend_url="https://nexora.example.com",
        allowed_origins=["https://nexora.example.com"],
    )
    assert config.app_env == "production"


def test_agent_registry_and_disabled_provider():
    path = Path(__file__).resolve().parents[1] / "packages/ai/registry.py"
    spec = importlib.util.spec_from_file_location("nexora_agent_contract", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    assert len(module.REGISTRY) == 12
    assert all(a.context_policy == "authorized-startup-only" for a in module.REGISTRY.values())
    assert all(
        "accept_application" not in a.tools and "execute_shell" not in a.tools
        for a in module.REGISTRY.values()
    )
    with pytest.raises(module.ConfigurationRequired):
        module.get_provider()
