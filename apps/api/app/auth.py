from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DB

from .db import AuthToken, Profile, Session, User, get_db, now
from .schemas import (
    AuthOut,
    EmailInput,
    Login,
    ProfilePatch,
    Register,
    ResetPassword,
    TokenInput,
    UserOut,
)
from .security import (
    COOKIE,
    DUMMY_HASH,
    audit,
    consume_token,
    current_user,
    digest,
    email_token,
    issue_session,
    passwords,
)

router = APIRouter()


def user_view(db, user):
    p = db.scalar(select(Profile).where(Profile.user_id == user.id))
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "verified": user.verified,
        "demo": user.demo,
        "name": p.name,
        "profile": p.data,
    }


@router.post(
    "/auth/register",
    status_code=201,
    response_model=AuthOut,
    response_model_exclude_none=True,
)
def register(body: Register, response: Response, db: DB = Depends(get_db, scope="function")):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            409, "Unable to create account. Try signing in or resetting your password."
        )
    user = User(email=email, password_hash=passwords.hash(body.password), role=body.role)
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "Unable to create account. Try signing in.") from None
    db.add(Profile(user_id=user.id, name=body.name))
    delivery = email_token(db, user, "verify")
    issue_session(db, user, response)
    audit(db, user, "auth.register", user.id)
    db.flush()
    return {**user_view(db, user), **delivery}


@router.post("/auth/login", response_model=UserOut)
def login(body: Login, response: Response, db: DB = Depends(get_db, scope="function")):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    valid = passwords.verify(body.password, user.password_hash if user else DUMMY_HASH)
    if not valid or not user or user.suspended or user.deleted_at:
        audit(db, None, "auth.login_failed")
        db.commit()
        raise HTTPException(401, "Invalid email or password")
    issue_session(db, user, response)
    audit(db, user, "auth.login", user.id)
    return user_view(db, user)


@router.get("/auth/me", response_model=UserOut)
@router.get("/users/me", response_model=UserOut)
def me(user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")):
    return user_view(db, user)


@router.patch("/users/me", response_model=UserOut)
def profile(
    body: ProfilePatch,
    user: User = Depends(current_user),
    db: DB = Depends(get_db, scope="function"),
):
    p = db.scalar(select(Profile).where(Profile.user_id == user.id))
    p.name, p.data = body.name, body.data.model_dump()
    audit(db, user, "profile.updated", user.id)
    return user_view(db, user)


@router.post("/auth/logout")
def logout(request: Request, response: Response, db: DB = Depends(get_db, scope="function")):
    db.execute(delete(Session).where(Session.token_hash == digest(request.cookies.get(COOKIE, ""))))
    response.delete_cookie(COOKIE, path="/")
    return {"message": "Signed out"}


@router.get("/auth/sessions")
def sessions(
    request: Request, user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")
):
    return [
        {
            "id": s.id,
            "created_at": s.created_at,
            "expires_at": s.expires_at,
            "current": s.id == request.state.session_id,
        }
        for s in db.scalars(
            select(Session).where(Session.user_id == user.id, Session.expires_at > now())
        )
    ]


@router.delete("/auth/sessions/{session_id}")
def revoke(
    session_id: str, user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")
):
    s = db.scalar(select(Session).where(Session.id == session_id, Session.user_id == user.id))
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    audit(db, user, "auth.session_revoked", s.id)
    return {"message": "Session revoked"}


@router.post("/auth/verify-email")
def verify(body: TokenInput, db: DB = Depends(get_db, scope="function")):
    user = consume_token(db, body.token, "verify")
    user.verified = True
    audit(db, user, "auth.email_verified", user.id)
    return {"message": "Email verified. You can now submit your application."}


@router.post("/auth/resend-verification")
def resend(user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")):
    return {
        "message": "Check your email for a verification link.",
        **(email_token(db, user, "verify") if not user.verified else {}),
    }


@router.post("/auth/forgot-password")
def forgot(body: EmailInput, db: DB = Depends(get_db, scope="function")):
    user = db.scalar(
        select(User).where(User.email == body.email.lower(), User.suspended.is_(False))
    )
    delivery = email_token(db, user, "reset") if user else {}
    return {
        "message": "If this email is registered, a reset link has been sent.",
        **delivery,
    }


@router.post("/auth/reset-password")
def reset(body: ResetPassword, db: DB = Depends(get_db, scope="function")):
    user = consume_token(db, body.token, "reset")
    user.password_hash = passwords.hash(body.password)
    db.execute(
        update(AuthToken)
        .where(
            AuthToken.user_id == user.id, AuthToken.purpose == "reset", AuthToken.used_at.is_(None)
        )
        .values(used_at=now())
    )
    db.execute(delete(Session).where(Session.user_id == user.id))
    audit(db, user, "auth.password_reset", user.id)
    return {"message": "Password updated. Sign in with your new password."}
