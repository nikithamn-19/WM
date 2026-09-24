# WanderMatch AI Consensus Engine (Mode NA)

An automated, democratic AI Consensus & Reconciliation Engine for group travel planning. Built for **WanderMatch** under Mode NA (Collaborative / Automatic).

## 🚀 Key Features

1. **Continuous Collaborative Consensus Loop**:
   - Members vote on proposals (`yes` / `no` with typed comments).
   - Upon a `no` vote, the AI automatically reconciles the desires and objection reasons to generate a real-world, verifiable compromise spot in the destination city.
   - The new compromise opens a 10-minute voting window (`closes_at = NOW() + 10m`).
   - If another `no` vote is cast, another AI round triggers automatically, repeating until accepted.

2. **Unanimous Fast-Path Confirmation**:
   - If all trip members vote `yes`, the plan is confirmed immediately without waiting for the 10-minute timer.

3. **10-Minute Auto-Confirmation**:
   - If 10 minutes elapse with zero `no` votes, the compromise plan is automatically locked into the itinerary.

4. **Automatic Parallel Branching**:
   - If members explicitly refuse to compromise (e.g., *"no compromise, going to gym"*, *"i don't want to change my plan, ill go to the beach"*), or after reaching the soft round cap ($\ge 3$), the AI splits the slot into parallel tracks and auto-finalizes solo branches (`auto_finalized: true`).

5. **Complete Audit Timeline & History Tracking**:
   - Full tracking of `proposal_id`, `parent_proposal_id`, `created_at`, `resolved_at`, and all votes with `cast_at`.
   - Exposed via `GET /api/slots/{itm_id}/history` for UI timeline rendering.

6. **Multi-Provider Real-World LLM Integration**:
   - Powered by Groq (`openai/gpt-oss-120b`), OpenAI (`gpt-4o-mini`), or Google Gemini.
   - Comprehensive offline semantic fallback ensuring 100% test reliability even without internet.

---

## 🛠️ Project Structure

```
AIConsensus/
├── backend/
│   ├── ai/
│   │   ├── core/
│   │   │   ├── blended_plan_generator.py      # Real-life compromise synthesis
│   │   │   ├── branch_grouping.py             # Multi-way parallel branch clustering
│   │   │   ├── branch_trigger_classifier.py   # FIXABLE_TWEAK vs FIXED_REQUIREMENT
│   │   │   └── hard_constraint_validator.py   # Strict schema and constraint validation
│   │   ├── llm/
│   │   │   ├── client.py                      # Multi-provider LLM client (Groq/OpenAI/Gemini)
│   │   │   └── prompts.py                     # Real-world system prompts
│   │   ├── modes/
│   │   │   └── mode_na_orchestrator.py        # Mode NA round orchestrator
│   │   └── tests/
│   │       └── test_mode_na_consensus.py      # Automated test suite (8 tests)
│   ├── services/
│   │   └── mode_na_service.py                 # Consensus state machine & timer manager
│   ├── app/
│   │   └── main.py                            # FastAPI server with interactive Swagger UI
│   ├── demo_advanced_consensus.py             # 5-member simulation demo
│   └── demo_mode_na.py                        # Single-round demo script
├── docs/                                      # Full system specifications & TRD
├── pyproject.toml
└── .env.example
```

---

## 🏁 Quickstart

### 1. Install Dependencies
```bash
pip install fastapi uvicorn pydantic pytest requests
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` and set your Groq or OpenAI API key:
```bash
GROQ_API_KEY=gsk_...
```

### 3. Run Interactive Swagger UI
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **`http://127.0.0.1:8000/docs`** to test all consensus flows interactively.

### 4. Run Automated Test Suite
```bash
python -m pytest backend/ai/tests/test_mode_na_consensus.py -v
```
