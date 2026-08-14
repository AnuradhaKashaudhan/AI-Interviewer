"""
routers/coding_profile.py
FastAPI router for Multi-Platform Coding Profiles (GitHub, LeetCode, GeeksforGeeks, CodeChef).
"""

from datetime import datetime, timezone, timedelta
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, CodingProfile
from auth import get_current_user
from services.coding_profile_service import sync_platform_profile

router = APIRouter(prefix="/api/coding-profile", tags=["Coding Profile"])

CACHE_TTL_HOURS = 24  # Auto-refresh if last_synced is older than this
ALLOWED_PLATFORMS = {"github", "leetcode", "geeksforgeeks", "codechef"}


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class LinkProfileRequest(BaseModel):
    username: str


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _serialize_profile(profile: CodingProfile) -> dict:
    """Convert ORM object to a JSON-serialisable dict."""
    last_synced_str = None
    if profile.last_synced:
        if profile.last_synced.tzinfo is None:
            last_synced_aware = profile.last_synced.replace(tzinfo=timezone.utc)
        else:
            last_synced_aware = profile.last_synced
        last_synced_str = last_synced_aware.isoformat()

    return {
        "id": profile.id,
        "platform": profile.platform,
        "username": profile.username,
        "profile_score": profile.profile_score,
        "raw_stats": profile.raw_stats,
        "last_synced": last_synced_str,
        "is_verified": profile.is_verified,
    }


def _is_stale(profile: CodingProfile) -> bool:
    """Return True if the profile is older than CACHE_TTL_HOURS."""
    if not profile.last_synced:
        return True
    if profile.last_synced.tzinfo is None:
        last_synced = profile.last_synced.replace(tzinfo=timezone.utc)
    else:
        last_synced = profile.last_synced
    return (datetime.now(timezone.utc) - last_synced) > timedelta(hours=CACHE_TTL_HOURS)


# ---------------------------------------------------------------------------
# Parameterised Endpoints
# ---------------------------------------------------------------------------

@router.get("/all")
async def get_all_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all linked coding profiles for the user."""
    profiles = (
        db.query(CodingProfile)
        .filter(CodingProfile.user_id == current_user.id)
        .all()
    )
    result = {p.platform: _serialize_profile(p) for p in profiles}
    return {"profiles": result}


@router.post("/{platform}/link")
async def link_platform_profile(
    platform: str,
    body: LinkProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plat = platform.lower().strip()
    if plat not in ALLOWED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{plat}'. Supported: {list(ALLOWED_PLATFORMS)}")

    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty.")

    try:
        profile = await sync_platform_profile(db, current_user.id, plat, username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(exc)}")

    return {"message": f"{plat.capitalize()} profile linked successfully.", "profile": _serialize_profile(profile)}


@router.get("/{platform}")
async def get_platform_profile(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plat = platform.lower().strip()
    if plat not in ALLOWED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{plat}'.")

    profile = (
        db.query(CodingProfile)
        .filter(
            CodingProfile.user_id == current_user.id,
            CodingProfile.platform == plat,
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"No {plat.capitalize()} profile linked.",
        )

    if _is_stale(profile):
        try:
            profile = await sync_platform_profile(db, current_user.id, plat, profile.username)
        except Exception:
            pass

    return {"profile": _serialize_profile(profile)}


@router.post("/{platform}/refresh")
async def refresh_platform_profile(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plat = platform.lower().strip()
    if plat not in ALLOWED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{plat}'.")

    profile = (
        db.query(CodingProfile)
        .filter(
            CodingProfile.user_id == current_user.id,
            CodingProfile.platform == plat,
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"No {plat.capitalize()} profile linked.",
        )

    try:
        profile = await sync_platform_profile(db, current_user.id, plat, profile.username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(exc)}")

    return {"message": f"{plat.capitalize()} profile refreshed successfully.", "profile": _serialize_profile(profile)}
