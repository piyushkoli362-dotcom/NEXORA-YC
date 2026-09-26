import os

from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, text

from .db import AuditLog, Profile, SessionLocal, User
from .security import passwords


class Bootstrap(BaseModel):
    email: EmailStr
    password: str = Field(min_length=16, max_length=128)
    name: str = Field(min_length=2, max_length=100)


def main():
    values = Bootstrap(
        email=os.environ["BOOTSTRAP_ADMIN_EMAIL"],
        password=os.environ["BOOTSTRAP_ADMIN_PASSWORD"],
        name=os.environ.get("BOOTSTRAP_ADMIN_NAME", "Nexora Administrator"),
    )
    with SessionLocal.begin() as db:
        if db.bind.dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(7290142)"))
        if db.scalar(select(User).where(User.role == "SUPER_ADMIN")):
            raise RuntimeError(
                "A super administrator already exists. Use the authorized administration workflow."
            )
        if db.scalar(select(User).where(User.email == str(values.email).lower())):
            raise RuntimeError(
                "This email belongs to an existing account. No privileges were changed."
            )
        user = User(
            email=str(values.email).lower(),
            password_hash=passwords.hash(values.password),
            role="SUPER_ADMIN",
            verified=True,
        )
        db.add(user)
        db.flush()
        db.add(Profile(user_id=user.id, name=values.name))
        db.add(AuditLog(actor_id=user.id, action="admin.bootstrap", resource_id=user.id))
    print("Initial administrator created. Remove bootstrap secrets from the environment now.")


if __name__ == "__main__":
    main()
