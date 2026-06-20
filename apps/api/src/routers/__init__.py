"""Routers package — exports all domain APIRouter instances."""
from apps.api.src.routers import (
    app_settings,
    applications,
    ats,
    cover_letter,
    documents,
    evidence,
    interview,
    jd,
    orchestration,
    resume,
)

__all__ = [
    "applications",
    "app_settings",
    "ats",
    "cover_letter",
    "documents",
    "evidence",
    "interview",
    "jd",
    "orchestration",
    "resume",
]
