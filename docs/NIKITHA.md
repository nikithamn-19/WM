# NIKITHA.md — Frontend Track Owner
## WanderMatch · KogniVera Hackathon 2026 · PS-11

---

## HOW TO USE THIS DOC (Read this first, give it to your agent verbatim)

> "I am Nikitha M N, Frontend developer for WanderMatch at KogniVera Hackathon 2026. Read this entire document carefully. It contains my full project context, my exact responsibilities, the complete naming contract, every screen I must build, every API I must call, every component I must create, and my phase-by-phase execution plan. After reading, give me a detailed prompt to execute Phase [X] of my work. Do not assume anything not written here. Do not invent field names, endpoint paths, or component behavior. Everything is specified."

---

## 1. WHAT WANDERMATCH IS — FULL CONTEXT

WanderMatch is a social group travel planning web app. It solves a real problem: when a group of friends plan a trip together, disagreements get either steamrolled or lost in chat. WanderMatch gives every group member a structured way to propose activities, vote on them, and have their objections heard — while an AI layer reads the typed reasons behind objections and generates compromise plans or, when preferences are truly incompatible, parallel branches.

### The core user flow:
1. A trip owner creates a group trip with destination, dates, mode (Mode A or Mode NA)
2. Members join the trip and see a shared live itinerary (the "Route Line")
3. Members propose activities for time slots (Morning/Afternoon/Evening/Night)
4. Members vote YES or NO on proposals — NO votes REQUIRE a typed reason/suggestion
5. The AI reads typed NO reasons and generates ONE blended compromise plan
6. If compromise fails after ~3 rounds, the group splits into parallel branches (one per distinct preference)
7. Single-member branches auto-resolve; multi-member branches re-run the full consensus flow recursively
8. Trip Chat (always-on) allows unanimous override of the AI at any point
9. Solo travelers can find compatible group trips or tour guides via deterministic scoring

### Two trip modes:
- **Mode A (Admin-Led)**: Trip owner has final authority. AI recommends, admin decides. Round cap is advisory. Admin can extend rounds, force branches, or accept proposals directly at any time.
- **Mode NA (Collaborative)**: Fully automatic. First NO vote starts a 10-minute response timer. After ~3 rounds unresolved, AI auto-branches. No admin override — purely democratic.

### Actor rules (CRITICAL for UI gating — implement exactly this):

| Actor | Sees | Can Do | Cannot Do |
|---|---|---|---|
| All trip members (any mode) | Full itinerary + every slot's status; every proposal ever submitted with live vote tallies; every NO-reason attributed to the voter; complete revision history per slot; all branches and their assigned members/plans (even branches they're not part of); Trip Chat | Vote YES on one proposal per slot; vote NO with typed reason on any proposal; submit new proposals; respond to a branch preview if they're a branch member | See another member's private face-registration data; edit or retract someone else's vote; force a slot to confirm without going through vote/window rules |
| Admin (Mode A only) | Everything above PLUS the AI recommendation panel with explicit controls once AI is invoked | Build/edit the base itinerary; invoke AI consensus; approve, reject, or override any AI recommendation; force branching early; extend rounds past the soft cap; accept a proposal directly at any time | N/A — there is one admin per trip in this mode |
| AI system | Current round's active proposals, full vote distribution, every stated reason (current and prior rounds within the current consensus cycle), and hard-constraint data (location, timing, transport feasibility) | Generate exactly one common-ground candidate per round; classify a NO-reason as fixable vs. genuinely incompatible; group holdouts into branches by stored preference; validate its own generated plan against hard constraints before it is shown to anyone | Invent a plan that violates a hard constraint; make a binding decision in Mode A (it only recommends there); resume common-ground attempts on a slot after it has already switched that slot to branching, within the same cycle |
| Non-voter / silent member (either mode) | Identical visibility to any other member — nothing is hidden from members just because they haven't voted | Vote or object at any later point, in any future round, on any slot | Be treated as a blocker to the group's progress; be auto-moved into a branch or a new plan without taking an action themselves |

---

## 2. TECH STACK — EXACTLY WHAT YOU USE

- **Framework**: React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (utility classes only — no custom CSS files unless absolutely necessary)
- **Build tool**: Vite
- **Auth SDK**: Clerk React SDK (`@clerk/clerk-react`) — for `<ClerkProvider>`, `useUser()`, `useAuth()`, sign-in/sign-up components
- **State**: React Context + `useState`/`useReducer` — no Redux, no Zustand unless you add it yourself
- **WebSocket**: Native browser `WebSocket` API, managed inside a `TripContext`
- **HTTP**: Native `fetch` API with `async/await` — no axios
- **Deployment**: Vercel (static build from Vite)

You DO NOT touch:
- PostgreSQL directly (ever)
- FastAPI code (ever)
- `/backend/` directory (ever)
- `/infra/` directory (ever)
- `/backend/ai/` directory (ever)

---

## 3. LOCKED VISUAL SYSTEM — IMPLEMENT EXACTLY, NO DEVIATIONS

### 3.1 Color Palette (use these exact hex values everywhere)
```
Paper     #F7F5F0   → Canvas & main background (warm tactile paper tone)
Ink       #14213D   → Primary headings & high-contrast text
Route     #2F6F6B   → Brand color, primary buttons, active states, In-Consensus
Route Dark #204B48  → Button hover & pressed states
Amber     #E1A93A   → CONFIRMED state ONLY (warm gold transit line)
Clay      #C1502E   → BRANCHED/conflict state ONLY (terracotta, never decorative)
Slate     #6B7280   → Secondary text, labels, subtitles, EMPTY state
Slate Light #E4E1DA → Borders, dividers, card outlines
Card      #FFFFFF   → Surface backgrounds (clean white paper cards)
```

### 3.2 Typography
```
Headings & Trip Titles  → font: 'Fraunces' (editorial serif)
UI Labels & Body Text   → font: 'Inter' (clean sans-serif)
Data/Times/Counts/%     → font: 'IBM Plex Mono' (structured transit font)
```
Load all three from Google Fonts in `index.html`.

### 3.3 Geometry
```
Cards & Buttons    → border-radius: 10px  (Tailwind: rounded-[10px])
Input Fields       → border-radius: 8px   (Tailwind: rounded-[8px])
Shadows            → box-shadow: 0 1px 3px rgba(20, 33, 61, 0.04) — NO heavy shadows, NO glass blur
```

### 3.4 The Signature Route Line (CRITICAL VISUAL ELEMENT)
The Route Line is a vertical dashed sequence line connecting itinerary time slots. It is the visual centerpiece of Trip Home, Trip Preview, and Resolved Itinerary screens.

```
Default/Pending slot    → dashed, Slate Light #E4E1DA
CONFIRMED slot          → solid, Amber #E1A93A
BRANCHED slot           → forks into parallel lines, Clay #C1502E
IN_CONSENSUS slot       → dashed, Route #2F6F6B
```

### 3.5 Slot Status → Color mapping (1:1, never deviate)
```
EMPTY        → Slate  #6B7280
IN_CONSENSUS → Route  #2F6F6B
BRANCHED     → Clay   #C1502E
CONFIRMED    → Amber  #E1A93A
```

These four statuses come from the backend `itinerary_items` + WanderMatch's slot_status extension. Display the status pill, the Route Line segment color, and status icons all using this exact mapping.

---

## 4. NAMING CONTRACT — READ BEFORE WRITING ANY CODE

This is the most important section for preventing integration bugs.

### 4.1 What comes FROM the backend (API responses)
All FastAPI responses are `camelCase`. Your TypeScript types must match exactly:

```typescript
// From PS-11 provided tables (these field names come from the DB but are camelCased in API)
trpId          // trips.trip_id
itmId          // itinerary_items.item_id
prpId          // proposals.proposal_id
votId          // votes.vote_id
usrId          // users.user_id
itnId          // itineraries.itinerary_id
tmbId          // trip_members.member_id
gidId          // tour_guides.guide_id

// Field names (camelCase versions of snake_case DB fields)
ownerId        // trips.owner_user_id
destinationCityId  // trips.destination_city_id
startDate      // trips.start_date
endDate        // trips.end_date
isGroupTrip    // trips.is_group_trip
costDelta      // proposals.cost_delta
closesAt       // proposals.closes_at
proposedByUserId // proposals.proposed_by_user_id
entityType     // proposals.entity_type / itinerary_items.entity_type
entityId       // proposals.entity_id / itinerary_items.entity_id
dayIndex       // itinerary_items.day_index
sortOrder      // itinerary_items.sort_order
startsAt       // itinerary_items.starts_at
endsAt         // itinerary_items.ends_at
preferredLanguages // user_preferences.preferred_languages
```

### 4.2 WanderMatch additive fields (also camelCase in API)
```typescript
slotStatus     // WanderMatch's 4-value slot status (EMPTY/IN_CONSENSUS/BRANCHED/CONFIRMED)
currentRound   // which round of consensus we're in
brcId          // branches.brc_id
bmcId          // branch_members.bmb_id
msgId          // trip_chat_messages.msg_id
fcpId          // face_profiles.fcp_id
phoId          // photos.pho_id
compatibilityScore  // solo matchmaker output (0-100 integer)
```

### 4.3 Money — NEVER use a JavaScript number for money
```typescript
// Money comes from the API as a STRING. Keep it as string for display.
// Use a decimal library (decimal.js) only if you need arithmetic for display purposes.
// Example: cost_delta comes as "15.00" not 15.00
cost: string        // e.g. "65.00"
costDelta: string   // e.g. "15.00" or "-5.00"
currency: string    // ISO-4217 e.g. "USD" "INR" "EUR"
```

### 4.4 WebSocket event names (verb-first camelCase — exact list, no others)
```
voteCast
proposalCreated
branchConfirmed
slotStatusChanged
aiPlanGenerated
```

### 4.5 Enums you display (exact values from enums.json)
```typescript
// Slot status (WanderMatch additive — these are NOT in enums.json but are canonical)
type SlotStatus = 'EMPTY' | 'IN_CONSENSUS' | 'BRANCHED' | 'CONFIRMED'

// Vote value (from enums.json — WanderMatch only writes yes/no, never abstain)
type VoteValue = 'yes' | 'no'

// Member role (from enums.json)
type MemberRole = 'owner' | 'editor' | 'viewer'

// Trip mode (WanderMatch additive)
type TripMode = 'Mode A' | 'Mode NA'

// Proposal status (from enums.json)
type ProposalStatus = 'open' | 'accepted' | 'rejected' | 'expired'

// Branch status (WanderMatch additive)
type BranchStatus = 'OPEN' | 'FINALIZED'
```

---

## 5. DIRECTORY STRUCTURE — WHAT YOU OWN

```
frontend/
  src/
    components/          ← YOU OWN ALL OF THIS
      ui/                ← Reusable primitives (Button, Input, StatusPill, etc.)
      layout/            ← TopNav, PageWrapper, etc.
      itinerary/         ← SlotCard, ProposalCard, VotePill, BranchTabs, RouteLine
      chat/              ← ChatDrawer, ChatMessage, ChatProposeButton
      solo/              ← CompatibilityCard, GuideCard, MatchList
      face/              ← FaceRegistration, FaceCapture
    screens/             ← YOU OWN ALL OF THIS
      SignUpScreen.tsx
      LoginScreen.tsx
      MyTripsScreen.tsx
      CreateTripScreen.tsx
      TripPreviewScreen.tsx
      TripHomeScreen.tsx
      ProposeActivityModal.tsx
      VoteModal.tsx
      ConflictResolutionPanel.tsx
      BranchViewScreen.tsx
      ResolvedItineraryScreen.tsx
      AuditHistoryScreen.tsx
      SoloMatchScreen.tsx
    context/             ← YOU OWN THIS
      TripContext.tsx     ← WebSocket listener + trip state
      AuthContext.tsx     ← Clerk user wrapper
    hooks/               ← YOU OWN THIS
      useTrip.ts
      useProposals.ts
      useVotes.ts
      useSoloMatch.ts
    types/               ← YOU OWN THIS
      trip.ts
      proposal.ts
      vote.ts
      branch.ts
      user.ts
      solo.ts
    lib/
      api.ts             ← All fetch calls to FastAPI (YOU OWN THIS)
      websocket.ts       ← WebSocket connection manager (YOU OWN THIS)
    App.tsx
    main.tsx
    index.css            ← Tailwind directives only
  index.html             ← Google Fonts import here
  tailwind.config.ts     ← Custom colors defined here
  vite.config.ts
```

You NEVER touch anything outside `frontend/`.

---

## 6. TAILWIND CONFIG — SET THIS UP FIRST

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        ink: '#14213D',
        route: '#2F6F6B',
        'route-dark': '#204B48',
        amber: '#E1A93A',
        clay: '#C1502E',
        slate: '#6B7280',
        'slate-light': '#E4E1DA',
        card: '#FFFFFF',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

## 7. TYPESCRIPT TYPES — DEFINE THESE BEFORE ANY COMPONENT

```typescript
// types/user.ts
export interface User {
  usrId: string
  displayName: string
  email: string
  homeCityId: string
  locale: string
  budgetBand: string
  travelStyle: string
  travellerType: string
}

export interface UserPreferences {
  preferenceId: string
  usrId: string
  preferredLanguages: string[]  // BCP-47 tags e.g. ['en', 'hi']
  interests: string[]           // e.g. ['heritage', 'food']
  pace: string
  maxDailyBudget: string | null // money as string
  preferredCurrency: string
}

// types/trip.ts
export interface Trip {
  trpId: string
  ownerId: string
  title: string
  destinationCityId: string
  startDate: string    // YYYY-MM-DD (no timezone)
  endDate: string      // YYYY-MM-DD (no timezone)
  partySize: number
  mode: 'Mode A' | 'Mode NA'
  status: string
  homeCurrency: string
  members: TripMember[]
  itinerary?: Itinerary
}

export interface TripMember {
  tmbId: string
  trpId: string
  usrId: string
  displayName: string
  role: 'owner' | 'editor' | 'viewer'
  joinedAt: string
}

// types/itinerary.ts
export interface Itinerary {
  itnId: string
  trpId: string
  version: number     // CRITICAL: always send this back on mutations
  isActive: boolean
  totalCost: string   // money as string
  currency: string
  items: ItineraryItem[]
}

export interface ItineraryItem {
  itmId: string
  itnId: string
  dayIndex: number
  sortOrder: number
  startsAt: string | null
  endsAt: string | null
  itemType: string
  entityType: string | null
  entityId: string | null
  title: string
  cost: string        // money as string e.g. "65.00"
  currency: string
  slotStatus: 'EMPTY' | 'IN_CONSENSUS' | 'BRANCHED' | 'CONFIRMED'
  locked: boolean
  status: string
  activeProposal?: Proposal
}

// types/proposal.ts
export interface Proposal {
  prpId: string
  itnId: string
  proposedByUserId: string
  proposedByDisplayName: string
  action: string
  entityType: string | null
  entityId: string | null
  title: string
  rationale: string   // NOT description — this field is called rationale
  costDelta: string   // money as string, NOT estimated_cost
  currency: string
  closesAt: string | null  // null until first NO vote in Mode NA
  status: 'open' | 'accepted' | 'rejected' | 'expired'
  currentRound: number
  votes: Vote[]
}

// types/vote.ts
export interface Vote {
  votId: string
  prpId: string
  usrId: string
  displayName: string
  value: 'yes' | 'no'   // WanderMatch never writes 'abstain'
  comment: string | null // REQUIRED when value === 'no', null when value === 'yes'
  castAt: string
}

// types/branch.ts
export interface Branch {
  brcId: string
  itmId: string
  parentBranchId: string | null  // null for top-level branches
  title: string
  rationale: string
  entityType: string | null
  entityId: string | null
  costDelta: string   // money as string
  status: 'OPEN' | 'FINALIZED'
  members: BranchMember[]
}

export interface BranchMember {
  bmcId: string
  brcId: string
  usrId: string
  displayName: string
}

// types/solo.ts
export interface GroupMatch {
  trip: Trip
  compatibilityScore: number   // integer 0-100
  ageGroupMatch: boolean
  sharedLanguages: string[]    // BCP-47 tags
  sharedInterests: string[]
  dateOverlapDays: number
}

export interface GuideMatch {
  guide: TourGuide
  compatibilityScore: number   // integer 0-100
  sharedLanguages: string[]
  sharedSpecialisations: string[]
}

export interface TourGuide {
  gidId: string
  cityId: string
  displayName: string
  languages: string[]
  specialisation: string
  dayRate: string      // money as string
  halfDayRate: string  // money as string
  currency: string
  rating: number | null
  reviewCount: number
  certified: boolean
  bio: string
}
```

---

## 8. API CALLS — COMPLETE LIST OF ENDPOINTS YOU CALL

All calls go to `import.meta.env.VITE_API_BASE_URL`. Never hardcode the URL.

```typescript
// lib/api.ts

const BASE = import.meta.env.VITE_API_BASE_URL

// Auth header helper — get JWT from Clerk
async function authHeaders(getToken: () => Promise<string | null>) {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// TRIPS
// GET /api/trips — get all trips for current user
// GET /api/trips/{trpId} — get single trip with itinerary + members + proposals
// POST /api/trips — create new trip
// POST /api/trips/{trpId}/members — invite a member

// PROPOSALS
// POST /api/proposals — create proposal
//   Body: { itmId, trpId, rationale, costDelta, currency, entityType, entityId, title }
//   Note: field is 'rationale' NOT 'description', 'costDelta' NOT 'estimatedCost'

// VOTES
// POST /api/votes — cast a vote
//   Body: { prpId, usrId, value: 'yes'|'no', comment: string|null }
//   Rule: comment is REQUIRED (non-empty string) when value === 'no'
//   Rule: comment must be null or omitted when value === 'yes'
//   Rule: casting yes on a new proposal auto-retracts your yes on another proposal for same itmId

// CONSENSUS
// POST /api/consensus/reconcile — trigger AI blended plan or branching
//   Body: { prpId }
//   Response either: { action: 'BLENDED', blendedPlan: {...}, currentRound: number }
//   Or:              { action: 'BRANCHED', branches: Branch[] }

// BRANCHES
// GET /api/branches/{itmId} — get all branches for a slot
// POST /api/branches/{brcId}/confirm — confirm branch as member
// POST /api/branches/{brcId}/modify — request modification on branch

// TRIP CHAT
// GET /api/chat/{trpId} — get chat messages for trip
// POST /api/chat — send a chat message
//   Body: { trpId, usrId, content }
// POST /api/chat/{msgId}/propose — click "Propose this as the plan" button
//   Logic: if unanimous yes → slot becomes CONFIRMED, AI loop terminates

// SOLO MATCHING
// POST /api/solo-matching/groups — match solo user to group trips
//   Body: { usrId }
//   Response: GroupMatch[]
// POST /api/solo-matching/guides — match solo user to guides
//   Body: { usrId, city: string, maxBudget: string }
//   Response: GuideMatch[]

// FACE (OPTIONAL)
// POST /api/face/register — register face (multipart, 3 photos)
// GET /api/photos/{trpId} — get trip photo gallery
//   Query: ?usrId=usr_xxx for "My Photos" filtered view
```

---

## 9. WEBSOCKET — HOW TO CONNECT AND HANDLE EVENTS

```typescript
// context/TripContext.tsx

// Connect to: ws://{WS_BASE_URL}/ws/trips/{trpId}/{usrId}
// where WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL

// Events you receive (all camelCase, verb-first):
// voteCast         → { type: 'voteCast', trpId, prpId, usrId, value, comment }
// proposalCreated  → { type: 'proposalCreated', trpId, proposal: Proposal }
// branchConfirmed  → { type: 'branchConfirmed', trpId, brcId, usrId }
// slotStatusChanged → { type: 'slotStatusChanged', trpId, itmId, slotStatus: SlotStatus }
// aiPlanGenerated  → { type: 'aiPlanGenerated', trpId, itmId, blendedPlan | branches }

// ON RECONNECT: always re-fetch GET /api/trips/{trpId} to sync state
// because WebSocket may have dropped events while disconnected
```

---

## 10. GLOBAL COMPONENT LIBRARY — BUILD THESE FIRST

Before any screen, build these reusable components:

### 10.1 Primary Button
```tsx
// bg-route text-paper rounded-[10px] font-sans font-medium px-4 py-2
// hover: bg-route-dark
// focus-visible: ring-2 ring-route
// min height/width: 44px (mobile touch target)
```

### 10.2 Secondary Button
```tsx
// bg-paper text-ink border border-slate-light rounded-[10px] font-sans font-medium px-4 py-2
// hover: bg-slate-light/30
// focus-visible: ring-2 ring-route
```

### 10.3 Input Field
```tsx
// bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-sm text-ink
// focus: border-route outline-none
// placeholder: text-slate
```

### 10.4 Status Pill
```tsx
// Props: status: SlotStatus
// EMPTY        → bg-slate/10 text-slate
// IN_CONSENSUS → bg-route/10 text-route
// BRANCHED     → bg-clay/10 text-clay
// CONFIRMED    → bg-amber/10 text-amber
// Always pairs color with text label AND icon (never color alone)
// Icons: EMPTY→Circle, IN_CONSENSUS→Vote, BRANCHED→GitFork, CONFIRMED→CheckCircle
```

### 10.5 Vote Pill (interactive)
```tsx
// YES button: bg-route text-paper rounded-[10px]
// NO button:  bg-clay text-paper rounded-[10px]
// When NO is selected: show mandatory comment textarea below
// Submit is BLOCKED if NO and comment is empty/whitespace
// Show error: "A 'no' vote requires a typed reason or suggestion"
```

### 10.6 Suggestion Chip
```tsx
// Compact tag showing typed NO comment / suggestion
// bg-paper border border-slate-light rounded-full px-3 py-1 text-xs text-ink font-mono
```

### 10.7 Toast Notification
```tsx
// Slide-in from top-right
// Triggered by WebSocket events: voteCast, slotStatusChanged, proposalCreated
// Shows for 4 seconds then auto-dismisses
// bg-card border border-slate-light rounded-[10px] shadow-sm
```

### 10.8 Modal Window
```tsx
// Centered overlay, backdrop: bg-ink/40
// Card: bg-card rounded-[10px] p-6 max-w-lg w-full
// Always has explicit close button (X) top-right
```

### 10.9 Empty State Block
```tsx
// Centered, bg-paper, font-mono subtitle, calm message, single primary CTA button
```

### 10.10 Top Nav Bar
```tsx
// Persistent header across all authenticated screens
// Contains: WanderMatch logo (font-serif), section tabs, Mode pill, 
//           live presence avatars, Trip Chat toggle button, profile dropdown
// Mode pill: "Mode A (Admin)" in route color | "Mode NA (Collab)" in slate color
```

---

## 11. SCREENS — COMPLETE SPECIFICATION

### Screen 1: Sign Up Screen
**Route**: `/sign-up`
**Purpose**: Clerk auth + collect travel preferences + optional face registration

**Layout**: Centered paper card, 3 steps:
- Step 1: Clerk `<SignUp />` component
- Step 2: Preference chips — age group selector, BCP-47 language multi-select, interests multi-select (use enums: heritage, food, trekking, wildlife, photography, religious, shopping, accessibility from guide_specialisation + poi_category)
- Step 3: Optional face capture (3 photos: Straight, Left Tilt, Right Tilt) with prominent "Skip for now" button

**States**: Default | Loading | Error ("Face quality check failed: exactly one face required per photo")

**Dummy data for Phase 1** (use this until backend is ready):
```typescript
const dummyNewUser = {
  usrId: 'usr_new_01',
  email: 'user@example.com',
  displayName: 'Jordan Lee',
  preferredLanguages: ['en', 'es'],
  interests: ['heritage', 'food', 'trekking'],
  faceRegistered: false,
}
```

---

### Screen 2: Log In Screen
**Route**: `/sign-in`
**Purpose**: Authenticate existing user

**Layout**: Clean paper card, WanderMatch logo (font-serif), Clerk `<SignIn />` component
**No dummy data needed** — Clerk handles everything

---

### Screen 3: My Trips Screen
**Route**: `/trips`
**Purpose**: Show all trips the user belongs to

**Layout**: Grid of trip cards (2-col desktop, 1-col mobile)

**Each trip card shows**:
- Destination city name + country
- Date range (font-mono)
- Mode pill: "Mode A" | "Mode NA"
- Role badge: "Owner" | "Editor" | "Viewer"
- Trip status
- Route Line thumbnail (small visual preview)

**Data source**: `GET /api/trips` (after Checkpoint 1) or dummy data (Phase 1)

**Dummy data for Phase 1**:
```typescript
const dummyTrips = [
  {
    trpId: 'trp_bali_2026',
    title: 'Bali Tropical Escape & Cultural Journey',
    destinationCityId: 'cty_bali',
    destinationCityName: 'Bali',
    startDate: '2026-10-10',
    endDate: '2026-10-16',
    mode: 'Mode A',
    ownerId: 'usr_nikitha',
    role: 'owner',
    status: 'planning',
  },
  {
    trpId: 'trp_kerala_2026',
    title: 'Kerala Backwaters & Spice Trail',
    destinationCityId: 'cty_kochi',
    destinationCityName: 'Kochi',
    startDate: '2026-11-01',
    endDate: '2026-11-07',
    mode: 'Mode NA',
    ownerId: 'usr_panchami',
    role: 'editor',
    status: 'planning',
  },
]
```

---

### Screen 4: Create Trip Screen
**Route**: `/trips/new`
**Purpose**: Create a new group trip

**Layout**: Centered form card
**Fields**:
- Trip title (text input)
- Destination city (text input — will resolve to city_id via backend)
- Start date (date picker)
- End date (date picker)
- Party size (number input)
- Trip mode selector: "Mode A (Admin-Led)" | "Mode NA (Collaborative)"
- Notes (optional textarea)

**On submit**: `POST /api/trips` → redirect to `TripHomeScreen`

**Validation**: End date must be after start date. All fields except notes are required.

---

### Screen 5: Trip Preview Screen
**Route**: `/trips/:trpId/preview`
**Purpose**: Read-only landing for invited members before joining

**Layout**:
- Hero banner: destination city, dates, mode pill, member count
- Read-only Route Line timeline (all slots shown as EMPTY, dashed Slate Light)
- "Join Trip" primary button → calls `POST /api/trips/:trpId/members`
- "View Full Itinerary" (disabled until joined)

---

### Screen 6: Trip Home Screen (MOST COMPLEX SCREEN)
**Route**: `/trips/:trpId`
**Purpose**: Main workspace for group itinerary collaboration

**Layout (Desktop ≥ 768px)**:
- Left/Center: Itinerary Timeline with Route Line (max-w-4xl)
- Right: Collapsible Trip Chat rail (w-80 or w-96)

**Layout (Mobile < 768px)**:
- Single column, full-width slot cards
- Trip Chat as full-screen drawer overlay
- Primary action buttons anchored at bottom (sticky bottom-0)

**Top section**:
- Hero banner: trip title (font-serif), destination, date range (font-mono), mode pill
- Live presence bar: avatar stack of currently online members (pulled from WebSocket connections)
- "Add Activity" button (only for owner/editor role)

**The Route Line timeline**:
- Vertical dashed line connecting Morning → Afternoon → Evening → Night slots for each day
- Each slot is an `ItinerarySlotCard` component
- Line color changes based on slot status (see section 3.4)
- BRANCHED slots fork into parallel Clay lines

**ItinerarySlotCard shows**:
- Time badge (Morning/Afternoon/Evening/Night) in font-mono
- Activity title
- Entity type (city/POI) + cost (font-mono, money as string)
- Status pill (EMPTY/IN_CONSENSUS/BRANCHED/CONFIRMED with color + icon + text)
- Live vote tally: "3 YES / 1 NO" (font-mono)
- "Vote / Review" button → opens VoteModal
- If CONFIRMED: Amber background highlight
- If BRANCHED: Clay left border, "View Branches" button

**Real-time updates**:
- Subscribe to WebSocket on mount
- On `voteCast`: update vote tally on affected proposal
- On `proposalCreated`: add new proposal to relevant slot
- On `slotStatusChanged`: update slot status + Route Line color
- On `aiPlanGenerated`: show AI Concierge Panel + toast notification
- On reconnect: always re-fetch `GET /api/trips/:trpId` first

**Mode A admin controls** (only show if current user is trip owner AND mode is 'Mode A'):
- "Invoke AI" button per slot
- "Accept Blended Plan" button
- "Force Branch Now" button
- "Extend Round" button
These appear in the AI Concierge Panel only after AI has been invoked.

**Dummy data for Phase 1**:
```typescript
const dummyTripHome = {
  trpId: 'trp_bali_2026',
  title: 'Bali Tropical Escape',
  mode: 'Mode A',
  version: 3,
  items: [
    {
      itmId: 'itm_b1',
      dayIndex: 1,
      sortOrder: 1,
      title: 'Sacred Monkey Forest',
      slotStatus: 'CONFIRMED',
      cost: '25.00',
      currency: 'USD',
      entityType: 'poi',
      entityId: 'poi_monkey_forest',
    },
    {
      itmId: 'itm_b2',
      dayIndex: 1,
      sortOrder: 2,
      title: 'Mount Batur Trek',
      slotStatus: 'IN_CONSENSUS',
      cost: '65.00',
      currency: 'USD',
      entityType: 'poi',
      entityId: 'poi_batur',
    },
    {
      itmId: 'itm_b3',
      dayIndex: 1,
      sortOrder: 3,
      title: 'Evening Activity',
      slotStatus: 'EMPTY',
      cost: '0.00',
      currency: 'USD',
      entityType: null,
      entityId: null,
    },
  ],
}
```

---

### Screen 7: Propose Activity Modal
**Route**: Modal on top of `/trips/:trpId`
**Purpose**: Submit a new activity proposal for a slot

**Layout**: Modal with form:
- Title (text input, required)
- Rationale (textarea, required) — label it "Rationale" NOT "Description"
- Entity type selector: hotel | flight | poi | package | guide | transfer | meal | free
- Entity ID (text input) — label "Entity ID (e.g. poi_batur_01)"
- Cost delta (number input, labeled "Cost Change ($)") + currency selector
- Submit button

**On submit**: `POST /api/proposals`
```typescript
// Request body shape:
{
  itmId: string,
  trpId: string,
  title: string,
  rationale: string,      // NOT description
  entityType: string,
  entityId: string,
  costDelta: string,      // Send as string e.g. "15.00", NOT a number
  currency: string,
}
```

**Important**: If backend returns `{ status: 'QUEUED' }`, show message: "Your proposal has been queued for the next round — the current voting window is still open." Do NOT treat this as an error.

---

### Screen 8: Vote Modal (Slot Detail Modal)
**Route**: Modal on top of `/trips/:trpId`
**Purpose**: Review active proposal and cast vote

**Layout** (top to bottom):
1. Proposal details: title, rationale, creator name, cost delta (font-mono), entity info
2. Group vote tally: "X YES / Y NO / Z haven't voted" with avatar breakdown
3. All NO vote comments shown as Suggestion Chips (visible to everyone per actor rules)
4. If in Mode A + current user is admin: AI recommendation panel with admin control buttons
5. Vote form at bottom:
   - Vote Pill: YES (Route green) | NO (Clay red)
   - If NO selected: mandatory comment textarea appears
   - Submit button (disabled if NO and no comment)
   - Error message if NO submitted without comment: "A 'no' vote requires a typed reason or suggestion"

**Timer display** (Mode NA only):
- If `closesAt` is not null: show countdown timer in font-mono
- Format: "Voting closes in MM:SS"
- When timer reaches 0: show "Voting window closed — awaiting AI reconciliation"

**Non-voter rule**: If current user hasn't voted, show "You haven't voted yet" — they can always vote even if others have.

---

### Screen 9: Conflict Resolution / AI Concierge Panel
**Route**: Panel inside `/trips/:trpId` (not a modal, an inline panel)
**Purpose**: Show AI blended plan and admin controls

**Layout** (shown when `aiPlanGenerated` WebSocket event fires or slot is IN_CONSENSUS with AI result):
- Panel title: "AI Consensus Suggestion — Round [N]"
- Original proposal card (left/top)
- Blended plan card (right/bottom) with Route green highlight
- Blended plan shows: title, rationale, entity info, cost delta, explanation of what was blended
- Hard constraint status: "✓ All constraints satisfied" OR "⚠ Regenerated once"
- Round indicator: "Round 2 of ~3" in font-mono

**Mode A admin controls** (only visible to trip owner in Mode A):
- "Accept Blended Plan" → Primary Button
- "Force Branch Now" → Secondary Button (Clay border)
- "Extend Round" → Secondary Button

**Mode NA** (no admin controls, just information):
- Show blended plan + "The group is re-voting on this plan"
- If round cap reached: "All rounds exhausted — branching now"

---

### Screen 10: Branch View
**Route**: `/trips/:trpId/branches/:itmId`
**Purpose**: View forked parallel branches + Trip Chat

**Layout**:
- Clay Route Line forks into N parallel branch lines at top
- Branch cards side-by-side (or stacked on mobile)
- Each branch card shows:
  - Branch title + rationale
  - Member avatars assigned to this branch
  - "FINALIZED" tag if single-member auto-resolved
  - "Confirm" button (only if current user is member of this branch)
  - "Request Modification" button (only if current user is member of this branch)
  - Entity info + cost delta
- Right side: Trip Chat drawer (same as on Trip Home)

**Branch confirmation UI**:
- "Confirm" → calls `POST /api/branches/:brcId/confirm`
- "Request Modification" → calls `POST /api/branches/:brcId/modify` with comment textarea
- No action = accepted after response window (show "Will auto-accept when window closes")

**Single-member auto-resolved branch**:
- Show "Auto-Resolved" badge in Amber
- Show "This branch had one member — their preference was automatically finalized"

---

### Screen 11: Resolved Itinerary Screen
**Route**: `/trips/:trpId/resolved`
**Purpose**: Finalized trip schedule

**Layout**:
- Clean Route Line with all stops highlighted in Amber
- Each confirmed slot shows: title, entity info, time, cost (font-mono)
- Branch reconvergence markers where branches rejoined
- "Export / Share" button (can be a no-op for demo)

---

### Screen 12: Audit / Members / Photos Screen
**Route**: `/trips/:trpId/history` (tabbed)
**Purpose**: Audit trail, members, trip photos

**Three tabs**:

**Tab 1: Audit Log**
- Chronological list of version history entries
- Each entry: timestamp (font-mono), action description, who did it
- Pulled from revision_history

**Tab 2: Members**
- List of all trip members
- Each row: avatar, display name, role badge (owner/editor/viewer), join date
- Owner badge highlighted in Route green

**Tab 3: Trip Photos**
- Subtabs: "All Photos" | "My Photos"
- "All Photos": grid of all uploaded trip photos (Cloudinary URLs) — visible to ALL members
- "My Photos": if face registered → grid of auto-tagged personal photos
  - If NOT face registered: show message "Register your face profile to view your auto-sorted personal trip photos." + "Register Now" button
- Upload button: opens file picker → calls Nithya's Cloudinary endpoint
- Face registration gating: only the "My Photos" tab is gated, never "All Photos"

---

### Screen 13: Solo Match Screen
**Route**: `/solo`
**Purpose**: Find compatible group trips or tour guides

**Layout**: Two tabs:

**Tab 1: Find a Group**
- "Find My Groups" button → calls `POST /api/solo-matching/groups`
- Results list: each GroupMatch card shows:
  - Trip title, destination, dates
  - Compatibility score: large number in font-mono (e.g. "85%") in Route green
  - Breakdown: "Age Group ✓" | "Languages: en, es" | "Interests: heritage, food" | "Overlap: 5 days"
  - "Request to Join" button

**Tab 2: Find a Guide**
- City input + max budget input
- "Find Guides" button → calls `POST /api/solo-matching/guides`
- Results list: each GuideMatch card shows:
  - Guide display name, city, specialisation
  - Compatibility score: font-mono percentage
  - Day rate (font-mono, money as string + currency)
  - Rating (e.g. "4.8 ★")
  - Languages spoken (BCP-47 tags rendered as readable names: "en" → "English")
  - Certified badge if certified === true

---

### Screen 14: Trip Chat (Drawer component, always available on Trip Home + Branch View)
**Purpose**: Always-on real-time chat per trip

**Layout**: Right rail on desktop (w-80), full-screen drawer on mobile
- Message list (newest at bottom, auto-scroll)
- Each message: sender avatar, display name, content, timestamp (font-mono)
- "Propose this as the plan" action button on each message
  - Clicking it calls `POST /api/chat/:msgId/propose`
  - If unanimous YES → slot becomes CONFIRMED immediately
  - If majority but not unanimous → message: "Not unanimous — this has been queued as a standard proposal for the next round"
  - Show vote status on the message after propose is clicked
- Chat input field + Send button at bottom

---

## 12. RESPONSIVE RULES

### Mobile (< 768px):
- Single column layout everywhere
- Full-width slot cards
- Primary action buttons anchored at bottom: `sticky bottom-0 bg-paper border-t border-slate-light`
- Trip Chat: full-screen drawer overlay (not side rail)
- No intermediate breakpoints between mobile and desktop

### Desktop (≥ 768px):
- Two-column Trip Home: itinerary timeline left (`max-w-4xl`), Trip Chat rail right (`w-80`)
- Branch cards side-by-side
- Modal dialogs centered in viewport

---

## 13. ACCESSIBILITY RULES

1. **Focus rings**: All interactive elements must have `focus-visible:ring-2 focus-visible:ring-route`
2. **Color not sole signal**: Every status state pairs color WITH icon AND text label
3. **Touch targets**: All touchable elements minimum `min-h-[44px] min-w-[44px]`
4. **Motion**: Route Line animation MUST respect `prefers-reduced-motion: reduce`
   ```css
   @media (prefers-reduced-motion: reduce) {
     .route-line-draw { animation: none; }
   }
   ```

---

## 14. PHASE-BY-PHASE EXECUTION PLAN

### PHASE 0 — Hour 0–1 (12:00–13:00)
**Your job**: Sketch and agree the demo flow. Set up the project.

Concrete deliverables:
1. `npx create-vite@latest frontend --template react-ts` — Vite + React + TypeScript scaffold
2. Install dependencies: `npm install -D tailwindcss @tailwindcss/vite` + `npm install @clerk/clerk-react`
3. Set up `tailwind.config.ts` with full color palette (Section 6)
4. Add Google Fonts to `index.html`: Fraunces, Inter, IBM Plex Mono
5. Set up `index.css` with Tailwind directives
6. Create folder structure (Section 5) — empty files with placeholder exports
7. Define ALL TypeScript types (Section 7) — even if empty interfaces
8. Create `lib/api.ts` shell with BASE URL from env
9. Confirm with team: agree the exact 5-screen demo flow you'll click through at Checkpoint 1

**Gate**: Does the Vite dev server start? Does Tailwind render a colored div? Done.

---

### PHASE 1 — Hours 1–4 (13:00–16:00)
**Your job**: Static Trip Home + Slot Detail UI against dummy data. NO real API calls yet.

Concrete deliverables:
1. Build all global components (Section 10): Button, Input, StatusPill, VotePill, Toast, Modal, TopNav, EmptyState
2. Build `TripHomeScreen` with dummy data (Section 11, Screen 6):
   - Route Line rendered with 3 dummy slots (CONFIRMED, IN_CONSENSUS, EMPTY)
   - Each slot renders an `ItinerarySlotCard`
   - Correct colors per slot status
   - Desktop two-column layout working
3. Build `ItinerarySlotCard` component with all visual states
4. Set up Clerk `<ClerkProvider>` in `main.tsx` with `VITE_CLERK_PUBLISHABLE_KEY`
5. Build `LoginScreen` and `SignUpScreen` with Clerk components
6. Set up React Router: routes for `/sign-in`, `/sign-up`, `/trips`, `/trips/:trpId`
7. Route Line draws correctly with dummy data — the visual centerpiece must look right

**Gate**: Can you see Trip Home screen with 3 slots, correct colors, Route Line connecting them? Done.

---

### PHASE 2 — Hours 4–8 (16:00–20:00)
**Your job**: Wire proposal/vote UI. Add live tally updates (still dummy WebSocket data).

Concrete deliverables:
1. Build `ProposeActivityModal` (Screen 7) with full form validation
   - `rationale` field labeled "Rationale" — NOT "description"
   - `costDelta` sent as string, NOT number
   - `entityType` dropdown with legal enum values
2. Build `VoteModal` (Screen 8):
   - Show proposal details + current vote tally
   - Vote Pill (YES green / NO red)
   - NO vote: mandatory comment textarea appears, submit blocked if empty
   - Error message on empty NO comment
3. Build `ConflictResolutionPanel` (Screen 9) with dummy AI data
4. Create `TripContext.tsx`:
   - State: `trip`, `setTrip`, `wsStatus`
   - Connects to WebSocket URL from env
   - Handlers for all 5 event types (update state accordingly)
   - Re-fetch trip on reconnect
5. Wire `MyTripsScreen` against dummy trips array
6. Build `CreateTripScreen` form (validation only, no API call yet)

**Gate**: Can you click "Vote NO", see the comment box appear, and be blocked from submitting without a comment? Done.

---

### PHASE 3 — Hours 8–12 (20:00–00:00)
**Your job**: Admin recommendation panel. AI Concierge Panel. Mode display.

Concrete deliverables:
1. Build `AIConciergePanel` component (Screen 9):
   - Shows blended plan vs. original
   - Round indicator in font-mono
   - Mode A admin controls (Accept/Force Branch/Extend) — gated to owner role only
   - Mode NA view (no controls, just info)
2. Mode A vs Mode NA gating throughout Trip Home:
   - Mode A: show admin controls to owner, show "Admin-Led" mode pill
   - Mode NA: show 10-minute countdown timer when `closesAt` is not null
3. Build `MyTripsScreen` properly with trip card grid
4. Build face registration 3-step flow (Screen 1, Step 3):
   - Photo capture UI (can use `<input type="file" accept="image/*" capture="user">`)
   - 3 slots: Straight, Left Tilt, Right Tilt
   - Skip button prominent
5. Build `AuditHistoryScreen` (Screen 12) with 3 tabs (dummy data)

**Gate**: Does Mode A trip show admin controls? Does Mode NA trip show countdown timer? Done.

---

### CHECKPOINT 1 — Hour 12 (00:00)
**STOP all development.** Merge `feature/frontend` into `develop`. Everyone does integration testing together.

**What must work**:
- Sign up → create trip → Trip Home loads with dummy data → click "Vote NO" → comment required → WebSocket toast fires on vote (can use dummy WS event)
- This is tested against real backend (Panchami's API should be live at this point)
- If backend isn't ready: keep dummy data, that's fine for Checkpoint 1

---

### PHASE 4 — Hours 12–16 (00:00–04:00)
**Your job**: Replace all dummy data with real API calls. Branch View.

Concrete deliverables:
1. Wire `lib/api.ts` with real fetch calls to all endpoints (Section 8)
2. Wire `MyTripsScreen` → `GET /api/trips`
3. Wire `TripHomeScreen` → `GET /api/trips/:trpId` on mount
4. Wire `ProposeActivityModal` → `POST /api/proposals`
5. Wire `VoteModal` → `POST /api/votes`
6. Wire real WebSocket in `TripContext` → `wss://{WS_BASE_URL}/ws/trips/{trpId}/{usrId}`
7. Build `BranchViewScreen` (Screen 10):
   - Clay fork visual on Route Line
   - Branch cards with member avatars
   - Confirm / Request Modification buttons
   - Auto-resolved single-member branch badge
8. Wire `POST /api/branches/:brcId/confirm` and `POST /api/branches/:brcId/modify`
9. Handle `slotStatusChanged` → BRANCHED transition: show "View Branches" button on slot card

**Gate**: Two browser tabs, vote NO in one, see toast + tally update in other tab? Done.

---

### PHASE 5 — Hours 16–19 (04:00–07:00)
**Your job**: Solo Match screens. Trip Chat. Photos.

Concrete deliverables:
1. Build `SoloMatchScreen` (Screen 13):
   - Wire `POST /api/solo-matching/groups` → show GroupMatch cards with compatibility score
   - Wire `POST /api/solo-matching/guides` → show GuideMatch cards
   - Compatibility score displayed prominently in font-mono
2. Build `ChatDrawer` component (Screen 14):
   - Wire `GET /api/chat/:trpId` for message history
   - Wire WebSocket for real-time new messages (handled via TripContext)
   - "Propose this as the plan" button → `POST /api/chat/:msgId/propose`
   - Handle both unanimous (CONFIRMED toast) and non-unanimous (queued message) responses
3. Build `AuditHistoryScreen` Tab 3 (Trip Photos):
   - Wire `GET /api/photos/:trpId` for all photos
   - Add ?usrId= filter for "My Photos"
   - Show face registration gate message for unregistered users
4. Build `ResolvedItineraryScreen` (Screen 11)

**Gate**: Can you run solo match and see percentage scores? Does Trip Chat show messages in real time? Done.

---

### PHASE 6 — Hours 19–21 (07:00–09:00)
**Your job**: Full click-through. Flag bugs. Do NOT fix in isolation — coordinate with team.

Concrete deliverables:
1. Run the full demo script end to end in two browser windows
2. Fix any UI issues visible in the demo flow (layout, colors, wrong field names)
3. Verify all 5 WebSocket events show correct UI updates
4. Verify compatibility scores display correctly (integer 0-100, font-mono)
5. Verify NO vote blocks on empty comment
6. Verify CONFIRMED slot shows Amber Route Line
7. Verify BRANCHED slot shows Clay fork
8. Verify Mode A admin controls only visible to owner

**Do NOT add new features after Hour 21.**

---

### CHECKPOINT 2 — Hour 21 (09:00)
**STOP.** Merge `feature/frontend` into `develop` → `main`. Feature freeze.

---

### PHASE 7 — Hours 21–24 (09:00–12:00)
**Your job**: Demo prep only.

1. Clean up any visible UI rough edges on the demo path ONLY
2. Seed demo trip is loaded and looking correct
3. Two browser windows positioned for dual-presenter demo
4. Rehearse the click-through twice
5. Record offline fallback video

---

## 15. DEPENDENCY MAP — WHAT YOU NEED FROM OTHERS AND WHEN

| What you need | From whom | When you need it |
|---|---|---|
| `VITE_API_BASE_URL` value | Nithya | Hour 0–1 |
| `VITE_WS_BASE_URL` value | Nithya | Hour 0–1 |
| `VITE_CLERK_PUBLISHABLE_KEY` value | Nithya | Hour 0–1 |
| `GET /api/trips` working | Panchami | Hour 12 (Checkpoint 1) |
| `POST /api/votes` working | Panchami | Hour 12 (Checkpoint 1) |
| WebSocket broadcasting `voteCast` | Panchami | Hour 12 (Checkpoint 1) |
| `POST /api/consensus/reconcile` working | Panchami + Sharvani | Hour 16 (Phase 4) |
| `GET /api/branches/:itmId` working | Panchami | Hour 16 (Phase 4) |
| `POST /api/solo-matching/groups` working | Panchami + Sharvani | Hour 19 (Phase 5) |
| `GET /api/chat/:trpId` working | Nithya | Hour 16 (Phase 4) |
| Cloudinary photo upload endpoint | Nithya | Hour 19 (Phase 5) |

---

## 16. WHAT YOU MUST NEVER DO

1. Never call PostgreSQL directly from the frontend
2. Never call the LLM API directly from the frontend
3. Never use `float` or `Number()` for money — keep money as string
4. Never parse or split an ID string (e.g. never do `id.split('_')[1]`)
5. Never use `abstain` as a vote value — WanderMatch only writes `yes` or `no`
6. Never use field name `description` for proposal text — it is `rationale`
7. Never use field name `estimatedCost` — it is `costDelta`
8. Never show admin controls to non-owner users
9. Never gate "All Photos" behind face registration — only "My Photos" is gated
10. Never block a non-voter from voting in future rounds
11. Never use color as the sole status signal — always pair with icon + text label
12. Never call a WebSocket event name not in the approved list of 5
