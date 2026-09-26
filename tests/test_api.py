from datetime import timedelta

from app.db import (
    AuthToken,
    Session,
    Startup,
    User,
    now,
)
from app.schemas import REQUIRED_ANSWERS
from app.security import digest
from sqlalchemy import select

PASSWORD = "A secure test passphrase 739!"


def register(client, email="founder@example.com"):
    r = client.post(
        "/api/v1/auth/register",
        json={"name": "Test Founder", "email": email, "password": PASSWORD},
    )
    assert r.status_code == 201, r.text
    return r.json()


def user_role(db, id, role, verified=True):
    u = db.get(User, id)
    u.role = role
    u.verified = verified
    db.commit()


def login(client, email):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text


def complete(client, db):
    u = register(client)
    user_role(db, u["id"], "FOUNDER")
    client.patch(
        "/api/v1/users/me",
        json={
            "name": "Test Founder",
            "data": {
                "location": "Mumbai",
                "bio": "Building a better product",
                "skills": "Product",
                "experience": "5 years",
            },
        },
    )
    payload = {
        "name": "Test Startup",
        "industry": "SaaS",
        "description": "Help small teams work well",
        "answers": {k: "Evidence to validate" for k in REQUIRED_ANSWERS},
    }
    s = client.post("/api/v1/startups", json=payload).json()
    a = client.post("/api/v1/applications", json={"startup_id": s["id"]}).json()
    return u, s, a


def test_registration_session_logout(client, db):
    u = register(client)
    assert client.get("/api/v1/auth/me").json()["role"] == "FOUNDER"
    assert db.get(User, u["id"]).password_hash != PASSWORD
    assert len(list(db.scalars(select(Session)))) == 1
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_cannot_register_admin_or_inject_profile_role(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Bad Actor",
            "email": "bad@example.com",
            "password": PASSWORD,
            "role": "SUPER_ADMIN",
        },
    )
    assert r.status_code == 422
    register(client)
    assert (
        client.patch(
            "/api/v1/users/me", json={"name": "Bad Actor", "data": {}, "role": "ADMIN"}
        ).status_code
        == 422
    )


def test_csrf_rejected(client):
    assert (
        client.post("/api/v1/auth/logout", headers={"Origin": "https://evil.example"}).status_code
        == 403
    )
    assert client.post("/api/v1/auth/logout", headers={"X-Nexora-Request": ""}).status_code == 403


def test_verification_single_use(client, db):
    u = register(client)
    raw = "a-single-use-verification-token-12345"
    db.add(
        AuthToken(
            user_id=u["id"],
            token_hash=digest(raw),
            purpose="verify",
            expires_at=now() + timedelta(minutes=5),
        )
    )
    db.commit()
    assert client.post("/api/v1/auth/verify-email", json={"token": raw}).status_code == 200
    assert client.get("/api/v1/auth/me").json()["verified"] is True
    assert client.post("/api/v1/auth/verify-email", json={"token": raw}).status_code == 400


def test_reset_revokes_sessions_and_wrong_purpose(client, db):
    u = register(client)
    raw = "a-reset-password-secret-token-12345"
    db.add(
        AuthToken(
            user_id=u["id"],
            token_hash=digest(raw),
            purpose="reset",
            expires_at=now() + timedelta(minutes=5),
        )
    )
    db.commit()
    assert client.post("/api/v1/auth/verify-email", json={"token": raw}).status_code == 400
    assert (
        client.post(
            "/api/v1/auth/reset-password",
            json={"token": raw, "password": "A brand new passphrase 123!"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": u["email"], "password": PASSWORD}
        ).status_code
        == 401
    )


def test_draft_completeness_and_verification(client, db):
    u = register(client)
    s = client.post("/api/v1/startups", json={"name": "Draft Company"}).json()
    a = client.post("/api/v1/applications", json={"startup_id": s["id"]}).json()
    assert a["missing_fields"]
    assert client.post(f"/api/v1/applications/{a['id']}/submit").status_code == 403
    user_role(db, u["id"], "FOUNDER")
    assert client.post(f"/api/v1/applications/{a['id']}/submit").status_code == 422
    assert client.post("/api/v1/applications", json={"startup_id": s["id"]}).json()["id"] == a["id"]


def test_submission_snapshot_and_version_conflict(client, db):
    u, s, a = complete(client, db)
    submitted = client.post(f"/api/v1/applications/{a['id']}/submit")
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "SUBMITTED"
    assert len(submitted.json()["history"]) == 1
    assert client.post(f"/api/v1/applications/{a['id']}/submit").status_code == 409
    change = {
        "name": "Changed Company",
        "industry": "SaaS",
        "description": "Changed later",
        "answers": {},
        "version": s["version"],
    }
    assert client.patch(f"/api/v1/startups/{s['id']}", json=change).status_code == 200
    assert client.patch(f"/api/v1/startups/{s['id']}", json=change).status_code == 409
    snap = client.get(f"/api/v1/applications/{a['id']}").json()
    assert snap["answers"]["startup"]["name"] == "Test Startup"


def test_cross_tenant_access_and_public_redaction(client, db):
    u, s, a = complete(client, db)
    st = db.get(Startup, s["id"])
    st.public = True
    db.commit()
    register(client, "other@example.com")
    assert client.get(f"/api/v1/startups/{s['id']}").status_code == 404
    assert client.get(f"/api/v1/applications/{a['id']}").status_code == 404
    assert (
        client.post(
            f"/api/v1/applications/{a['id']}/messages", json={"body": "Intrusion"}
        ).status_code
        == 404
    )
    assert client.post("/api/v1/applications", json={"startup_id": s["id"]}).status_code == 404
    pub = client.get("/api/v1/startups/public").json()[0]
    assert "answers" not in pub and "owner_id" not in pub


def test_investor_cannot_read_private_or_create_startup(client, db):
    u, s, a = complete(client, db)
    investor = register(client, "investor@example.com")
    user_role(db, investor["id"], "INVESTOR")
    assert client.get(f"/api/v1/applications/{a['id']}").status_code == 404
    assert client.get(f"/api/v1/startups/{s['id']}").status_code == 404
    assert client.post("/api/v1/startups", json={"name": "Unauthorized"}).status_code == 403
    assert client.get("/api/v1/admin/users").status_code == 403


def test_review_assignment_notes_decisions_and_history(client, db):
    founder, s, a = complete(client, db)
    client.post(f"/api/v1/applications/{a['id']}/submit")
    reviewer = register(client, "reviewer@example.com")
    user_role(db, reviewer["id"], "REVIEWER")
    assert client.get(f"/api/v1/applications/{a['id']}").status_code == 404
    admin = register(client, "admin@example.com")
    user_role(db, admin["id"], "ADMIN")
    r = client.patch(
        f"/api/v1/admin/applications/{a['id']}",
        json={"version": 2, "status": "SCREENING", "reviewer_id": reviewer["id"]},
    )
    assert r.status_code == 200, r.text
    assert (
        client.patch(
            f"/api/v1/admin/applications/{a['id']}",
            json={"version": 3, "status": "ACCEPTED"},
        ).status_code
        == 409
    )
    login(client, reviewer["email"])
    assert len(client.get("/api/v1/applications").json()) == 1
    assert (
        client.post(
            f"/api/v1/admin/applications/{a['id']}/notes",
            json={"body": "Confidential reviewer reasoning"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/api/v1/applications/{a['id']}/messages",
            json={"body": "Please clarify retention."},
        ).status_code
        == 201
    )
    assert (
        client.patch(
            f"/api/v1/admin/applications/{a['id']}",
            json={"version": 3, "status": "HUMAN_REVIEW"},
        ).status_code
        == 403
    )
    login(client, founder["email"])
    view = client.get(f"/api/v1/applications/{a['id']}").json()
    assert "notes" not in view
    assert "Confidential" not in str(view)
    assert view["messages"][0]["body"] == "Please clarify retention."
    assert len(view["history"]) == 2


def test_admin_privilege_escalation_and_suspension(client, db):
    target = register(client, "target@example.com")
    admin = register(client, "admin@example.com")
    user_role(db, admin["id"], "ADMIN")
    assert (
        client.patch(f"/api/v1/admin/users/{target['id']}", json={"role": "ADMIN"}).status_code
        == 403
    )
    assert (
        client.patch(f"/api/v1/admin/users/{admin['id']}", json={"role": "SUPER_ADMIN"}).status_code
        == 403
    )
    assert (
        client.patch(f"/api/v1/admin/users/{target['id']}", json={"suspended": True}).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": target["email"], "password": PASSWORD}
        ).status_code
        == 401
    )


def test_ai_is_honestly_unavailable(client):
    register(client)
    status = client.get("/api/v1/ai/status").json()
    assert status["available"] is False
    assert "No AI analysis" in status["message"]


def test_rate_limit(client):
    for _ in range(20):
        assert (
            client.post(
                "/api/v1/auth/forgot-password", json={"email": "nobody@example.com"}
            ).status_code
            == 200
        )
    assert (
        client.post(
            "/api/v1/auth/forgot-password", json={"email": "nobody@example.com"}
        ).status_code
        == 429
    )


def test_expired_session_and_token(client, db):
    u = register(client)
    token = "expired-secret-token-for-test-1234"
    db.add(
        AuthToken(
            user_id=u["id"],
            token_hash=digest(token),
            purpose="verify",
            expires_at=now() - timedelta(seconds=1),
        )
    )
    for s in db.scalars(select(Session)):
        s.expires_at = now() - timedelta(seconds=1)
    db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/auth/verify-email", json={"token": token}).status_code == 400


def test_notification_isolation_and_mark_read(client, db):
    owner, s, a = complete(client, db)
    assert client.post(f"/api/v1/applications/{a['id']}/submit").status_code == 200
    n = client.get("/api/v1/notifications").json()[0]
    assert client.post(f"/api/v1/notifications/{n['id']}/read").status_code == 200
    register(client, "outsider@example.com")
    assert client.get("/api/v1/notifications").json() == []
    assert client.post(f"/api/v1/notifications/{n['id']}/read").status_code == 404


def test_session_cookie_flags_and_cross_user_revocation(client, db):
    result = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Cookie Test",
            "email": "cookie@example.com",
            "password": PASSWORD,
        },
    )
    cookie = result.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie and "max-age=43200" in cookie
    session = client.get("/api/v1/auth/sessions").json()[0]
    register(client, "second@example.com")
    assert client.delete(f"/api/v1/auth/sessions/{session['id']}").status_code == 404


def test_cohort_acceptance_and_membership_idempotency(client, db):
    founder, s, a = complete(client, db)
    client.post(f"/api/v1/applications/{a['id']}/submit")
    admin = register(client, "admin@example.com")
    user_role(db, admin["id"], "ADMIN")
    c = client.post(
        "/api/v1/cohorts", json={"name": "Builders 2026", "description": "New founders"}
    ).json()
    assert (
        client.post(f"/api/v1/cohorts/{c['id']}/members", json={"startup_id": s["id"]}).status_code
        == 422
    )
    version = 2
    for status in ["SCREENING", "HUMAN_REVIEW", "INTERVIEW", "SHORTLISTED", "ACCEPTED"]:
        r = client.patch(
            f"/api/v1/admin/applications/{a['id']}",
            json={"version": version, "status": status},
        )
        assert r.status_code == 200, r.text
        version += 1
    for _ in range(2):
        assert (
            client.post(
                f"/api/v1/cohorts/{c['id']}/members", json={"startup_id": s["id"]}
            ).status_code
            == 201
        )
    assert client.get("/api/v1/cohorts").json()[0]["members"] == [s["id"]]
    assert client.post("/api/v1/cohorts", json={"name": "Builders 2026"}).status_code == 409


def test_interview_validation_and_founder_visibility(client, db):
    founder, s, a = complete(client, db)
    admin = register(client, "admin@example.com")
    user_role(db, admin["id"], "ADMIN")
    path = f"/api/v1/admin/applications/{a['id']}/interviews"
    assert (
        client.post(
            path, json={"scheduled_at": now().isoformat(), "location": "A meeting"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            path,
            json={
                "scheduled_at": (now() - timedelta(days=1)).isoformat() + "Z",
                "location": "A meeting",
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            path,
            json={
                "scheduled_at": (now() + timedelta(days=2)).isoformat() + "Z",
                "location": "https://example.com/meeting",
            },
        ).status_code
        == 201
    )
    login(client, founder["email"])
    assert (
        client.get(f"/api/v1/applications/{a['id']}").json()["interviews"][0]["location"]
        == "https://example.com/meeting"
    )


def test_public_search_never_returns_private_startups(client, db):
    u, s, a = complete(client, db)
    assert client.get("/api/v1/startups/public?q=Test").json() == []
    st = db.get(Startup, s["id"])
    st.public = True
    db.commit()
    found = client.get("/api/v1/startups/public?q=Test")
    assert found.status_code == 200, found.text
    assert len(found.json()) == 1
    assert client.get("/api/v1/startups/public?q=unfindable").json() == []


def test_unassigned_reviewer_cannot_write_notes(client, db):
    u, s, a = complete(client, db)
    reviewer = register(client, "reviewer@example.com")
    user_role(db, reviewer["id"], "REVIEWER")
    assert (
        client.post(
            f"/api/v1/admin/applications/{a['id']}/notes", json={"body": "Not allowed"}
        ).status_code
        == 404
    )
    assert client.get("/api/v1/applications").json() == []


def test_mentor_has_no_unassigned_private_access(client, db):
    u, s, a = complete(client, db)
    mentor = register(client, "mentor@example.com")
    user_role(db, mentor["id"], "MENTOR")
    assert client.get(f"/api/v1/startups/{s['id']}").status_code == 404
    assert client.get(f"/api/v1/applications/{a['id']}").status_code == 404
    assert client.get("/api/v1/admin/users").status_code == 403


def test_request_body_limit_and_unknown_fields(client):
    assert client.post("/api/v1/auth/register", content="x" * 262145).status_code == 413
    register(client)
    assert (
        client.post(
            "/api/v1/startups", json={"name": "My Company", "owner_id": "someone-else"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/startups",
            json={"name": "My Company", "answers": {"untrusted_key": "value"}},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/startups",
            json={"name": "My Company", "website": "javascript:alert(1)"},
        ).status_code
        == 422
    )
