import os
import sys

# Ensure UTF-8 output encoding on Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ai.llm.client import get_llm_config, get_llm_client
from backend.ai.core.blended_plan_generator import generate_blended_plan


def main():
    print("=" * 65)
    print("      WANDERMATCH AI CONSENSUS — LIVE LLM TESTER")
    print("=" * 65)

    base_url, api_key, model = get_llm_config()
    client = get_llm_client()

    if client:
        masked_key = f"{api_key[:7]}...{api_key[-4:]}" if api_key and len(api_key) > 12 else "configured"
        print(f"[STATUS] Connected to LIVE LLM Provider!")
        print(f"  Endpoint : {base_url}")
        print(f"  Model    : {model}")
        print(f"  Key      : {masked_key}")
    else:
        print("[STATUS] No live LLM provider found (Using offline semantic synthesis engine)")
        print("To connect OpenAI, set: $env:OPENAI_API_KEY='sk-...'")

    print("\n--- Running Live Consensus Compromise Test ---")

    # Live test case: Art Museum vs Adrenaline Go-Karting
    proposal = {
        "title": "Old Town Art Museum",
        "rationale": "Quiet gallery walk observing renaissance paintings.",
        "currency": "USD",
        "entity_type": "poi",
        "entity_id": "poi_art_museum",
        "cost_delta": "0.00",
    }
    no_votes = [
        {"user_id": "usr_bob", "comment": "Boring! I want high-speed outdoor go-karting and adrenaline!"}
    ]
    trip_context = {"destination_city": "Goa"}

    print(f"\n[ORIGINAL PROPOSAL]: {proposal['title']}")
    print(f"  Rationale : {proposal['rationale']}")
    print(f"\n[OBJECTION FROM BOB]: \"{no_votes[0]['comment']}\"")
    print("\nCalling AI Consensus Engine...")

    result = generate_blended_plan(
        current_proposal=proposal,
        no_vote_comments=no_votes,
        itinerary_item={"currency": "USD", "cost": "20.00"},
        trip_context=trip_context,
        current_round=1,
    )

    plan = result["blended_plan"]
    print("\n" + "-" * 50)
    print(f"[AI SYNTHESIZED COMPROMISE PLAN]:")
    print(f"  Activity Title : {plan.get('title')}")
    print(f"  AI Rationale   : {plan.get('rationale')}")
    print(f"  Entity Type    : {plan.get('entity_type')}")
    print(f"  Entity ID      : {plan.get('entity_id')}")
    print(f"  Cost Delta     : ${plan.get('cost_delta')} {plan.get('currency')}")
    print(f"  Validation     : {result.get('constraint_validation')}")
    print("-" * 50)
    print("\nSUCCESS! The AI Consensus Engine evaluated the input and produced a compromise.")


if __name__ == "__main__":
    main()
