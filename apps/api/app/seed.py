"""Deterministic, explicitly development-only seed. Passwords come from environment."""

import os
from datetime import timedelta

from sqlalchemy import select

from .config import settings
from .db import (
    Application,
    AuditLog,
    Challenge,
    Cohort,
    Profile,
    SessionLocal,
    Startup,
    StartupMember,
    StatusHistory,
    User,
    now,
)
from .schemas import REQUIRED_ANSWERS
from .security import passwords

NAMES = [
    "Aarav Mehta",
    "Maya Chen",
    "Sofia Reyes",
    "Daniel Okafor",
    "Priya Nair",
    "Oliver Brooks",
    "Leila Hassan",
    "Ethan Park",
    "Ananya Rao",
    "Lucas Silva",
]
STARTUPS = [
    (
        "Terraloop",
        "Climate tech",
        "MVP",
        "Helping small manufacturers measure and reduce material waste.",
    ),
    (
        "CareThread",
        "Health tech",
        "Validation",
        "Connecting care teams and families around recovery at home.",
    ),
    (
        "Ledgerleaf",
        "Fintech",
        "Early traction",
        "A clearer cash-flow workspace for independent businesses.",
    ),
    (
        "Fieldwise",
        "Agritech",
        "MVP",
        "Practical crop insights for smallholder farming cooperatives.",
    ),
    (
        "Forma Labs",
        "Developer tools",
        "Idea",
        "Turning product requirements into clearer engineering workflows.",
    ),
]


def seed():
    if settings().app_env != "development":
        raise RuntimeError("Seed data is allowed only in development")
    admin_email = os.environ.get("SEED_ADMIN_EMAIL")
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD")
    founder_password = os.environ.get("SEED_FOUNDER_PASSWORD")
    if (
        not admin_email
        or not admin_password
        or not founder_password
        or min(len(admin_password), len(founder_password)) < 12
    ):
        raise RuntimeError(
            "Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_FOUNDER_PASSWORD (12+ characters)"
        )
    with SessionLocal.begin() as db:
        if db.scalar(select(User).where(User.demo.is_(True))):
            print("Demo records already exist; no changes made.")
            return

        def person(email, name, role, password):
            u = User(
                email=email,
                password_hash=passwords.hash(password),
                role=role,
                verified=True,
                demo=True,
            )
            db.add(u)
            db.flush()
            db.add(
                Profile(
                    user_id=u.id,
                    name=name,
                    data={
                        "location": "Bengaluru, India",
                        "bio": "Demo founder exploring a practical solution to a meaningful problem.",
                        "skills": "Product, research, engineering",
                        "experience": "Five years building products with small teams.",
                        "public": role in ("FOUNDER", "COFOUNDER"),
                    },
                )
            )
            return u

        admin = person(admin_email, "Nexora Demo Admin", "SUPER_ADMIN", admin_password)
        reviewer = person(
            "reviewer@demo.nexora.example.com",
            "Jordan Ellis",
            "REVIEWER",
            founder_password,
        )
        founders = [
            person(
                f"founder{i + 1}@demo.nexora.example.com",
                name,
                "FOUNDER",
                founder_password,
            )
            for i, name in enumerate(NAMES)
        ]
        for role, people in [
            ("INVESTOR", ["Alex Morgan", "Riya Kapoor", "Sam Rivera"]),
            ("MENTOR", ["Emma Wilson", "Kabir Shah", "Grace Kim"]),
        ]:
            for i, name in enumerate(people):
                person(
                    f"{role.lower()}{i + 1}@demo.nexora.example.com",
                    name,
                    role,
                    founder_password,
                )
        states = [
            "SUBMITTED",
            "SCREENING",
            "HUMAN_REVIEW",
            "INTERVIEW",
            "SHORTLISTED",
            "ACCEPTED",
            "WAITLISTED",
            "REJECTED",
        ]
        for i, (name, industry, stage, description) in enumerate(STARTUPS):
            answers = {
                key: "Demo assumption: to be validated through customer interviews."
                for key in REQUIRED_ANSWERS
            }
            answers.update(
                problem=description,
                users="120 pilot users (demo)",
                revenue="USD 0; pre-revenue (demo)",
                mrr="USD 0 (demo)",
                growth="15% month over month; demo estimate",
                retention="Not measured yet",
                founders=NAMES[i],
                funding_requirement="USD 250,000 (demo)",
                previous_funding="Bootstrapped",
                geography="India",
                pricing="USD 49 per month hypothesis",
                customers="3 design partners (demo)",
            )
            s = Startup(
                owner_id=founders[i].id,
                name=name,
                industry=industry,
                stage=stage,
                description=description,
                public=True,
                demo=True,
                answers=answers,
            )
            db.add(s)
            db.flush()
            db.add(StartupMember(startup_id=s.id, user_id=founders[i].id))
            for cycle in range(4):
                state = states[(i + cycle) % len(states)]
                a = Application(
                    startup_id=s.id,
                    owner_id=founders[i].id,
                    cycle="Open applications" if cycle == 0 else f"Demo historical cycle {cycle}",
                    status=state,
                    reviewer_id=reviewer.id,
                    submitted_at=now() - timedelta(days=7 + cycle),
                    answers={
                        "startup": {
                            "name": name,
                            "description": description,
                            "answers": answers,
                        },
                        "founder": {
                            "name": NAMES[i],
                            "data": {"bio": "Demonstration founder profile"},
                        },
                    },
                )
                db.add(a)
                db.flush()
                db.add(
                    StatusHistory(
                        application_id=a.id,
                        actor_id=admin.id,
                        from_status="DRAFT",
                        to_status=state,
                    )
                )
        for i, (title, industry) in enumerate(
            [
                ("Rethink the circular supply chain", "Climate tech"),
                ("Make primary care more accessible", "Health tech"),
                ("Financial clarity for small businesses", "Fintech"),
                ("Grow more with less water", "Agritech"),
                ("Remove friction from public services", "Govtech"),
            ]
        ):
            db.add(
                Challenge(
                    title=title,
                    industry=industry,
                    description="Demonstration brief: build a practical, measurable solution with a clear customer and validation plan.",
                    deadline=now() + timedelta(days=30 + i * 7),
                    prize="Example program support; no active prize",
                    demo=True,
                )
            )
        db.add(
            Cohort(
                name="Demo / Autumn Builders",
                description="Illustrative cohort for local development.",
            )
        )
        db.add(
            AuditLog(
                actor_id=admin.id,
                action="development.seed",
                details={
                    "founders": 10,
                    "startups": 5,
                    "applications": 20,
                    "investors": 3,
                    "mentors": 3,
                    "challenges": 5,
                },
            )
        )
    print(
        "Seeded 10 founders, 5 startups, 20 applications, 3 investors, 3 mentors, 5 challenges and development review accounts."
    )


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()
    seed()
