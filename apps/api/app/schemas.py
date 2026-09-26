from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Register(Input):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    role: Literal["FOUNDER", "COFOUNDER"] = "FOUNDER"


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class EmailInput(Input):
    email: EmailStr


class TokenInput(Input):
    token: str = Field(min_length=20, max_length=200)


class ResetPassword(TokenInput):
    password: str = Field(min_length=12, max_length=128)


class ProfileData(Input):
    location: str = Field(default="", max_length=120)
    bio: str = Field(default="", max_length=2000)
    skills: str = Field(default="", max_length=500)
    experience: str = Field(default="", max_length=2000)
    linkedin: str = Field(default="", max_length=500)
    portfolio: str = Field(default="", max_length=500)
    education: str = Field(default="", max_length=1000)
    photo_url: str = Field(default="", max_length=500)
    public: bool = False

    @field_validator("linkedin", "portfolio", "photo_url")
    @classmethod
    def safe_url(cls, value):
        if value and not value.startswith("https://"):
            raise ValueError("Use an HTTPS URL")
        return value


class ProfilePatch(Input):
    name: str = Field(min_length=2, max_length=100)
    data: ProfileData


ANSWER_KEYS = {
    "problem",
    "audience",
    "frequency",
    "product",
    "value_proposition",
    "features",
    "target_customer",
    "geography",
    "market_size",
    "customer_segment",
    "users",
    "revenue",
    "mrr",
    "growth",
    "customers",
    "retention",
    "pricing",
    "revenue_model",
    "unit_economics",
    "competitors",
    "differentiation",
    "founders",
    "roles",
    "team_skills",
    "previous_funding",
    "funding_requirement",
    "use_of_funds",
    "pitch_deck",
    "business_plan",
    "demo",
    "other_documents",
}
REQUIRED_ANSWERS = [
    "problem",
    "audience",
    "frequency",
    "product",
    "value_proposition",
    "features",
    "target_customer",
    "geography",
    "market_size",
    "customer_segment",
    "users",
    "revenue",
    "mrr",
    "growth",
    "customers",
    "retention",
    "pricing",
    "revenue_model",
    "unit_economics",
    "competitors",
    "differentiation",
    "founders",
    "roles",
    "team_skills",
    "previous_funding",
    "funding_requirement",
    "use_of_funds",
]


class StartupInput(Input):
    name: str = Field(min_length=2, max_length=120)
    industry: str = Field(default="", max_length=80)
    stage: Literal["Idea", "Validation", "MVP", "Early traction", "Growth"] = "Idea"
    website: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=3000)
    public: bool = False
    answers: dict[str, str] = Field(default_factory=dict)

    @field_validator("website")
    @classmethod
    def safe_website(cls, v):
        if v and not v.startswith("https://"):
            raise ValueError("Use an HTTPS URL")
        return v

    @field_validator("answers")
    @classmethod
    def valid_answers(cls, v):
        if set(v) - ANSWER_KEYS:
            raise ValueError("Unknown application fields")
        if any(len(s) > 5000 for s in v.values()):
            raise ValueError("Answers must be 5,000 characters or fewer")
        for key in ("pitch_deck", "business_plan", "demo", "other_documents"):
            if v.get(key) and not v[key].startswith("https://"):
                raise ValueError("Document references must use HTTPS")
        return v


class StartupPatch(StartupInput):
    version: int = Field(ge=1)


class ApplicationCreate(Input):
    startup_id: str


class ReviewPatch(Input):
    version: int = Field(ge=1)
    status: (
        Literal[
            "SCREENING",
            "AI_REVIEW",
            "HUMAN_REVIEW",
            "INTERVIEW",
            "SHORTLISTED",
            "ACCEPTED",
            "WAITLISTED",
            "REJECTED",
        ]
        | None
    ) = None
    reviewer_id: str | None = None


class BodyInput(Input):
    body: str = Field(min_length=1, max_length=5000)


class InterviewInput(Input):
    scheduled_at: datetime
    location: str = Field(min_length=3, max_length=500)


class UserPatch(Input):
    role: (
        Literal[
            "FOUNDER",
            "COFOUNDER",
            "INVESTOR",
            "MENTOR",
            "REVIEWER",
            "ADMIN",
            "SUPER_ADMIN",
        ]
        | None
    ) = None
    suspended: bool | None = None


class CohortInput(Input):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=2000)


# Response allowlists prevent new database columns from leaking through API DTOs.
class UserOut(BaseModel):
    id: str
    email: str
    role: str
    verified: bool
    demo: bool
    name: str
    profile: dict


class AuthOut(UserOut):
    development_link: str | None = None


class PublicStartupOut(BaseModel):
    id: str
    name: str
    industry: str
    stage: str
    website: str
    description: str
    public: bool
    demo: bool
    created_at: datetime
    updated_at: datetime


class StartupOut(PublicStartupOut):
    owner_id: str
    answers: dict[str, str]
    version: int
    deleted_at: datetime | None


class ApplicationOut(BaseModel):
    id: str
    startup_id: str
    owner_id: str
    cycle: str
    status: str
    answers: dict
    reviewer_id: str | None
    submitted_at: datetime | None
    version: int
    created_at: datetime
    updated_at: datetime
    startup_name: str
    industry: str
    stage: str
    demo: bool
    missing_fields: list[str]
    next_states: list[str]
    history: list[dict] | None = None
    messages: list[dict] | None = None
    interviews: list[dict] | None = None
    notes: list[dict] | None = None
