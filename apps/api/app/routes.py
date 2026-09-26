from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session as DB

from .auth import user_view
from .db import (
    Application,
    ApplicationMessage,
    AuditLog,
    Challenge,
    Cohort,
    CohortMember,
    Interview,
    Notification,
    Profile,
    ReviewerNote,
    Startup,
    StartupMember,
    StatusHistory,
    User,
    get_db,
    now,
)
from .db import (
    Session as AuthSession,
)
from .domain import (
    TRANSITIONS,
    get_application,
    get_startup,
    missing_fields,
    notify,
    transition,
)
from .schemas import (
    ApplicationCreate,
    ApplicationOut,
    BodyInput,
    CohortInput,
    InterviewInput,
    PublicStartupOut,
    ReviewPatch,
    StartupInput,
    StartupOut,
    StartupPatch,
    UserPatch,
)
from .security import (
    ADMIN_ROLES,
    FOUNDER_ROLES,
    REVIEW_ROLES,
    audit,
    current_user,
    require,
)

router = APIRouter()


def record(row, exclude=()):
    return {c.name: getattr(row, c.name) for c in row.__table__.columns if c.name not in exclude}


def startup_view(s):
    return record(s)


def application_view(db, a, user, detail=False):
    s = db.get(Startup, a.startup_id)
    result = record(a)
    result["startup_name"] = s.name
    result["industry"] = s.industry
    result["stage"] = s.stage
    result["demo"] = s.demo
    result["missing_fields"] = missing_fields(db, s) if a.status == "DRAFT" else []
    result["next_states"] = (
        [s for s in TRANSITIONS[a.status] if s != "AI_REVIEW"] if user.role in ADMIN_ROLES else []
    )
    if detail:
        result["history"] = [
            record(x)
            for x in db.scalars(
                select(StatusHistory)
                .where(StatusHistory.application_id == a.id)
                .order_by(StatusHistory.created_at)
            )
        ]
        result["messages"] = [
            record(x)
            for x in db.scalars(
                select(ApplicationMessage)
                .where(ApplicationMessage.application_id == a.id)
                .order_by(ApplicationMessage.created_at)
            )
        ]
        result["interviews"] = [
            record(x)
            for x in db.scalars(
                select(Interview)
                .where(Interview.application_id == a.id)
                .order_by(Interview.scheduled_at)
            )
        ]
        if user.role in REVIEW_ROLES:
            result["notes"] = [
                record(x)
                for x in db.scalars(
                    select(ReviewerNote)
                    .where(ReviewerNote.application_id == a.id)
                    .order_by(ReviewerNote.created_at)
                )
            ]
    return result


@router.get("/startups/public", response_model=list[PublicStartupOut])
def public_startups(q: str = Query("", max_length=100), db: DB = Depends(get_db, scope="function")):
    query = select(Startup).where(Startup.public.is_(True), Startup.deleted_at.is_(None))
    if q.strip():
        if db.bind.dialect.name == "postgresql":
            query = query.where(
                func.to_tsvector(
                    "english",
                    Startup.name + " " + Startup.industry + " " + Startup.description,
                ).op("@@")(func.plainto_tsquery("english", q))
            )
        else:
            term = "%" + q.replace("%", "\\%").replace("_", "\\_") + "%"
            query = query.where(
                or_(
                    Startup.name.ilike(term, escape="\\"),
                    Startup.industry.ilike(term, escape="\\"),
                    Startup.description.ilike(term, escape="\\"),
                )
            )
    return [
        record(s, ("owner_id", "answers", "version", "deleted_at"))
        for s in db.scalars(query.order_by(Startup.created_at.desc()).limit(100))
    ]


@router.get("/founders/public")
def public_founders(db: DB = Depends(get_db, scope="function")):
    rows = db.execute(
        select(Profile, User)
        .join(User, User.id == Profile.user_id)
        .where(
            User.role.in_(FOUNDER_ROLES),
            User.suspended.is_(False),
            User.deleted_at.is_(None),
        )
        .limit(100)
    ).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "bio": p.data.get("bio", ""),
            "location": p.data.get("location", ""),
            "skills": p.data.get("skills", ""),
            "demo": u.demo,
        }
        for p, u in rows
        if p.data.get("public")
    ]


@router.get("/startups", response_model=list[StartupOut])
def startups(user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")):
    return [
        startup_view(s)
        for s in db.scalars(
            select(Startup)
            .join(StartupMember)
            .where(StartupMember.user_id == user.id, Startup.deleted_at.is_(None))
            .order_by(Startup.created_at)
        )
    ]


@router.post("/startups", status_code=201, response_model=StartupOut)
def create_startup(
    body: StartupInput,
    user: User = Depends(require(*FOUNDER_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    s = Startup(owner_id=user.id, **body.model_dump())
    db.add(s)
    db.flush()
    db.add(StartupMember(startup_id=s.id, user_id=user.id))
    audit(db, user, "startup.created", s.id)
    return startup_view(s)


@router.get("/startups/{id}", response_model=StartupOut)
def startup(
    id: str, user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")
):
    return startup_view(get_startup(db, id, user))


@router.patch("/startups/{id}", response_model=StartupOut)
def patch_startup(
    id: str,
    body: StartupPatch,
    user: User = Depends(require(*FOUNDER_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    s = get_startup(db, id, user, write=True)
    result = db.execute(
        update(Startup)
        .where(Startup.id == id, Startup.version == body.version)
        .values(
            **body.model_dump(exclude={"version"}),
            version=body.version + 1,
            updated_at=now(),
        )
    )
    if result.rowcount != 1:
        raise HTTPException(409, "This startup was edited elsewhere. Refresh before saving.")
    db.refresh(s)
    audit(db, user, "startup.updated", id)
    return startup_view(s)


@router.get(
    "/applications",
    response_model=list[ApplicationOut],
    response_model_exclude_unset=True,
)
def applications(
    user: User = Depends(current_user),
    db: DB = Depends(get_db, scope="function"),
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = select(Application)
    if user.role == "REVIEWER":
        query = query.where(Application.reviewer_id == user.id)
    elif user.role not in ADMIN_ROLES:
        query = query.where(Application.owner_id == user.id)
    return [
        application_view(db, a, user)
        for a in db.scalars(
            query.order_by(Application.created_at.desc()).offset(offset).limit(limit)
        )
    ]


@router.post(
    "/applications",
    status_code=201,
    response_model=ApplicationOut,
    response_model_exclude_unset=True,
)
def create_application(
    body: ApplicationCreate,
    user: User = Depends(require(*FOUNDER_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    s = get_startup(db, body.startup_id, user, write=True)
    existing = db.scalar(
        select(Application).where(
            Application.startup_id == s.id, Application.cycle == "Open applications"
        )
    )
    if existing:
        return application_view(db, existing, user, True)
    a = Application(startup_id=s.id, owner_id=user.id)
    db.add(a)
    db.flush()
    audit(db, user, "application.created", a.id)
    return application_view(db, a, user, True)


@router.get(
    "/applications/{id}",
    response_model=ApplicationOut,
    response_model_exclude_unset=True,
)
def application(
    id: str, user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")
):
    return application_view(db, get_application(db, id, user), user, True)


@router.post(
    "/applications/{id}/submit",
    response_model=ApplicationOut,
    response_model_exclude_unset=True,
)
def submit(
    id: str,
    user: User = Depends(require(*FOUNDER_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    a = get_application(db, id, user)
    if a.owner_id != user.id:
        raise HTTPException(404, "Application not found")
    if not user.verified:
        raise HTTPException(403, "Verify your email before submitting")
    if a.status != "DRAFT":
        raise HTTPException(409, "This application has already been submitted")
    s = get_startup(db, a.startup_id, user, write=True)
    missing = missing_fields(db, s)
    if missing:
        raise HTTPException(
            422,
            {
                "message": "Complete the required fields before submitting",
                "fields": missing,
            },
        )
    p = db.scalar(select(Profile).where(Profile.user_id == user.id))
    snapshot = {
        "startup": record(s, ("owner_id", "deleted_at")),
        "founder": {"name": p.name, "data": p.data},
    }
    transition(db, a, user, "SUBMITTED", a.version, jsonable_encoder(snapshot))
    return application_view(db, a, user, True)


@router.post("/applications/{id}/messages", status_code=201)
def message(
    id: str,
    body: BodyInput,
    user: User = Depends(current_user),
    db: DB = Depends(get_db, scope="function"),
):
    a = get_application(db, id, user)
    m = ApplicationMessage(
        application_id=id,
        author_id=user.id,
        kind="reply" if a.owner_id == user.id else "request",
        body=body.body,
    )
    db.add(m)
    if a.owner_id != user.id:
        notify(db, a.owner_id, "Information requested", body.body)
    elif a.reviewer_id:
        notify(
            db,
            a.reviewer_id,
            "Founder replied",
            f"A founder replied to application {id}.",
        )
    audit(db, user, "application.message", id)
    db.flush()
    return record(m)


@router.patch(
    "/admin/applications/{id}",
    response_model=ApplicationOut,
    response_model_exclude_unset=True,
)
def review(
    id: str,
    body: ReviewPatch,
    user: User = Depends(require(*ADMIN_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    a = get_application(db, id, user)
    if a.version != body.version:
        raise HTTPException(409, "Application changed. Refresh and try again.")
    if body.reviewer_id is not None:
        reviewer = db.get(User, body.reviewer_id)
        if not reviewer or reviewer.role != "REVIEWER" or reviewer.suspended:
            raise HTTPException(422, "Choose an active reviewer")
        a.reviewer_id = reviewer.id
        audit(db, user, "application.reviewer_assigned", id, {"reviewer_id": reviewer.id})
    if body.status == "AI_REVIEW":
        raise HTTPException(409, "AI review is not configured. Continue with human review.")
    if body.status:
        transition(db, a, user, body.status, body.version)
    else:
        result = db.execute(
            update(Application)
            .where(Application.id == id, Application.version == body.version)
            .values(version=body.version + 1)
        )
        if result.rowcount != 1:
            raise HTTPException(409, "Application changed. Refresh and try again.")
    db.flush()
    db.refresh(a)
    return application_view(db, a, user, True)


@router.post("/admin/applications/{id}/notes", status_code=201)
def note(
    id: str,
    body: BodyInput,
    user: User = Depends(require(*REVIEW_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    get_application(db, id, user)
    n = ReviewerNote(application_id=id, author_id=user.id, body=body.body)
    db.add(n)
    audit(db, user, "application.private_note_added", id)
    db.flush()
    return record(n)


@router.post("/admin/applications/{id}/interviews", status_code=201)
def interview(
    id: str,
    body: InterviewInput,
    user: User = Depends(require(*ADMIN_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    a = get_application(db, id, user)
    if body.scheduled_at.tzinfo is None:
        raise HTTPException(422, "Interview time must include a timezone")
    at = body.scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
    if at <= now():
        raise HTTPException(422, "Choose a future interview time")
    i = Interview(application_id=id, scheduled_at=at, location=body.location)
    db.add(i)
    notify(db, a.owner_id, "Interview scheduled", f"{at.isoformat()} UTC — {body.location}")
    audit(db, user, "application.interview_scheduled", id)
    db.flush()
    return record(i)


@router.get("/admin/users")
def users(user: User = Depends(require(*ADMIN_ROLES)), db: DB = Depends(get_db, scope="function")):
    return [
        {**user_view(db, u), "suspended": u.suspended}
        for u in db.scalars(select(User).order_by(User.created_at.desc()).limit(100))
    ]


@router.patch("/admin/users/{id}")
def patch_user(
    id: str,
    body: UserPatch,
    user: User = Depends(require(*ADMIN_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    target = db.get(User, id)
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == user.id:
        raise HTTPException(403, "Self-modification of administrative privileges is not allowed")
    if body.role is not None and user.role != "SUPER_ADMIN":
        raise HTTPException(403, "Only a super administrator can assign roles")
    if target.role in ADMIN_ROLES and user.role != "SUPER_ADMIN":
        raise HTTPException(403, "Only a super administrator can manage administrators")
    if target.role == "SUPER_ADMIN":
        active = list(
            db.scalars(
                select(User)
                .where(User.role == "SUPER_ADMIN", User.suspended.is_(False))
                .with_for_update()
            )
        )
        if len(active) <= 1 and (body.suspended or (body.role and body.role != "SUPER_ADMIN")):
            raise HTTPException(409, "At least one active super administrator is required")
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(target, key, value)
    db.execute(delete(AuthSession).where(AuthSession.user_id == id))
    audit(db, user, "user.permissions_changed", id, body.model_dump(exclude_none=True))
    return {**user_view(db, target), "suspended": target.suspended}


@router.get("/admin/audit")
def audit_list(
    user: User = Depends(require(*ADMIN_ROLES)), db: DB = Depends(get_db, scope="function")
):
    return [
        record(x)
        for x in db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))
    ]


@router.get("/cohorts")
def cohorts(
    user: User = Depends(require(*ADMIN_ROLES)), db: DB = Depends(get_db, scope="function")
):
    return [
        {
            **record(x),
            "members": [
                m.startup_id
                for m in db.scalars(select(CohortMember).where(CohortMember.cohort_id == x.id))
            ],
        }
        for x in db.scalars(select(Cohort).order_by(Cohort.created_at.desc()).limit(100))
    ]


@router.post("/cohorts", status_code=201)
def create_cohort(
    body: CohortInput,
    user: User = Depends(require(*ADMIN_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    if db.scalar(select(Cohort).where(Cohort.name == body.name)):
        raise HTTPException(409, "A cohort with this name already exists")
    c = Cohort(**body.model_dump())
    db.add(c)
    db.flush()
    audit(db, user, "cohort.created", c.id)
    return record(c)


@router.post("/cohorts/{id}/members", status_code=201)
def add_cohort_member(
    id: str,
    body: ApplicationCreate,
    user: User = Depends(require(*ADMIN_ROLES)),
    db: DB = Depends(get_db, scope="function"),
):
    if not db.get(Cohort, id) or not db.get(Startup, body.startup_id):
        raise HTTPException(404, "Cohort or startup not found")
    accepted = db.scalar(
        select(Application).where(
            Application.startup_id == body.startup_id, Application.status == "ACCEPTED"
        )
    )
    if not accepted:
        raise HTTPException(422, "Only accepted startups can join a cohort")
    existing = db.scalar(
        select(CohortMember).where(
            CohortMember.cohort_id == id, CohortMember.startup_id == body.startup_id
        )
    )
    if not existing:
        db.add(CohortMember(cohort_id=id, startup_id=body.startup_id))
        audit(db, user, "cohort.member_added", id, {"startup_id": body.startup_id})
    return {"message": "Startup added to cohort"}


@router.get("/notifications")
def notifications(user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")):
    return [
        record(n)
        for n in db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(100)
        )
    ]


@router.post("/notifications/{id}/read")
def read_notification(
    id: str, user: User = Depends(current_user), db: DB = Depends(get_db, scope="function")
):
    n = db.scalar(
        select(Notification).where(Notification.id == id, Notification.user_id == user.id)
    )
    if not n:
        raise HTTPException(404, "Notification not found")
    n.read_at = now()
    return {"message": "Marked as read"}


@router.get("/challenges")
def challenges(db: DB = Depends(get_db, scope="function")):
    return [
        record(c) for c in db.scalars(select(Challenge).order_by(Challenge.deadline).limit(100))
    ]


@router.get("/ai/status")
def ai_status(user: User = Depends(current_user)):
    return {
        "available": False,
        "phase": 2,
        "message": "AI evaluation and Copilot launch in Phase 2. No AI analysis has been performed.",
    }
