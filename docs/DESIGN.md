# UI/UX Design Specification Document: WanderMatch

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. Locked Visual System Reference

### 1.1 Rationale
WanderMatch replaces cold, generic SaaS aesthetics with the tactile warmth of a **paper travel journal crossed with a transit map**. This evokes the excitement of journey planning, structured stop sequences, and clear route choices without resorting to travel clichés (e.g. palm trees, airplanes, neon gradients, or glassmorphism).

### 1.2 Color Palette
- `Paper` `#F7F5F0`: Canvas & Main Background (Warm, tactile paper tone).
- `Ink` `#14213D`: Primary Headings & High-contrast Text (Rich dark ink).
- `Route` `#2F6F6B`: Brand, Primary Buttons, Active States (Deep forest transit route teal).
- `Route Dark` `#204B48`: Button Hover & Pressed States.
- `Amber` `#E1A93A`: Confirmed & Unanimous Success States ONLY (Warm gold transit line).
- `Clay` `#C1502E`: Conflict & Branching States ONLY (Terracotta alert line, never decorative).
- `Slate` `#6B7280`: Secondary Text, Labels, & Subtitles.
- `Slate Light` `#E4E1DA`: Borders, Dividers, & Card Outlines.
- `Card` `#FFFFFF`: Surface Backgrounds (Clean white paper cards).

### 1.3 Typography
- **Headings & Trip Titles**: `Fraunces` (Editorial serif with character).
- **UI Labels & Body Text**: `Inter` (Clean, highly readable sans-serif).
- **Data, Times, Counts, & Percentages**: `IBM Plex Mono` (Structured transit schedule font).

### 1.4 Geometry & Radii
- **Cards & Buttons**: `10px` border-radius (`rounded-[10px]`).
- **Input Fields & Textareas**: `8px` border-radius (`rounded-[8px]`).
- **Shadows**: Subtle `0 1px 3px rgba(20, 33, 61, 0.04)` (No heavy drop shadows or glass blur).

### 1.5 The Signature Route Line
The **Route Line** is a vertical/horizontal dashed sequence line connecting itinerary stops. It is used **only** on Trip Preview, Trip Home, and Resolved Itinerary views:
- Default / Pending: Dashed `Slate Light` `#E4E1DA`.
- Confirmed / Reconverged: Rejoins in `Amber` `#E1A93A`.
- Branching / Conflict: Forks into parallel lines in `Clay` `#C1502E`.

---

## 2. Global Component Library

1. **Top Nav Bar**: Persistent header with WanderMatch logo, section tabs (Itinerary, Solo Matchmaker, Trip Photos), Mode indicator pill (`Mode A (Admin)` / `Mode NA (Collab)`), live presence avatars, Trip Chat toggle button, and multi-user switcher profile dropdown.
2. **Itinerary Slot Card**: Container card for an itinerary time slot showing time badge, title, entity resolution (city/POI), cost, status pill (`EMPTY`, `IN_CONSENSUS`, `BRANCHED`, `CONFIRMED`), active vote tally, and a "Vote / Review" button.
3. **Proposal Card**: Nested card inside slot details displaying proposal title, rationale, creator avatar, cost_delta, and vote breakdown.
4. **Vote Pill**: Interactive binary action button pair: `YES (Approve)` in `Route` `#2F6F6B` and `NO (Object)` in `Clay` `#C1502E`.
5. **Suggestion Chip**: Compact tag displaying typed objection comments or preferred alternatives (e.g. `"Hot springs spa instead"`).
6. **AI Concierge Panel**: Highlighted card displaying AI blended plan reconciliations, explanation notes, and hard constraint status.
7. **Branch Tabs / Fork View**: Side-by-side or stacked branch cards displaying forked activity options with member avatar badges and single-member auto-resolution tags.
8. **Primary Button**: `bg-route` (`#2F6F6B`), `text-paper` (`#F7F5F0`), `rounded-[10px]`, `font-sans font-medium`, hover state `bg-route-dark` (`#204B48`).
9. **Secondary Button**: `bg-paper` (`#F7F5F0`), `text-ink` (`#14213D`), `border border-slate-light` (`#E4E1DA`), `rounded-[10px]`.
10. **Input Field**: `bg-paper` (`#F7F5F0`), `border border-slate-light` (`#E4E1DA`), `rounded-[8px]`, `px-3 py-2 text-sm text-ink focus:border-route`.
11. **Status Dot / Pill**: Circular status indicator: `Amber` for Confirmed, `Route` for In Consensus, `Clay` for Branched, `Slate` for Empty.
12. **Toast Notification**: Lightweight slide-in card anchored at top-right for real-time WebSocket updates (`voteCast`, `slotStatusChanged`).
13. **Modal Window**: Centered overlay with backdrop blur, white `Card` container (`rounded-[10px]`), and explicit close button.
14. **Empty State Block**: Centered paper container with mono subtitle, calm editorial message, and single primary call-to-action button.

---

## 3. Screen-by-Screen Specifications

### 3.1 Sign Up Screen (with Preferences & Optional Face Registration)
- **Purpose**: Authenticate user via Clerk and collect initial travel preferences & optional face registration.
- **Layout**: Centered paper card layout. Step 1: Account credentials. Step 2: Interactive preference chips (Age group, BCP-47 languages, interests). Step 3: Optional 3-photo face capture (Straight, Left Tilt, Right Tilt) with skip button.
- **Components**: `Input Field`, `Primary Button`, `Secondary Button`, `Suggestion Chip`.
- **States**: Default, Loading, Error ("Quality check failed: exactly one face required per photo").
- **Dummy Data**:
  ```json
  {
    "usrId": "usr_new_01",
    "email": "user@example.com",
    "fullName": "Jordan Lee",
    "ageGroup": "25-34",
    "preferences": {
      "languages": ["en", "es"],
      "interests": ["Culture", "Foodie", "Hiking"]
    },
    "faceRegistered": false
  }
  ```

### 3.2 Log In Screen
- **Purpose**: Authenticate existing user.
- **Layout**: Clean paper card with WanderMatch logo, email/password fields, and Clerk social login.
- **Components**: `Input Field`, `Primary Button`, `Secondary Button`.

### 3.3 My Trips Screen
- **Purpose**: Display all trips the user belongs to as owner, editor, or viewer.
- **Layout**: Grid of trip cards with destination cover image, dates, mode pill (`Mode A` / `Mode NA`), and role badge.
- **Dummy Data**:
  ```json
  [
    {
      "trpId": "trp_bali_2026",
      "title": "Bali Tropical Escape & Cultural Journey",
      "destinationCity": "Bali",
      "destinationCountry": "Indonesia",
      "startDate": "2026-10-10",
      "endDate": "2026-10-16",
      "mode": "Mode A",
      "ownerId": "usr_nikitha",
      "role": "owner"
    }
  ]
  ```

### 3.4 Create Trip / Discover Screen
- **Purpose**: Initiate a new group trip or discover existing trips/guides.
- **Layout**: Tabbed view: "Create Group Trip" form on left, "Discover Solo Matches" on right.

### 3.5 Trip Preview Screen
- **Purpose**: Landing preview for invited members before joining.
- **Layout**: Read-only Route Line timeline preview with destination overview.

### 3.6 Trip Home Screen (with Signature Route Line)
- **Purpose**: Main workspace for group itinerary collaboration.
- **Layout**: Hero banner with destination/dates, active presence bar, and vertical **Route Line** timeline connecting morning, afternoon, evening, and night slots.
- **Dummy Data**:
  ```json
  {
    "trpId": "trp_bali_2026",
    "title": "Bali Tropical Escape",
    "mode": "Mode A",
    "version": 3,
    "items": [
      {
        "itmId": "itm_b1",
        "timeSlot": "Morning",
        "title": "Sacred Monkey Forest",
        "status": "CONFIRMED",
        "cost": 25.0
      },
      {
        "itmId": "itm_b2",
        "timeSlot": "Afternoon",
        "title": "Mount Batur Trek",
        "status": "IN_CONSENSUS",
        "cost": 65.0
      }
    ]
  }
  ```

### 3.7 Propose Activity Screen / Modal
- **Purpose**: Submit a new activity proposal for an itinerary slot.
- **Layout**: Modal form requesting title, rationale (not description), entity resolution (`entity_type`/`entity_id`), cost_delta ($), and currency code.

### 3.8 Vote States inside Slot Detail Modal
- **Purpose**: Review active proposal and cast binary `yes` or `no` vote.
- **Layout**: Top proposal details -> middle group vote tally -> bottom vote form with binary `YES`/`NO` pills and mandatory comment text box when `NO` is selected.

### 3.9 Conflict Resolution / AI Concierge Panel
- **Purpose**: Review AI blended plan recommendations or branch options.
- **Layout**: Highlighted panel displaying original vs blended activity and Mode A admin override buttons ("Accept Blended Plan", "Force Branch Now", "Extend Round").

### 3.10 Branch View + Mandatory Trip Chat
- **Purpose**: View forked activity branches and engage in trip chat.
- **Layout**: Split view: Left side displays parallel branch cards connected to Clay Route Line forks; Right side displays persistent Trip Chat drawer with "Propose this as the plan" message action button support.

### 3.11 Resolved Itinerary Screen
- **Purpose**: Finalized trip schedule view.
- **Layout**: Clean sequence timeline with all stops highlighted in `Amber` `#E1A93A` and branch reconvergence markers.

### 3.12 Audit History / Members / Memories / Notifications Screen
- **Purpose**: Audit trail, member list, and trip photo gallery.
- **Layout**: Tabbed view: "Audit Log" (version history), "Members", and "Trip Photos" (All vs registration-gated "My Photos" view).
- **Registration Gating Message**: `"Register your face profile to view your auto-sorted personal trip photos."`

---

## 4. Responsive Rules

- **Mobile View (`< 768px`)**:
  - Single-column layout with full-width slot cards.
  - Primary action buttons anchored at the bottom of the viewport in a fixed bar (`sticky bottom-0`).
  - Trip Chat renders as a full-screen drawer overlay when opened.
  - No intermediate two-column layout between mobile and desktop.
- **Desktop View (`>= 768px`)**:
  - Two-column main workspace: Left/Center column contains Itinerary Timeline with Route Line (`max-w-4xl`); Right column contains persistent collapsible Trip Chat rail (`w-80` or `w-96`).

---

## 5. Accessibility & Animation Rules

1. **Visible Focus Rings**: All interactive elements (buttons, inputs, pills, tabs) must feature a visible `2px` focus outline in `Route` `#2F6F6B` when navigated via keyboard (`focus-visible:ring-2 focus-visible:ring-route`).
2. **Color Contrast & Signals**: Color is never used as the sole signal. Status states pair color (`Amber`, `Route`, `Clay`) with explicit icons (`CheckCircle`, `Vote`, `GitFork`) and text labels ("Confirmed", "In Consensus", "Branched").
3. **Minimum Touch Targets**: All touchable elements have a minimum height/width of `44px x 44px` on mobile devices.
4. **Motion Controls**: The Route Line draw-in sequence animation strictly respects `prefers-reduced-motion: reduce`, disabling smooth path transitions when reduced motion is requested.
