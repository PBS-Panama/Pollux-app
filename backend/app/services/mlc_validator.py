"""
MLC 2006 Compliance Validator
Maritime Labour Convention — isolated rule engine.
All compliance logic lives here. Never mix with routers.
"""
from fastapi import HTTPException, status


MIN_REST_HOURS_PER_DAY = 10
MIN_REST_HOURS_PER_WEEK = 77
MAX_WORK_HOURS_PER_DAY = 14
MAX_WORK_HOURS_PER_WEEK = 72


def validate_rest_hours(rest_hours_in_24h: float, rest_hours_in_week: float = None):
    """
    MLC 2006 Regulation 2.3 — Hours of Work and Rest
    Raises HTTP 409 if the action would violate minimum rest requirements.
    """
    if rest_hours_in_24h < MIN_REST_HOURS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "MLC_2006_REST_VIOLATION",
                "message": (
                    f"MLC 2006 violation: Seafarer must have at least "
                    f"{MIN_REST_HOURS_PER_DAY}h rest in any 24-hour period. "
                    f"Proposed schedule allows only {rest_hours_in_24h}h."
                ),
                "regulation": "MLC 2006 Regulation 2.3",
            },
        )

    if rest_hours_in_week is not None and rest_hours_in_week < MIN_REST_HOURS_PER_WEEK:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "MLC_2006_WEEKLY_REST_VIOLATION",
                "message": (
                    f"MLC 2006 violation: Seafarer must have at least "
                    f"{MIN_REST_HOURS_PER_WEEK}h rest per week. "
                    f"Proposed schedule allows only {rest_hours_in_week}h."
                ),
                "regulation": "MLC 2006 Regulation 2.3",
            },
        )

    return True


def validate_work_hours(work_hours_in_24h: float, work_hours_in_week: float = None):
    """Validate maximum work hours — complement to rest validation."""
    if work_hours_in_24h > MAX_WORK_HOURS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "MLC_2006_WORK_HOURS_VIOLATION",
                "message": f"MLC 2006 violation: Max work hours per day is {MAX_WORK_HOURS_PER_DAY}h.",
                "regulation": "MLC 2006 Regulation 2.3",
            },
        )
    if work_hours_in_week is not None and work_hours_in_week > MAX_WORK_HOURS_PER_WEEK:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "MLC_2006_WEEKLY_WORK_VIOLATION",
                "message": f"MLC 2006 violation: Max work hours per week is {MAX_WORK_HOURS_PER_WEEK}h.",
                "regulation": "MLC 2006 Regulation 2.3",
            },
        )
    return True
