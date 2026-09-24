"""Hard constraint pre-validator for AI-generated plans."""

from decimal import Decimal
from typing import Any, Dict, List

VALID_ENTITY_TYPES = {
    "hotel", "room_type", "rate_plan", "flight", "flight_fare",
    "poi", "package", "package_component", "guide", "transfer",
    "event", "xr_scene"
}


def validate_plan(
    blended_plan: Dict[str, Any],
    itinerary_item: Dict[str, Any],
    trip_context: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Validates a blended plan against business rules and data constraints.
    Returns: {"valid": bool, "violations": List[str]}
    """
    violations: List[str] = []

    # 1. Validate entity_type enum
    entity_type = blended_plan.get("entity_type")
    if entity_type not in VALID_ENTITY_TYPES:
        violations.append(f"Invalid entity_type: '{entity_type}'. Must be one of: {sorted(VALID_ENTITY_TYPES)}")

    # 2. Validate entity_id presence
    entity_id = blended_plan.get("entity_id")
    if not entity_id or not str(entity_id).strip():
        violations.append("entity_id is missing or empty")

    # 3. Validate cost_delta decimal parseability
    cost_delta = blended_plan.get("cost_delta")
    if cost_delta is None:
        violations.append("cost_delta is missing")
    else:
        try:
            Decimal(str(cost_delta))
        except Exception:
            violations.append(f"cost_delta '{cost_delta}' is not a valid decimal number")

    # 4. Validate non-empty title and rationale (NOT description)
    title = str(blended_plan.get("title", "")).strip()
    if not title:
        violations.append("title is required and cannot be empty")

    rationale = str(blended_plan.get("rationale", "")).strip()
    if not rationale:
        violations.append("rationale is required and cannot be empty")

    return {
        "valid": len(violations) == 0,
        "violations": violations,
    }
