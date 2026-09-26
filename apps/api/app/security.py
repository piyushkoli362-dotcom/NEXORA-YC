import hashlib
import logging
import secrets
import smtplib
from datetime import timedelta
from email.message import EmailMessage

from fastapi import Depends, HTTPException, Request
from pwdlib import PasswordHash
from sqlalchemy import select, update
from sqlalchemy.orm import Session as DB

from .config import settings
from .db import AuditLog, AuthToken, Session, User, get_db, now

logger = logging.getLogger("nexora")
passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash(secrets.token_urlsafe(24))
COOKIE = "nexora_session"
ADMIN_ROLES = ("ADMIN", "SUPER_ADMIN")
REVIEW_ROLES = (*ADMIN_ROLES, "REVIEWER")
FOUNDER_ROLES = ("FOUNDER", "COFOUNDER")


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def audit(db, user, action, resource=None, details=None):
    db.add(
        AuditLog(
            actor_id=user.id if user else None,
            action=action,
            resource_id=resource,
            details=details or {},
        )
    )
    logger.info(action, extra={"actor_id": user.id if user else None, "resource_id": resource})


def current_user(request: Request, db: DB = Depends(get_db, scope="function")):
    raw = request.cookies.get(COOKIE, "")
    session = (
        db.scalar(
            select(Session).where(Session.token_hash == digest(raw), Session.expires_at > now())
        )
        if raw
        else None
    )
    user = db.get(User, session.user_id) if session else None
    if not user or user.suspended or user.deleted_at:
        raise HTTPException(401, "Please sign in to continue")
    request.state.session_id = session.id
    return user


def require(*roles):
    def check(user: User = Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(403, "Your role does not permit this action")
        return user

    return check


def issue_session(db, user, response):
    raw = secrets.token_urlsafe(48)
    db.add(
        Session(
            user_id=user.id,
            token_hash=digest(raw),
            expires_at=now() + timedelta(hours=12),
        )
    )
    response.set_cookie(
        COOKIE,
        raw,
        httponly=True,
        secure=settings().app_env == "production",
        samesite="lax",
        max_age=43200,
        path="/",
    )


def email_token(db, user, purpose):
    raw = secrets.token_urlsafe(40)
    db.add(
        AuthToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=digest(raw),
            expires_at=now() + timedelta(minutes=30),
        )
    )
    route = "verify-email" if purpose == "verify" else "reset-password"
    url = f"{settings().frontend_url}/{route}#token={raw}"
    if settings().smtp_host:
        msg = EmailMessage()
        msg["Subject"] = (
            "Verify your Nexora email" if purpose == "verify" else "Reset your Nexora password"
        )
        msg["From"] = settings().smtp_from
        msg["To"] = user.email
        msg.set_content(
            f"Use this single-use link within 30 minutes: {url}\nIf you did not request this, ignore this email."
        )
        try:
            with smtplib.SMTP(settings().smtp_host, settings().smtp_port, timeout=10) as smtp:
                smtp.starttls()
                if settings().smtp_username:
                    smtp.login(settings().smtp_username, settings().smtp_password)
                smtp.send_message(msg)
        except Exception:
            logger.error("email_delivery_failed")
            raise HTTPException(
                503, "Email delivery is temporarily unavailable. Please try again."
            ) from None
    return {"development_link": url} if settings().app_env == "development" else {}


def consume_token(db, raw, purpose):
    token = db.scalar(
        select(AuthToken).where(AuthToken.token_hash == digest(raw), AuthToken.purpose == purpose)
    )
    if not token or token.used_at or token.expires_at <= now():
        raise HTTPException(400, "This link is invalid or expired")
    result = db.execute(
        update(AuthToken)
        .where(
            AuthToken.id == token.id,
            AuthToken.used_at.is_(None),
            AuthToken.expires_at > now(),
        )
        .values(used_at=now())
    )
    if result.rowcount != 1:
        raise HTTPException(400, "This link has already been used")
    return db.get(User, token.user_id)
