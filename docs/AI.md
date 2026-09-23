# AI Documentation: Consensus Engine, Solo Matchmakers, & Face Recognition

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. AI Feature Matrix & Specification Table

| Feature Name | Function & Purpose | Grounding Data (Fields & Tables) | Correctness Verification Strategy |
| :--- | :--- | :--- | :--- |
| **1. Blended Common-Ground Plan Generator** | Analyzes objections and generates **exactly ONE** compromise activity plan attempting to reconcile typed suggestions inside the existing activity slot before any branching is initiated. | Active proposal (`prp_.title`, `rationale`, `entity_type`/`entity_id`, `cost_delta`), current round typed `no` comments (`vot_.comment`), and hard constraints (time, location, transport). | Validated against hard constraints prior to client delivery. Verified via scripted disagreement scenarios comparing generated outputs to known-good benchmarks. |
| **2. Branch-Trigger Classifier** | Evaluates typed comments within a consensus cycle to classify objections into "fixable tweaks" (suitable for blending) vs "genuinely fixed incompatible requirements" (triggering early branching). | Current and prior round active `no` vote typed comments (`vot_.comment`) within the current consensus cycle for that slot. | Evaluated against a labelled benchmark test set containing fixable tweak scenarios vs fixed requirement scenarios (e.g. injury, severe phobia, conflicting non-negotiable locations). |
| **3. Multi-Way Branch Grouping** | Clusters holdouts into $N$ parallel branches (uncapped), merges near-duplicate preferences, auto-resolves single-member branches, and recurses into internally divided branches via `parent_branch_id`. | Holdout members' typed suggestions (`vot_.comment`), `proposals.itm_id`, and `branches.parent_branch_id` self-references. | Tested against 3-way, 4-way, and overlapping-preference test scenarios to confirm correct clustering, single-member auto-resolution (`status='FINALIZED'`), and recursive tree resolution. |
| **4. Solo-to-Group Compatibility Scorer** | Computes a **deterministic, 100% explainable** compatibility score (0-100%) matching solo travelers to compatible group trips. (Not a generative LLM call). | `users.age_group`, `user_preferences.languages` (BCP-47), `user_preferences.interests`, and `trips.start_date`/`end_date`. | Tested against fixed synthetic user profiles with known-good mathematical match rankings. |
| **5. Solo-to-Guide Compatibility Scorer** | Computes a **deterministic, 100% explainable** compatibility score (0-100%) matching solo travelers to local tour guides. (Not a generative LLM call). | Traveler `user_preferences.languages` & `interests`, compared against `tour_guides.languages`, `specializations`, `price_per_day`, and `rating`. | Evaluated against fixed guide test sets to verify ranking precision without generative variance. |
| **6. DeepFace/ArcFace Face Recognition (OPTIONAL)** | Detects faces in uploaded trip photos, compares embeddings against registered members of **that specific trip**, and tags matches exceeding confidence threshold. | Registered reference embeddings (`face_profiles.embedding_data`), `photos.photo_url`, and trip membership (`trip_members.usr_id`). | Verified via confidence thresholding on fixed demo photo batches. Low-confidence matches (`< 0.900`) remain `"Unknown"`, preventing incorrect force-tagging. |

---

## 2. The Universal Zero-Followup Design Principle

> [!IMPORTANT]
> **Deliberate Design Principle**: Across all AI components in WanderMatch, **no AI feature ever asks a group member follow-up questions or initiates conversational back-and-forth**. 

When a traveler casts a `no` vote, the AI reads the typed comment string **exactly as submitted**. It does not prompt the user for clarification, ask for budget breakdowns, or engage in chat polling. 

This is a **deliberate product design decision**, not a technical limitation:
1. **Prevents Decision Paralysis**: Travel planning stalls when AI assistants introduce endless conversational sub-threads.
2. **Respects User Input**: Users express their objections in their own words once; the AI respects that input as authoritative data for blending or branching.
3. **Ensures Fast Execution**: Asynchronous API reconciliation completes rapidly without waiting for iterative user prompts during a live trip consensus window.

---

## 3. Scope & Out-of-Scope Disclaimer

> [!NOTE]
> **Scope Disclaimer**: This document intentionally focuses on feature specifications, grounding data contracts, deterministic scoring algorithms, and correctness verification strategies. 

By explicit team decision, the following topics are **OUT OF SCOPE** for this documentation:
- Specific LLM prompt engineering wording details or system message templates.
- Deep AI model training, fine-tuning parameter weights, or hyperparameter optimization details.
- Self-hosted model serving infrastructure (WanderMatch uses a hosted LLM API for demo-day reliability).
