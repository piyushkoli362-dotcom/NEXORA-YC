from fastapi import HTTPException
from sqlalchemy import select, update

from .db import (
    Application,
    Notification,
    Profile,
    Startup,
    StartupMember,
    StatusHistory,
    now,
)
from .schemas import REQUIRED_ANSWERS
from .security import ADMIN_ROLES, audit

TRANSITIONS = {
    "SUBMITTED": ["SCREENING", "REJECTED"],
    "SCREENING": ["AI_REVIEW", "HUMAN_REVIEW", "WAITLISTED", "REJECTED"],
    "AI_REVIEW": ["HUMAN_REVIEW", "WAITLISTED", "REJECTED"],
    "HUMAN_REVIEW": ["INTERVIEW", "SHORTLISTED", "WAITLISTED", "REJECTED"],
    "INTERVIEW": ["SHORTLISTED", "WAITLISTED", "REJECTED"],
    "SHORTLISTED": ["ACCEPTED", "WAITLISTED", "REJECTED"],
    "WAITLISTED": ["HUMAN_REVIEW", "REJECTED"],
    "ACCEPTED": [],
    "REJECTED": [],
    "DRAFT": ["SUBMITTED"],
}


def get_startup(db, id, user, write=False):
    s = db.get(Startup, id)
    member = db.scalar(
        select(StartupMember).where(
            StartupMember.startup_id == id, StartupMember.user_id == user.id
        )
    )
    if not s or s.deleted_at or (s.owner_id != user.id if write else not member):
        raise HTTPException(404, "Startup not found")
    return s


def get_application(db, id, user):
    a = db.get(Application, id)
    if not a or not (
        a.owner_id == user.id
        or user.role in ADMIN_ROLES
        or (user.role == "REVIEWER" and a.reviewer_id == user.id)
    ):
        raise HTTPException(404, "Application not found")
    return a


def missing_fields(db, startup):
    p = db.scalar(select(Profile).where(Profile.user_id == startup.owner_id))
    missing = [key for key in REQUIRED_ANSWERS if not startup.answers.get(key, "").strip()]
    for key in ["industry", "description"]:
        if not getattr(startup, key).strip():
            missing.append(key)
    for key in ["location", "bio", "skills", "experience"]:
        if not p.data.get(key, "").strip():
            missing.append("founder_" + key)
    return missing


def notify(db, user_id, title, body):
    db.add(Notification(user_id=user_id, title=title, body=body))


def transition(db, a, user, status, version, snapshot=None):
    if status not in TRANSITIONS[a.status]:
        raise HTTPException(409, f"Cannot change {a.status} to {status}")
    previous = a.status
    values = {"status": status, "version": version + 1, "updated_at": now()}
    if snapshot is not None:
        values.update(answers=snapshot, submitted_at=now())
    result = db.execute(
        update(Application)
        .where(
            Application.id == a.id,
            Application.version == version,
            Application.status == previous,
        )
        .values(**values)
    )
    if result.rowcount != 1:
        raise HTTPException(409, "Application changed. Refresh and try again.")
    db.add(
        StatusHistory(
            application_id=a.id,
            actor_id=user.id,
            from_status=previous,
            to_status=status,
        )
    )
    notify(
        db,
        a.owner_id,
        "Application status updated",
        f"Your application is now {status.replace('_', ' ').lower()}.",
    )
    audit(db, user, "application.status_changed", a.id, {"from": previous, "to": status})
    db.flush()
    db.refresh(a)
