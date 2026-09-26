from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    event,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import settings


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


ROLES = (
    "FOUNDER",
    "COFOUNDER",
    "INVESTOR",
    "MENTOR",
    "REVIEWER",
    "ADMIN",
    "SUPER_ADMIN",
)
STATES = (
    "DRAFT",
    "SUBMITTED",
    "SCREENING",
    "AI_REVIEW",
    "HUMAN_REVIEW",
    "INTERVIEW",
    "SHORTLISTED",
    "ACCEPTED",
    "WAITLISTED",
    "REJECTED",
)


class User(Record, Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN " + str(ROLES), name="valid_role"),)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(24), default="FOUNDER")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)


class Profile(Record, Base):
    __tablename__ = "profiles"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class Session(Record, Base):
    __tablename__ = "sessions"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class AuthToken(Record, Base):
    __tablename__ = "auth_tokens"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    purpose: Mapped[str] = mapped_column(String(20))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime)


class Startup(Record, Base):
    __tablename__ = "startups"
    __table_args__ = (
        Index(
            "startups_public_search",
            text("to_tsvector('english', name || ' ' || industry || ' ' || description)"),
            postgresql_using="gin",
            postgresql_where=text("public = true AND deleted_at IS NULL"),
        ).ddl_if(dialect="postgresql"),
    )
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    industry: Mapped[str] = mapped_column(String(80), default="")
    stage: Mapped[str] = mapped_column(String(40), default="Idea")
    website: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    public: Mapped[bool] = mapped_column(Boolean, default=False)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)


class StartupMember(Record, Base):
    __tablename__ = "startup_members"
    __table_args__ = (UniqueConstraint("startup_id", "user_id"),)
    startup_id: Mapped[str] = mapped_column(
        ForeignKey("startups.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)


class Application(Record, Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("startup_id", "cycle"),
        CheckConstraint("status IN " + str(STATES), name="valid_status"),
    )
    startup_id: Mapped[str] = mapped_column(ForeignKey("startups.id"), index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    cycle: Mapped[str] = mapped_column(String(40), default="Open applications")
    status: Mapped[str] = mapped_column(String(24), default="DRAFT", index=True)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    version: Mapped[int] = mapped_column(Integer, default=1)


class StatusHistory(Record, Base):
    __tablename__ = "application_status_history"
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    from_status: Mapped[str] = mapped_column(String(24))
    to_status: Mapped[str] = mapped_column(String(24))


class ReviewerNote(Record, Base):
    __tablename__ = "reviewer_notes"
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)


class ApplicationMessage(Record, Base):
    __tablename__ = "application_messages"
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(20))
    body: Mapped[str] = mapped_column(Text)


class Interview(Record, Base):
    __tablename__ = "interviews"
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    location: Mapped[str] = mapped_column(String(500))


class Notification(Record, Base):
    __tablename__ = "notifications"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(Text)
    read_at: Mapped[datetime | None] = mapped_column(DateTime)


class AuditLog(Record, Base):
    __tablename__ = "audit_logs"
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(100))
    resource_id: Mapped[str | None] = mapped_column(String(36))
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class Cohort(Record, Base):
    __tablename__ = "cohorts"
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")


class CohortMember(Record, Base):
    __tablename__ = "cohort_members"
    __table_args__ = (UniqueConstraint("cohort_id", "startup_id"),)
    cohort_id: Mapped[str] = mapped_column(ForeignKey("cohorts.id"), index=True)
    startup_id: Mapped[str] = mapped_column(ForeignKey("startups.id"), index=True)


class Challenge(Record, Base):
    __tablename__ = "challenges"
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    industry: Mapped[str] = mapped_column(String(80))
    deadline: Mapped[datetime] = mapped_column(DateTime)
    prize: Mapped[str] = mapped_column(String(100))
    demo: Mapped[bool] = mapped_column(Boolean, default=True)


url = settings().database_url
engine = create_engine(
    url,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
)
if url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
