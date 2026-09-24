"""Branch-trigger classifier: categorizes objections into FIXABLE_TWEAK vs FIXED_REQUIREMENT."""

import re
from typing import Any, Dict, List

from backend.ai.llm.client import safe_llm_call
from backend.ai.llm.prompts import CLASSIFIER_SYSTEM_PROMPT

# Keywords that indicate non-negotiable hard physical, absolute constraints, or explicit refusal to compromise
FIXED_REQUIREMENT_PATTERNS = [
    # Physical and medical constraints
    r"\binjur(?:y|ed)\b",
    r"\bfractur(?:e|ed)\b",
    r"\bbroken\b",
    r"\bsprain(?:ed)?\b",
    r"\bwheelchair\b",
    r"\bcannot (?:walk|hike|climb|swim|run)\b",
    r"\bcan't (?:walk|hike|climb|swim|run)\b",
    r"\bsevere phobia\b",
    r"\bacrophobia\b",
    r"\baquaphobia\b",
    r"\bbooked flight\b",
    r"\bdoctor(?:'s)? orders?\b",
    r"\ballerg(?:y|ic) to\b",
    # Explicit refusal to compromise or insistence on separate activity
    r"\bno compromise\b",
    r"\bwon'?t compromise\b",
    r"\bwill not compromise\b",
    r"\brefuse to compromise\b",
    r"\bnot (?:ready|willing|going) to compromise\b",
    r"\bnot compromising\b",
    r"\b(?:don'?t|dont|do not) want to change (?:my|our) plan\b",
    r"\bnot changing (?:my|our) (?:plan|mind)\b",
    r"\bwon'?t change (?:my|our) (?:plan|mind)\b",
    r"\bwill not change (?:my|our) (?:plan|mind)\b",
    r"\b(?:split|separate) (?:up|groups?|ways?)\b",
    r"\bdo (?:my|our) own thing\b",
    r"\b(?:go|going) on (?:my|our) own\b",
    r"\b(?:i'?m|im|i will|ill|i'?ll) (?:go|going) to [a-z\s]+ (?:alone|anyway|regardless|no matter what|instead)\b",
    r"\b(?:i'?m|im) going to (?:gym|beach|spa|hotel|[a-z]+)\b",
]

# Keywords indicating vague/low-information soft sentiment
VAGUE_PATTERNS = [
    r"^not feeling it",
    r"^idk",
    r"^meh",
    r"^nah",
    r"^not sure",
    r"^something else",
    r"^maybe not",
    r"^don't like it",
    r"^dont like it",
]


def _heuristic_classify(comments_text: str) -> Dict[str, Any]:
    """Deterministic NLP classifier for fast/offline execution."""
    lower_text = comments_text.lower()

    # Rule 1: Check for genuine fixed non-negotiable constraints or refusal to compromise
    is_fixed = any(re.search(pat, lower_text) for pat in FIXED_REQUIREMENT_PATTERNS)
    if is_fixed:
        return {
            "classification": "FIXED_REQUIREMENT",
            "confidence": 0.95,
            "reasoning": "Detected explicit refusal to compromise, separate activity insistence, or non-negotiable physical constraint.",
        }

    # Rule 2: Check if all comments are vague/low-info -> FIXABLE_TWEAK with low confidence
    is_vague = any(re.search(pat, lower_text) for pat in VAGUE_PATTERNS)

    return {
        "classification": "FIXABLE_TWEAK",
        "confidence": 0.60 if is_vague else 0.85,
        "reasoning": "Preference or alternative activity request suitable for common ground compromise.",
    }


def classify_objection(
    no_comments: List[Dict[str, Any]],
    current_round: int = 1,
    soft_round_cap: int = 3,
) -> Dict[str, Any]:
    """
    Classifies a batch of NO objections.
    Returns: {"classification": "FIXABLE_TWEAK"|"FIXED_REQUIREMENT", "confidence": float, "reasoning": str}
    """
    if not no_comments:
        return {
            "classification": "FIXABLE_TWEAK",
            "confidence": 0.5,
            "reasoning": "No objections provided; defaulting to fixable tweak.",
        }

    comments_str = "\n".join(
        f"Round {c.get('round', current_round)}, Member {c.get('user_id', 'unknown')}: \"{c.get('comment', '')}\""
        for c in no_comments
    )
    user_message = f"Classify these objections for current round {current_round} (cap {soft_round_cap}):\n{comments_str}"

    heuristic_result = _heuristic_classify(comments_str)

    result = safe_llm_call(
        system_prompt=CLASSIFIER_SYSTEM_PROMPT,
        user_message=user_message,
        fallback_result=heuristic_result,
        fallback_fn=lambda _: _heuristic_classify(comments_str),
    )

    if not isinstance(result, dict) or result.get("classification") not in {"FIXABLE_TWEAK", "FIXED_REQUIREMENT"}:
        return heuristic_result

    return {
        "classification": str(result["classification"]),
        "confidence": float(result.get("confidence", heuristic_result["confidence"])),
        "reasoning": str(result.get("reasoning", heuristic_result["reasoning"])),
    }
