# SHARVANI.md — AI / Consensus Engine Track Owner
## WanderMatch · KogniVera Hackathon 2026 · PS-11

---

## HOW TO USE THIS DOC (Read this first, give it to your agent verbatim)

> "I am Sharvani G Bhaskar, AI/Consensus Engine developer for WanderMatch at KogniVera Hackathon 2026. Read this entire document carefully. It contains my full project context, every AI module I must build, the exact database fields I read as input, the exact output contracts my functions must return to Panchami's backend, the LLM setup (Ollama + Phi-4-mini + ngrok), and my phase-by-phase execution plan. After reading, give me a detailed prompt to execute Phase [X] of my work. Do not assume anything not written here. Do not invent field names or function signatures. Everything is specified."

---

## 1. WHAT WANDERMATCH IS — FULL CONTEXT

WanderMatch is a social group travel planning app. Groups plan trips together on a shared live itinerary. Members propose activities, vote YES or NO (NO votes REQUIRE a typed reason/suggestion), and my AI layer reads those typed reasons to generate compromise plans or — when preferences are truly incompatible — parallel branches.

### My specific role in the system:
I am the AI brain. My code runs in `/backend/ai/`. Panchami's FastAPI backend calls my functions. I do NOT handle HTTP endpoints, WebSocket, or database writes directly — I receive data from Panchami, run AI logic, and return structured results. Panchami handles all DB writes and API responses.

### The two trip modes I must handle:
- **Mode A (Admin-Led)**: Admin has final say. My AI RECOMMENDS — it never makes binding decisions. Admin can accept, reject, extend, or force-branch at any time.
- **Mode NA (Collaborative)**: Fully automatic. After ~3 rounds unresolved, I auto-branch without asking anyone.

### The consensus flow I implement:
```
NO votes arrive with typed comments
        ↓
branch_trigger_classifier.py
  → Is this a FIXABLE TWEAK or a FIXED INCOMPATIBLE REQUIREMENT?
        ↓ fixable tweak             ↓ fixed requirement
blended_plan_generator.py      branch_grouping.py
  → ONE blended plan               → N parallel branches
        ↓
hard_constraint_validator.py
  → Does this plan violate time/location/transport constraints?
  → If yes: regenerate once
  → If fails again: escalate to branching
```

---

## 2. TECH STACK — WHAT I USE

- **Language**: Python 3.11+
- **LLM runtime**: Ollama (local, serving Phi-4-mini and Qwen2.5-Coder)
- **LLM access from backend**: OpenAI-compatible client pointed at ngrok tunnel URL
- **Primary model**: Phi-4-mini (for blended_plan_generator + branch_trigger_classifier — needs judgment + rationale text)
- **Secondary model**: Qwen2.5-Coder (optional — for JSON structure validation/repair if needed)
- **LLM call library**: `openai` Python package (`pip install openai`)
- **Math only (no LLM)**: group_compatibility_scorer.py, guide_compatibility_scorer.py — these are PURE DETERMINISTIC MATH, no LLM calls whatsoever

I DO NOT:
- Write to the database directly
- Handle HTTP requests or responses
- Own any FastAPI routes
- Own any WebSocket logic

I OWN ONLY:
- `/backend/ai/` directory — all files inside it

---

## 3. DIRECTORY STRUCTURE — WHAT I OWN

```
backend/
  ai/
    core/
      blended_plan_generator.py     ← Generates ONE compromise plan from NO comments
      branch_trigger_classifier.py  ← Classifies NO comments as fixable vs incompatible
      branch_grouping.py            ← Clusters holdouts into N parallel branches
      hard_constraint_validator.py  ← Validates generated plan against hard constraints
    modes/
      mode_a_orchestrator.py        ← Admin-Led control flow
      mode_na_orchestrator.py       ← Collaborative automatic control flow
    scorers/
      group_compatibility_scorer.py ← Deterministic solo-to-group matching (NO LLM)
      guide_compatibility_scorer.py ← Deterministic solo-to-guide matching (NO LLM)
    llm/
      client.py                     ← Ollama/OpenAI client setup + timeout handling
      prompts.py                    ← Prompt templates (system prompts for each AI task)
    tests/
      test_blended_plan.py
      test_branch_classifier.py
      test_branch_grouping.py
      test_scorers.py
```

---

## 4. NAMING CONTRACT — READ BEFORE WRITING ANY CODE

### 4.1 Database field names I READ (snake_case — these come from Panchami's DB)
```python
# From proposals table:
proposal_id          # prp_ prefixed
itinerary_id         # itn_ prefixed
proposed_by_user_id  # usr_ prefixed
title                # proposal title
rationale            # NOT description — this field is called rationale
cost_delta           # NOT estimated_cost — always Decimal, never float
currency             # ISO-4217 string
closes_at            # nullable timestamp
status               # open|accepted|rejected|expired
current_round        # integer

# From votes table (what I read as input):
vote_id              # vot_ prefixed
proposal_id          # prp_ prefixed
user_id              # usr_ prefixed
value                # 'yes' or 'no' ONLY — I never see 'abstain'
comment              # the typed NO reason — this is my PRIMARY INPUT
cast_at              # timestamp

# From itinerary_items table:
item_id              # itm_ prefixed
day_index            # 1-based integer
sort_order           # integer
starts_at            # nullable timestamp with offset
ends_at              # nullable timestamp with offset
item_type            # hotel|flight|poi|package|guide|transfer|meal|free
entity_type          # from enums.json entity_type list
entity_id            # canonical ID of referenced supply row
title                # activity title
cost                 # Decimal, NEVER float, NEVER called estimated_cost
currency             # ISO-4217
slot_status          # 'EMPTY'|'IN_CONSENSUS'|'BRANCHED'|'CONFIRMED'

# From users + user_preferences (for scorers):
user_id              # usr_ prefixed
display_name         # string
age_group            # '18-24'|'25-34'|'35-44'|'45-54'|'55+'
preferred_languages  # comma-separated BCP-47 e.g. "en,hi,ta"
interests            # comma-separated category codes e.g. "heritage,food,trekking"

# From tour_guides (for guide scorer):
guide_id             # gid_ prefixed
languages            # comma-separated BCP-47
specialisation       # heritage|food|trekking|wildlife|photography|religious|shopping|accessibility
secondary_specialisation  # same enum, nullable
day_rate             # Decimal, NEVER float
currency             # ISO-4217
rating               # Decimal(2,1), nullable
```

### 4.2 Output I return to Panchami (Python dicts — she handles DB writes and API serialization)

Every function I write returns a Python dict. I never return a Pydantic model, never touch the DB, never write HTTP responses.

```python
# blended_plan_generator returns:
{
    "action": "BLENDED",
    "blended_plan": {
        "title": str,
        "rationale": str,        # NOT description
        "entity_type": str,      # must be valid from enums.json
        "entity_id": str,        # must look like a real ID
        "cost_delta": str,       # money as string e.g. "0.00"
        "currency": str,         # ISO-4217
    },
    "current_round": int,
    "constraint_validation": "PASSED" | "REGENERATED_ONCE" | "FAILED",
}

# branch_grouping returns:
{
    "action": "BRANCHED",
    "branches": [
        {
            "title": str,
            "rationale": str,
            "entity_type": str | None,
            "entity_id": str | None,
            "cost_delta": str,      # money as string
            "currency": str,
            "member_user_ids": [str],  # usr_ prefixed IDs
            "auto_finalized": bool,    # True if single-member branch
        }
    ]
}

# branch_trigger_classifier returns:
{
    "classification": "FIXABLE_TWEAK" | "FIXED_REQUIREMENT",
    "confidence": float,  # 0.0 to 1.0
    "reasoning": str,     # brief explanation (not shown to users, for debugging)
}

# hard_constraint_validator returns:
{
    "valid": bool,
    "violations": [str],   # list of violated constraint descriptions (empty if valid)
}

# group_compatibility_scorer returns:
[
    {
        "trip_id": str,           # trp_ prefixed
        "compatibility_score": int,   # INTEGER 0-100, NEVER float
        "age_group_match": bool,
        "shared_languages": [str],    # BCP-47 tags
        "shared_interests": [str],
        "date_overlap_days": int,
    }
]

# guide_compatibility_scorer returns:
[
    {
        "guide_id": str,          # gid_ prefixed
        "compatibility_score": int,   # INTEGER 0-100, NEVER float
        "shared_languages": [str],
        "shared_specialisations": [str],
    }
]
```

### 4.3 Money: ALWAYS Decimal in Python, string when I put it in my output dict
```python
from decimal import Decimal

# When I receive cost_delta from Panchami:
cost_delta = Decimal("15.00")  # Panchami sends it as Decimal or string

# When I return it in my output:
"cost_delta": f"{Decimal('0.00'):.2f}"  # always 2 decimal places as string
```

### 4.4 Enums: exact values I must use (from enums.json)
```python
# entity_type legal values (what I can put in blended plan):
ENTITY_TYPES = [
    "hotel", "room_type", "rate_plan", "flight", "flight_fare",
    "poi", "package", "package_component", "guide", "transfer",
    "event", "xr_scene"
]
# For most activity blends: "poi" is the most common

# guide specialisation values:
GUIDE_SPECIALISATIONS = [
    "heritage", "food", "trekking", "wildlife", "photography",
    "religious", "shopping", "accessibility"
]
```

---

## 5. LLM SETUP — OLLAMA + PHI-4-MINI + NGROK

### 5.1 How the LLM path works
```
Render (cloud FastAPI) → HTTPS → ngrok public URL → local laptop → Ollama → Phi-4-mini
```

Ollama runs on a local laptop serving Phi-4-mini on `localhost:11434` with an OpenAI-compatible API. Ngrok tunnels that to a public URL. The FastAPI backend on Render calls that ngrok URL.

### 5.2 LLM Client Setup
```python
# backend/ai/llm/client.py
import os
from openai import OpenAI

def get_llm_client() -> OpenAI:
    """
    Returns an OpenAI-compatible client pointed at the local Ollama instance via ngrok.
    NGROK_LLM_URL comes from environment variable.
    """
    ngrok_url = os.environ.get("NGROK_LLM_URL", "http://localhost:11434")
    return OpenAI(
        base_url=f"{ngrok_url}/v1",
        api_key="ollama",  # required by client but unused by Ollama
    )

def call_llm(
    system_prompt: str,
    user_message: str,
    model: str = "phi4-mini",
    timeout: int = 8,
    expect_json: bool = True,
) -> str:
    """
    Calls the local LLM. Returns the response text.
    Raises TimeoutError if no response within timeout seconds.
    Raises ValueError if response is not valid JSON when expect_json=True.
    """
    client = get_llm_client()
    
    kwargs = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "timeout": timeout,
    }
    
    if expect_json:
        kwargs["response_format"] = {"type": "json_object"}
    
    try:
        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        return content
    except Exception as e:
        raise TimeoutError(f"LLM call failed or timed out: {e}")
```

### 5.3 CRITICAL: Always have a fallback
Every LLM call MUST have a hardcoded fallback response for when the tunnel is down or the model times out:

```python
def safe_llm_call(system_prompt: str, user_message: str, fallback_result: dict) -> dict:
    """
    Wraps any LLM call with timeout + JSON parsing + fallback.
    If LLM fails for ANY reason: return fallback_result instead of crashing.
    """
    import json
    try:
        raw = call_llm(system_prompt, user_message, timeout=8, expect_json=True)
        # Strip any markdown fences if model adds them
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        print(f"[AI FALLBACK] LLM call failed: {e}. Using fallback.")
        return fallback_result
```

---

## 6. THE FOUR CORE AI MODULES

### 6.1 `hard_constraint_validator.py`

**What it does**: Validates a proposed blended plan against hard constraints BEFORE it is shown to the group. If it fails, the caller regenerates once; if it fails again, escalates to branching.

**What hard constraints are** (from itinerary_item context):
- Time: the blended activity must fit within the time slot (starts_at to ends_at)
- Location: if entity_id doesn't exist in the dataset, it's invalid
- Transport: if the blended activity requires a mode of transport not available in the trip context (this can be a simplified check for hackathon — just flag obviously impossible ones)

**Input**:
```python
def validate_plan(
    blended_plan: dict,          # the plan generated by blended_plan_generator
    itinerary_item: dict,        # the current slot's data
    trip_context: dict,          # trip dates, destination city, etc.
) -> dict:
    """
    Returns:
    {
        "valid": bool,
        "violations": [str]   # empty list if valid
    }
    """
```

**Implementation** (keep simple for hackathon):
```python
def validate_plan(blended_plan, itinerary_item, trip_context):
    violations = []
    
    # Check 1: entity_type must be a valid enum value
    valid_entity_types = [
        "hotel", "room_type", "rate_plan", "flight", "flight_fare",
        "poi", "package", "package_component", "guide", "transfer",
        "event", "xr_scene"
    ]
    if blended_plan.get("entity_type") not in valid_entity_types:
        violations.append(f"Invalid entity_type: {blended_plan.get('entity_type')}")
    
    # Check 2: entity_id must not be None or empty
    if not blended_plan.get("entity_id"):
        violations.append("entity_id is missing or empty")
    
    # Check 3: cost_delta must be parseable as Decimal
    try:
        from decimal import Decimal
        Decimal(str(blended_plan.get("cost_delta", "0")))
    except:
        violations.append("cost_delta is not a valid decimal number")
    
    # Check 4: title and rationale must be non-empty strings
    if not blended_plan.get("title", "").strip():
        violations.append("title is empty")
    if not blended_plan.get("rationale", "").strip():
        violations.append("rationale is empty")
    
    return {
        "valid": len(violations) == 0,
        "violations": violations,
    }
```

**This is the FIRST module to build** — it has no LLM dependency, runs instantly, and is needed by everything else.

---

### 6.2 `branch_trigger_classifier.py`

**What it does**: Reads the typed NO comment(s) and decides if the objection is:
- `FIXABLE_TWEAK`: a preference that can be blended into a compromise (e.g. "prefer morning slot", "add spa element")
- `FIXED_REQUIREMENT`: a hard, non-negotiable incompatibility (e.g. "injured ankle — cannot do any hiking", "religious restriction", "already booked a different hotel")

**IMPORTANT VAGUE COMMENT RULE**: If a comment is vague or low-information (e.g. "not feeling it", "idk", "something else"), classify it as `FIXABLE_TWEAK` with low confidence — NEVER as `FIXED_REQUIREMENT`. Do not over-interpret vague messages.

**Input**:
```python
def classify_objection(
    no_comments: list[dict],    # [{ "user_id": str, "comment": str, "round": int }]
    current_round: int,
    soft_round_cap: int = 3,    # after this many rounds, even FIXABLE_TWEAK may trigger branch
) -> dict:
    """
    Returns:
    {
        "classification": "FIXABLE_TWEAK" | "FIXED_REQUIREMENT",
        "confidence": float,
        "reasoning": str,
    }
    """
```

**System prompt for Phi-4-mini** (exact prompt to use):
```python
CLASSIFIER_SYSTEM_PROMPT = """You are a travel group consensus classifier. 
You receive typed objection comments from group members who voted NO on a proposed activity.
Your job is to classify whether these objections represent:

FIXABLE_TWEAK: The objection can be addressed by modifying or blending the activity. 
Examples: "prefer morning time", "want something less crowded", "add a spa element", 
"not feeling it", "maybe something else", "not sure about this one"

FIXED_REQUIREMENT: The objection represents a hard, non-negotiable constraint that 
cannot be addressed by modifying the proposed activity.
Examples: "injured ankle cannot do any hiking at all", "vegetarian cannot eat at steakhouse",
"already booked flights that day", "severe phobia of heights", "religious restriction prevents this"

CRITICAL RULES:
1. Vague or low-information comments ("not feeling it", "idk") are ALWAYS FIXABLE_TWEAK
2. Only classify as FIXED_REQUIREMENT when there is a clear, specific, non-negotiable constraint stated
3. Preference for a different type of activity is FIXABLE_TWEAK, not FIXED_REQUIREMENT

Respond ONLY with a JSON object in this exact format, nothing else:
{
  "classification": "FIXABLE_TWEAK" or "FIXED_REQUIREMENT",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief one-sentence explanation"
}"""
```

**Implementation**:
```python
import json
from backend.ai.llm.client import safe_llm_call

# Fallback: if LLM fails, default to FIXABLE_TWEAK (safer — avoids premature branching)
CLASSIFIER_FALLBACK = {
    "classification": "FIXABLE_TWEAK",
    "confidence": 0.5,
    "reasoning": "LLM unavailable — defaulting to fixable tweak to attempt blend first",
}

def classify_objection(no_comments, current_round, soft_round_cap=3):
    # Build user message from comments
    comments_text = "\n".join([
        f"Round {c['round']}, Member {c['user_id']}: \"{c['comment']}\""
        for c in no_comments
    ])
    user_message = f"Classify these objections:\n{comments_text}"
    
    result = safe_llm_call(
        system_prompt=CLASSIFIER_SYSTEM_PROMPT,
        user_message=user_message,
        fallback_result=CLASSIFIER_FALLBACK,
    )
    
    # Validate the result has the expected fields
    if result.get("classification") not in ["FIXABLE_TWEAK", "FIXED_REQUIREMENT"]:
        return CLASSIFIER_FALLBACK
    
    return result
```

---

### 6.3 `blended_plan_generator.py`

**What it does**: Given a current proposal and typed NO comments (suggestions), generates EXACTLY ONE blended compromise plan that tries to incorporate the suggestions into the existing activity.

**Key rules**:
1. ALWAYS attempts blending BEFORE any branching — this step is never skipped
2. Produces EXACTLY ONE plan, not multiple options
3. The plan must stay within the same general activity category where possible (e.g. if the proposal is "Mount Batur Trek" and someone says "prefer spa", blend into "Thermal Springs at Batur" not an entirely unrelated activity)
4. Returns the plan as a structured dict, never free text
5. After generation, the caller MUST run `hard_constraint_validator.validate_plan()` before returning to Panchami

**Input**:
```python
def generate_blended_plan(
    current_proposal: dict,      # { title, rationale, entity_type, entity_id, cost_delta, currency }
    no_vote_comments: list[dict],  # [{ user_id, comment, round }]
    itinerary_item: dict,         # { item_id, title, entity_type, entity_id, cost, currency, starts_at, ends_at }
    trip_context: dict,           # { destination_city, start_date, end_date, mode }
    current_round: int,
) -> dict:
    """
    Returns blended plan dict OR raises an exception if generation fails.
    Caller handles exception → triggers branching.
    """
```

**System prompt for Phi-4-mini**:
```python
BLEND_SYSTEM_PROMPT = """You are a travel activity compromise generator for a group trip planning app.

Your job: Given a proposed group activity and typed objection comments from NO-voters, 
generate EXACTLY ONE blended compromise activity that tries to incorporate as many objections 
as possible while staying close to the original activity's spirit and location.

RULES:
1. Generate EXACTLY ONE plan, not multiple options
2. The plan should blend the original activity with the suggestions from NO-voters
3. Keep the activity in the same general area/category where feasible
4. Use "poi" as the entity_type for most activities
5. Generate a realistic-sounding entity_id like "poi_[descriptive_name]" 
6. cost_delta should be the change from the original cost (can be 0, positive, or negative)
7. Write rationale in 1-2 clear sentences explaining the compromise

Respond ONLY with a JSON object in this exact format, nothing else:
{
  "title": "Activity title (concise, under 60 chars)",
  "rationale": "One or two sentences explaining the compromise",
  "entity_type": "poi",
  "entity_id": "poi_[descriptive_name]",
  "cost_delta": "0.00",
  "currency": "USD"
}"""
```

**Implementation**:
```python
import json
from decimal import Decimal
from backend.ai.llm.client import safe_llm_call
from backend.ai.core.hard_constraint_validator import validate_plan

# Fallback blended plan: merges first NO comment into original title
def _build_fallback_plan(current_proposal, no_vote_comments, currency="USD"):
    first_comment = no_vote_comments[0]["comment"] if no_vote_comments else "alternative preference"
    return {
        "title": f"{current_proposal['title']} (Modified)",
        "rationale": f"Compromise incorporating group feedback: {first_comment[:100]}",
        "entity_type": current_proposal.get("entity_type", "poi"),
        "entity_id": current_proposal.get("entity_id", "poi_modified"),
        "cost_delta": "0.00",
        "currency": currency,
    }

def generate_blended_plan(current_proposal, no_vote_comments, itinerary_item, trip_context, current_round):
    # Build rich user message
    comments_text = "\n".join([f"- {c['comment']}" for c in no_vote_comments])
    user_message = f"""
Current proposed activity: "{current_proposal['title']}"
Rationale: {current_proposal.get('rationale', 'No rationale provided')}
Destination: {trip_context.get('destination_city', 'Unknown')}
Round: {current_round}

NO-voter objections and suggestions:
{comments_text}

Generate one blended compromise activity.
"""
    
    fallback = _build_fallback_plan(current_proposal, no_vote_comments, current_proposal.get("currency", "USD"))
    
    result = safe_llm_call(
        system_prompt=BLEND_SYSTEM_PROMPT,
        user_message=user_message,
        fallback_result=fallback,
    )
    
    # Validate money field
    try:
        Decimal(str(result.get("cost_delta", "0")))
    except:
        result["cost_delta"] = "0.00"
    
    # Ensure currency is set
    if not result.get("currency"):
        result["currency"] = current_proposal.get("currency", "USD")
    
    # Run hard constraint validation
    validation = validate_plan(result, itinerary_item, trip_context)
    
    if not validation["valid"]:
        # Try once more with violations noted in prompt
        violations_text = "; ".join(validation["violations"])
        user_message_retry = user_message + f"\n\nPrevious attempt had these issues: {violations_text}. Please fix them."
        result = safe_llm_call(
            system_prompt=BLEND_SYSTEM_PROMPT,
            user_message=user_message_retry,
            fallback_result=fallback,
        )
        # Validate again
        validation2 = validate_plan(result, itinerary_item, trip_context)
        if not validation2["valid"]:
            # Second failure → raise to trigger branching
            raise ValueError(f"Blended plan failed validation twice: {validation2['violations']}")
        constraint_status = "REGENERATED_ONCE"
    else:
        constraint_status = "PASSED"
    
    return {
        "action": "BLENDED",
        "blended_plan": result,
        "current_round": current_round,
        "constraint_validation": constraint_status,
    }
```

---

### 6.4 `branch_grouping.py`

**What it does**: Takes all holdout members' typed suggestions and groups them into N parallel branches. Near-duplicate preferences merge into the same branch. Single-member branches auto-finalize.

**Key rules**:
1. NO cap on number of branches — if 4 members want 4 truly different things, create 4 branches
2. Near-duplicate preferences (e.g. "beach" and "beach with water sports") merge into ONE branch
3. Single-member branches: set `auto_finalized = True` — their suggestion becomes the plan immediately, no vote needed
4. Multi-member branches where members still disagree: these get `parent_branch_id` set by Panchami for recursive re-run
5. Branching is ONE-WAY for this consensus cycle — once we branch, we never go back to blending for this slot in this cycle

**Input**:
```python
def group_into_branches(
    holdout_members: list[dict],  # [{ "user_id": str, "comment": str, "suggestion": str }]
    itinerary_item: dict,
    trip_context: dict,
) -> dict:
    """
    Returns:
    {
        "action": "BRANCHED",
        "branches": [
            {
                "title": str,
                "rationale": str,
                "entity_type": str | None,
                "entity_id": str | None,
                "cost_delta": str,
                "currency": str,
                "member_user_ids": [str],
                "auto_finalized": bool,
            }
        ]
    }
    """
```

**System prompt for Phi-4-mini**:
```python
BRANCH_GROUPING_SYSTEM_PROMPT = """You are a travel preference clustering system.

You receive a list of group members and their stated preferences/objections for a travel activity.
Your job: Group these members into separate branches based on genuinely distinct, incompatible preferences.

RULES:
1. Create ONE branch per genuinely distinct preference — do NOT cap at 2
2. Merge near-duplicate preferences into the SAME branch (e.g. "beach" and "beach walk" → same branch)
3. Keep branches as few as possible while respecting genuine incompatibilities
4. Each branch should have a clear title summarizing that group's preference
5. For entity_type, use "poi" for most activities
6. Generate realistic entity_id values like "poi_[descriptive_name]"

Respond ONLY with a JSON object in this exact format:
{
  "branches": [
    {
      "title": "Branch title",
      "rationale": "Why this group was formed",
      "entity_type": "poi",
      "entity_id": "poi_example",
      "cost_delta": "0.00",
      "currency": "USD",
      "member_user_ids": ["usr_abc", "usr_def"]
    }
  ]
}"""
```

**Implementation**:
```python
from backend.ai.llm.client import safe_llm_call

def _build_fallback_branches(holdout_members, currency="USD"):
    """Fallback: put all holdouts in one branch."""
    return {
        "action": "BRANCHED",
        "branches": [
            {
                "title": "Alternative Preference Group",
                "rationale": "Members with differing preferences",
                "entity_type": "poi",
                "entity_id": "poi_alternative",
                "cost_delta": "0.00",
                "currency": currency,
                "member_user_ids": [m["user_id"] for m in holdout_members],
                "auto_finalized": len(holdout_members) == 1,
            }
        ]
    }

def group_into_branches(holdout_members, itinerary_item, trip_context):
    if not holdout_members:
        return {"action": "BRANCHED", "branches": []}
    
    # Build member list with comments for LLM
    members_text = "\n".join([
        f"Member {m['user_id']}: \"{m['comment']}\""
        for m in holdout_members
    ])
    
    user_message = f"""
Activity being disagreed on: "{itinerary_item.get('title', 'Unknown activity')}"
Destination: {trip_context.get('destination_city', 'Unknown')}

Members who voted NO and their suggestions:
{members_text}

Group these members into parallel branches based on their distinct preferences.
Use the exact user_id strings provided above.
"""
    
    fallback = _build_fallback_branches(
        holdout_members, 
        itinerary_item.get("currency", "USD")
    )
    
    result = safe_llm_call(
        system_prompt=BRANCH_GROUPING_SYSTEM_PROMPT,
        user_message=user_message,
        fallback_result=fallback.get("branches", []),
    )
    
    # Result might be the branches list or the full dict
    if isinstance(result, list):
        branches = result
    elif isinstance(result, dict) and "branches" in result:
        branches = result["branches"]
    else:
        branches = fallback["branches"]
    
    # Post-process: mark single-member branches as auto-finalized
    for branch in branches:
        member_ids = branch.get("member_user_ids", [])
        branch["auto_finalized"] = len(member_ids) == 1
        
        # Ensure money fields are correct
        try:
            from decimal import Decimal
            Decimal(str(branch.get("cost_delta", "0")))
        except:
            branch["cost_delta"] = "0.00"
        
        if not branch.get("currency"):
            branch["currency"] = itinerary_item.get("currency", "USD")
    
    # Validate: every holdout member must appear in exactly one branch
    all_assigned = set()
    for branch in branches:
        for uid in branch.get("member_user_ids", []):
            all_assigned.add(uid)
    
    holdout_ids = {m["user_id"] for m in holdout_members}
    unassigned = holdout_ids - all_assigned
    if unassigned:
        # Put unassigned members in a catch-all branch
        branches.append({
            "title": "Other Preferences",
            "rationale": "Members with uncategorized preferences",
            "entity_type": "poi",
            "entity_id": "poi_other",
            "cost_delta": "0.00",
            "currency": itinerary_item.get("currency", "USD"),
            "member_user_ids": list(unassigned),
            "auto_finalized": len(unassigned) == 1,
        })
    
    return {"action": "BRANCHED", "branches": branches}
```

---

## 7. THE TWO MODE ORCHESTRATORS

### 7.1 `mode_na_orchestrator.py` (Collaborative — Fully Automatic)

```python
# backend/ai/modes/mode_na_orchestrator.py
from backend.ai.core.branch_trigger_classifier import classify_objection
from backend.ai.core.blended_plan_generator import generate_blended_plan
from backend.ai.core.branch_grouping import group_into_branches

SOFT_ROUND_CAP = 3

def run_mode_na_round(
    proposal: dict,
    no_votes: list[dict],    # [{ user_id, comment, round }]
    itinerary_item: dict,
    trip_context: dict,
    current_round: int,
) -> dict:
    """
    Mode NA full consensus round.
    Returns BLENDED or BRANCHED result for Panchami to act on.
    """
    
    # Step 1: Check if we're at or past round cap
    at_round_cap = current_round >= SOFT_ROUND_CAP
    
    # Step 2: Classify objections
    classification = classify_objection(
        no_comments=no_votes,
        current_round=current_round,
        soft_round_cap=SOFT_ROUND_CAP,
    )
    
    # Step 3: Decide: blend or branch?
    should_branch = (
        classification["classification"] == "FIXED_REQUIREMENT"
        or at_round_cap
    )
    
    if should_branch:
        # Go straight to branching
        holdout_members = [
            {"user_id": v["user_id"], "comment": v["comment"], "suggestion": v["comment"]}
            for v in no_votes
        ]
        return group_into_branches(holdout_members, itinerary_item, trip_context)
    
    # Step 4: Try blending
    try:
        return generate_blended_plan(
            current_proposal=proposal,
            no_vote_comments=no_votes,
            itinerary_item=itinerary_item,
            trip_context=trip_context,
            current_round=current_round,
        )
    except ValueError:
        # Blending failed validation twice → force branch
        holdout_members = [
            {"user_id": v["user_id"], "comment": v["comment"], "suggestion": v["comment"]}
            for v in no_votes
        ]
        return group_into_branches(holdout_members, itinerary_item, trip_context)
```

### 7.2 `mode_a_orchestrator.py` (Admin-Led)

```python
# backend/ai/modes/mode_a_orchestrator.py
from backend.ai.core.branch_trigger_classifier import classify_objection
from backend.ai.core.blended_plan_generator import generate_blended_plan
from backend.ai.core.branch_grouping import group_into_branches

def run_mode_a_round(
    proposal: dict,
    no_votes: list[dict],
    itinerary_item: dict,
    trip_context: dict,
    current_round: int,
    admin_action: str | None = None,  # 'force_branch' | 'extend' | 'accept' | None
) -> dict:
    """
    Mode A consensus round.
    Admin action overrides AI recommendation.
    Returns a result dict — but in Mode A, it's always ADVISORY (admin decides what to do with it).
    """
    
    # If admin has explicitly acted, honor that immediately
    if admin_action == "force_branch":
        holdout_members = [
            {"user_id": v["user_id"], "comment": v["comment"], "suggestion": v["comment"]}
            for v in no_votes
        ]
        return group_into_branches(holdout_members, itinerary_item, trip_context)
    
    if admin_action == "extend":
        # Just return current state — round continues
        return {
            "action": "EXTENDED",
            "message": "Admin extended the round. Voting window continues.",
            "current_round": current_round,
        }
    
    # No admin action yet → generate AI recommendation (advisory only)
    classification = classify_objection(
        no_comments=no_votes,
        current_round=current_round,
    )
    
    if classification["classification"] == "FIXED_REQUIREMENT":
        # Recommend branching to admin
        holdout_members = [
            {"user_id": v["user_id"], "comment": v["comment"], "suggestion": v["comment"]}
            for v in no_votes
        ]
        branch_result = group_into_branches(holdout_members, itinerary_item, trip_context)
        branch_result["advisory"] = True  # Flag: admin must still approve
        branch_result["admin_recommendation"] = "Branch — fixed incompatible requirements detected"
        return branch_result
    
    # Try blending
    try:
        blend_result = generate_blended_plan(
            current_proposal=proposal,
            no_vote_comments=no_votes,
            itinerary_item=itinerary_item,
            trip_context=trip_context,
            current_round=current_round,
        )
        blend_result["advisory"] = True  # Flag: admin must still approve
        blend_result["admin_recommendation"] = "Accept blended plan — objections appear resolvable"
        return blend_result
    except ValueError:
        holdout_members = [
            {"user_id": v["user_id"], "comment": v["comment"], "suggestion": v["comment"]}
            for v in no_votes
        ]
        branch_result = group_into_branches(holdout_members, itinerary_item, trip_context)
        branch_result["advisory"] = True
        branch_result["admin_recommendation"] = "Branch — blending failed constraint validation"
        return branch_result
```

---

## 8. DETERMINISTIC SOLO MATCHMAKERS (NO LLM — PURE MATH)

These two scorers are 100% deterministic. NO LLM calls. NO randomness. Given the same inputs, they ALWAYS return the same scores. This makes them demo-safe and instantly verifiable.

### 8.1 `group_compatibility_scorer.py`

**Scoring formula** (weighted sum, 0-100 integer):
```
age_group_match:      20 points  (binary: their age_group matches trip's target range)
language_overlap:     30 points  (% of user's languages that match trip members' languages × 30)
interest_overlap:     30 points  (% of user's interests that match trip members' interests × 30)
date_overlap:         20 points  (overlap days / user's trip duration × 20, capped at 20)
TOTAL:               100 points maximum
```

```python
# backend/ai/scorers/group_compatibility_scorer.py
from datetime import date
from decimal import Decimal

def score_group_match(
    user: dict,             # { user_id, age_group, ... }
    user_prefs: dict,       # { preferred_languages: "en,hi", interests: "heritage,food" }
    candidate_trips: list[dict],  # list of { trip_id, start_date, end_date, members_prefs: [...] }
) -> list[dict]:
    """
    Returns list of { trip_id, compatibility_score, age_group_match, shared_languages, shared_interests, date_overlap_days }
    sorted by compatibility_score descending.
    compatibility_score is an INTEGER 0-100. NEVER float. NEVER string.
    """
    results = []
    
    user_languages = set(user_prefs.get("preferred_languages", "").split(","))
    user_interests = set(user_prefs.get("interests", "").split(","))
    user_age_group = user.get("age_group", "")
    
    for trip in candidate_trips:
        score = 0
        
        # --- Age group match (20 points) ---
        trip_age_groups = set()
        for m_pref in trip.get("members_prefs", []):
            if m_pref.get("age_group"):
                trip_age_groups.add(m_pref["age_group"])
        
        age_match = user_age_group in trip_age_groups
        if age_match:
            score += 20
        
        # --- Language overlap (30 points) ---
        trip_languages = set()
        for m_pref in trip.get("members_prefs", []):
            langs = m_pref.get("preferred_languages", "")
            trip_languages.update(langs.split(","))
        
        shared_langs = user_languages & trip_languages
        lang_score = 0
        if user_languages:
            lang_score = int((len(shared_langs) / len(user_languages)) * 30)
        score += lang_score
        
        # --- Interest overlap (30 points) ---
        trip_interests = set()
        for m_pref in trip.get("members_prefs", []):
            interests = m_pref.get("interests", "")
            trip_interests.update(interests.split(","))
        
        shared_interests = user_interests & trip_interests
        interest_score = 0
        if user_interests:
            interest_score = int((len(shared_interests) / len(user_interests)) * 30)
        score += interest_score
        
        # --- Date overlap (20 points) ---
        try:
            trip_start = date.fromisoformat(trip["start_date"])
            trip_end = date.fromisoformat(trip["end_date"])
            # Assume user is flexible for ±7 days around trip dates (simplification)
            user_start = trip_start  # or pull from user's trip if available
            user_end = trip_end
            
            overlap_start = max(trip_start, user_start)
            overlap_end = min(trip_end, user_end)
            overlap_days = max(0, (overlap_end - overlap_start).days)
            
            trip_duration = max(1, (trip_end - trip_start).days)
            date_score = min(20, int((overlap_days / trip_duration) * 20))
            score += date_score
        except:
            overlap_days = 0
            date_score = 0
        
        # Clamp to 0-100
        final_score = max(0, min(100, score))
        
        results.append({
            "trip_id": trip["trip_id"],
            "compatibility_score": final_score,          # INTEGER, not float
            "age_group_match": age_match,
            "shared_languages": list(shared_langs - {""}),
            "shared_interests": list(shared_interests - {""}),
            "date_overlap_days": overlap_days,
        })
    
    # Sort by score descending
    results.sort(key=lambda x: x["compatibility_score"], reverse=True)
    return results
```

### 8.2 `guide_compatibility_scorer.py`

**Scoring formula** (weighted sum, 0-100 integer):
```
language_match:       40 points  (% overlap between user's languages and guide's languages × 40)
specialisation_match: 30 points  (primary match 20pts, secondary match 10pts)
budget_fit:           20 points  (guide's day_rate ≤ user's max_budget → 20pts, else 0)
rating_score:         10 points  (rating / 5.0 × 10, rounded to int)
TOTAL:               100 points maximum
```

```python
# backend/ai/scorers/guide_compatibility_scorer.py
from decimal import Decimal

def score_guide_match(
    user: dict,
    user_prefs: dict,     # { preferred_languages, interests, max_daily_budget, preferred_currency }
    candidate_guides: list[dict],
    max_budget: str | None = None,  # ISO money string e.g. "100.00", overrides user_prefs if provided
) -> list[dict]:
    """
    Returns list of { guide_id, compatibility_score, shared_languages, shared_specialisations }
    sorted by compatibility_score descending.
    compatibility_score is INTEGER 0-100.
    """
    results = []
    
    user_languages = set(user_prefs.get("preferred_languages", "").split(","))
    user_interests = set(user_prefs.get("interests", "").split(","))
    
    budget = None
    budget_str = max_budget or user_prefs.get("max_daily_budget")
    if budget_str:
        try:
            budget = Decimal(str(budget_str))
        except:
            budget = None
    
    for guide in candidate_guides:
        score = 0
        
        # --- Language match (40 points) ---
        guide_languages = set(guide.get("languages", "").split(","))
        shared_langs = user_languages & guide_languages
        lang_score = 0
        if user_languages:
            lang_score = int((len(shared_langs) / len(user_languages)) * 40)
        score += lang_score
        
        # --- Specialisation match (30 points) ---
        spec_score = 0
        guide_primary = guide.get("specialisation", "")
        guide_secondary = guide.get("secondary_specialisation", "")
        
        if guide_primary in user_interests:
            spec_score += 20
        if guide_secondary and guide_secondary in user_interests:
            spec_score += 10
        score += spec_score
        
        shared_specs = []
        if guide_primary in user_interests:
            shared_specs.append(guide_primary)
        if guide_secondary and guide_secondary in user_interests:
            shared_specs.append(guide_secondary)
        
        # --- Budget fit (20 points) ---
        budget_score = 0
        if budget is not None:
            try:
                guide_rate = Decimal(str(guide.get("day_rate", "9999")))
                if guide_rate <= budget:
                    budget_score = 20
            except:
                pass
        else:
            budget_score = 10  # no budget constraint = partial score
        score += budget_score
        
        # --- Rating (10 points) ---
        rating_score = 0
        if guide.get("rating") is not None:
            try:
                rating = Decimal(str(guide["rating"]))
                rating_score = int((rating / Decimal("5.0")) * 10)
            except:
                pass
        score += rating_score
        
        # Clamp 0-100
        final_score = max(0, min(100, score))
        
        results.append({
            "guide_id": guide["guide_id"],
            "compatibility_score": final_score,      # INTEGER
            "shared_languages": list(shared_langs - {""}),
            "shared_specialisations": shared_specs,
        })
    
    results.sort(key=lambda x: x["compatibility_score"], reverse=True)
    return results
```

---

## 9. PHASE-BY-PHASE EXECUTION PLAN

### PHASE 0 — Hour 0–1 (12:00–13:00)
**Your job**: Draft prompts against real PS-11 dataset examples. Set up Ollama.

Concrete deliverables:
1. Set up Ollama on your laptop:
   ```bash
   ollama pull phi4-mini
   ollama serve
   # Verify: curl http://localhost:11434/api/tags
   ```
2. Test Phi-4-mini responds to a simple JSON prompt:
   ```bash
   curl http://localhost:11434/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"phi4-mini","messages":[{"role":"user","content":"Return {\"test\":true}"}],"response_format":{"type":"json_object"}}'
   ```
3. Create `backend/ai/llm/client.py` with `call_llm()` and `safe_llm_call()` (Section 5)
4. Look at real data from PS-11.db:
   - Open the SQLite DB and read 5-10 actual proposal rows
   - Read 5-10 actual vote rows with comments
   - Read 5-10 actual user_preferences rows
   This is your grounding data — your AI reads these exact field names
5. Draft the 3 system prompts (classifier, blend generator, branch grouper) — test them manually against real data examples
6. Confirm with Panchami: function signatures agreed (what she calls, what you return)

**Gate**: `safe_llm_call()` works, returns parsed JSON, falls back gracefully on timeout. Done.

---

### PHASE 1 — Hours 1–4 (13:00–16:00)
**Your job**: Build `hard_constraint_validator.py` and `branch_trigger_classifier.py`.

Concrete deliverables:
1. `hard_constraint_validator.py` — fully working, no LLM dependency (Section 6.1)
2. Test validator with scripted inputs:
   ```python
   # Should PASS:
   validate_plan({"title":"X","rationale":"Y","entity_type":"poi","entity_id":"poi_test","cost_delta":"0.00","currency":"USD"}, {...}, {...})
   # Should FAIL:
   validate_plan({"title":"","entity_type":"invalid_type","entity_id":"","cost_delta":"not_a_number"}, {...}, {...})
   ```
3. `branch_trigger_classifier.py` with LLM + fallback (Section 6.2)
4. Test classifier with scripted inputs:
   ```python
   # Should return FIXED_REQUIREMENT:
   classify_objection([{"user_id":"usr_1","comment":"injured ankle cannot hike","round":1}], 1)
   # Should return FIXABLE_TWEAK:
   classify_objection([{"user_id":"usr_1","comment":"not feeling it","round":1}], 1)
   classify_objection([{"user_id":"usr_1","comment":"prefer spa instead","round":1}], 1)
   ```
5. Write these tests to `tests/test_branch_classifier.py`

**Gate**: Both modules work standalone. Vague comment → FIXABLE_TWEAK. Injury comment → FIXED_REQUIREMENT. Done.

---

### PHASE 2 — Hours 4–8 (16:00–20:00)
**Your job**: Build `blended_plan_generator.py` end-to-end on scripted disagreement.

Concrete deliverables:
1. `blended_plan_generator.py` with LLM + fallback + validator integration (Section 6.3)
2. Scripted test scenario:
   ```python
   # Proposal: Mount Batur Trek
   # NO comment 1: "injured ankle, prefer hot springs spa"
   # NO comment 2: "morning person, prefer sunrise activity"
   # Expected: blended plan e.g. "Batur Thermal Springs Sunrise Visit"
   result = generate_blended_plan(
       current_proposal={"title":"Mount Batur Trek","rationale":"Sunrise hike","entity_type":"poi","entity_id":"poi_batur","cost_delta":"0.00","currency":"USD"},
       no_vote_comments=[
           {"user_id":"usr_1","comment":"injured ankle, prefer hot springs spa","round":1},
           {"user_id":"usr_2","comment":"morning person, prefer sunrise activity","round":1},
       ],
       itinerary_item={"item_id":"itm_1","title":"Morning Activity","entity_type":"poi","entity_id":"poi_batur","cost":"65.00","currency":"USD"},
       trip_context={"destination_city":"Bali","start_date":"2026-10-10","end_date":"2026-10-16","mode":"Mode NA"},
       current_round=1,
   )
   assert result["action"] == "BLENDED"
   assert result["blended_plan"]["entity_type"] in valid_entity_types
   assert result["constraint_validation"] in ["PASSED","REGENERATED_ONCE"]
   ```
3. Run with Phi-4-mini connected via ngrok (or localhost if testing locally)
4. Verify fallback works: temporarily break ngrok URL → should get fallback plan, not crash

**Gate**: generate_blended_plan returns valid BLENDED result on scripted scenario. Fallback works. Done.

---

### PHASE 3 — Hours 8–12 (20:00–00:00)
**Your job**: `branch_grouping.py` + revision loop for 2–3 rounds.

Concrete deliverables:
1. `branch_grouping.py` with LLM + fallback + single-member auto-finalize (Section 6.4)
2. Test with 3-way and 4-way split scenarios:
   ```python
   holdouts = [
       {"user_id":"usr_1","comment":"want beach","suggestion":"beach"},
       {"user_id":"usr_2","comment":"want mountain hiking","suggestion":"hiking"},
       {"user_id":"usr_3","comment":"want temple visit","suggestion":"temple"},
   ]
   result = group_into_branches(holdouts, itm, trip)
   assert result["action"] == "BRANCHED"
   assert len(result["branches"]) == 3
   # Each member in exactly one branch
   all_ids = [uid for b in result["branches"] for uid in b["member_user_ids"]]
   assert sorted(all_ids) == sorted(["usr_1","usr_2","usr_3"])
   ```
3. `mode_na_orchestrator.py` — full round flow (Section 7.1)
4. `mode_a_orchestrator.py` — advisory round flow (Section 7.2)
5. Share function signatures with Panchami so she can call them

**Gate**: 3-way branch scenario creates 3 branches. Single-member branch has auto_finalized=True. Done.

---

### CHECKPOINT 1 — Hour 12 (00:00)
**Your job at checkpoint**: Confirm with Panchami that:
- `run_mode_na_round()` is callable from her consensus_service.py
- `run_mode_a_round()` is callable
- All function signatures match what she expects
- Your modules are importable from `backend.ai.*`

---

### PHASE 4 — Hours 12–16 (00:00–04:00)
**Your job**: Wire branch classifier + multi-way grouping to real 3–4-way test scenarios with Panchami.

Concrete deliverables:
1. Work with Panchami to confirm end-to-end: POST /api/consensus/reconcile → calls your function → returns correct shape
2. Test the full flow: real NO votes from PS-11 data → your AI → Panchami's DB write → Nikitha's UI update
3. Handle the case where Panchami calls `run_mode_na_round()` with real DB data (not scripted dicts)
4. Adjust any field mapping issues that arise when real data flows through

**Gate**: POST /api/consensus/reconcile with real trip data returns valid BLENDED or BRANCHED response. Done.

---

### PHASE 5 — Hours 16–19 (04:00–07:00)
**Your job**: Solo scorers + edge case prep.

Concrete deliverables:
1. `group_compatibility_scorer.py` fully tested (Section 8.1)
2. `guide_compatibility_scorer.py` fully tested (Section 8.2)
3. Verify scores are INTEGER 0-100 (no floats, no strings)
4. Verify determinism: same inputs → same output every time
5. Test against synthetic profile pairs with known-good expected rankings:
   ```python
   # User speaks 'en' and 'hi', interested in 'heritage' and 'food'
   # Guide A: languages='en,hi', specialisation='heritage', day_rate='80.00'
   # Guide B: languages='ta', specialisation='trekking', day_rate='50.00'
   # Expected: Guide A scores much higher than Guide B
   ```
6. Prep the scripted disagreement scenario for demo (3-4 members, known expected branches)

**Gate**: score_group_match returns integer scores, sorted descending. Same inputs → same scores every run. Done.

---

### PHASE 6 — Hours 19–21 (07:00–09:00)
**Your job**: Fix any prompt/validator integration issues from full click-through.

- Run full demo flow: proposal → NO with comment → reconcile → blended plan → re-vote → branch
- Fix any JSON parsing issues from Phi-4-mini output
- Fix any field name mismatches found in integration
- Ensure fallback fires correctly when tested

---

### CHECKPOINT 2 — Hour 21 (09:00)
**STOP.** Feature freeze. Merge into develop → main.

---

### PHASE 7 — Hours 21–24 (09:00–12:00)
**Demo prep**: Verify your scripted 3-4 way branch scenario works cleanly on the demo machine. Pre-run and cache expected outputs if needed.

---

## 10. DEPENDENCY MAP

| What you need | From whom | When |
|---|---|---|
| `NGROK_LLM_URL` in env | Nithya | Hour 0 |
| Ollama running on a laptop | You (your own laptop) | Hour 0 |
| Panchami to agree function signatures | Panchami | Hour 0–1 |
| Real PS-11 data to test against | Nithya (DB seeded) | Hour 1 |
| `POST /api/consensus/reconcile` to call your functions | Panchami | Hour 12 |
| `POST /api/solo-matching/groups` to call your scorer | Panchami | Hour 16 |

---

## 11. WHAT YOU MUST NEVER DO

1. Never write to the database directly — return dicts to Panchami, she writes
2. Never write an HTTP endpoint — Panchami owns all routes
3. Never use float for money — always Decimal in Python, string in output dicts
4. Never classify a vague comment ("not feeling it") as FIXED_REQUIREMENT
5. Never skip the hard_constraint_validator before returning a blended plan
6. Never resume common-ground blending on a slot that has already switched to BRANCHED in this cycle
7. Never cap branches at 2 — if there are 5 distinct preferences, return 5 branches
8. Never forget to mark single-member branches as auto_finalized=True
9. Never return compatibilityScore as a float — it must be an integer
10. Never make an LLM call from the solo scorers — they are pure math, no exceptions
11. Never crash if the LLM times out — always use safe_llm_call with a fallback
12. Never invent a vote value of 'abstain' — you only receive 'yes' or 'no'
