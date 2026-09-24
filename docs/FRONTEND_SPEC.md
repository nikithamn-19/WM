# WanderMatch — Frontend Interactive Specification & Backend Mapping Document

**Product**: WanderMatch — Social & Group Travel Planning with AI Consensus Planner  
**Target Repository**: `https://github.com/Sharvani-G/Wander-Match`  
**Purpose**: Exhaustive, component-by-component and button-by-button documentation of the frontend application to serve as a precise specification for building backend API routes, ORM controllers, and database handlers.

---

## 1. Global Navigation & Routing Architecture

### 1.1 Complete Route Table

| URL Path | Component File | Navigation Scope | Page Header Tabs Displayed | Required Auth / Role |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `App.tsx` | Global Redirect | N/A → Redirects to `/trips` | None |
| `/sign-in` | `LoginScreen.tsx` | Authentication | Standalone Card (No Top Nav) | Public |
| `/sign-up` | `SignUpScreen.tsx` | Authentication | Standalone Card (No Top Nav) | Public |
| `/onboarding` | `OnboardingScreen.tsx` | User Setup | Global Outside-Trip Nav | Authenticated Traveler |
| `/trips` | `MyTripsScreen.tsx` | Dashboard | Global Outside-Trip Nav (`My Trips` active) | Authenticated Traveler |
| `/solo-or-group` | `SoloOrGroupDecisionScreen.tsx` | Discovery | Global Outside-Trip Nav (`Explore & Matching` active) | Authenticated Traveler |
| `/solo-matches` / `/solo` | `SoloMatchScreen.tsx` | Matching | Global Outside-Trip Nav (`Explore & Matching` active) | Authenticated Traveler |
| `/trips/new` | `CreateTripScreen.tsx` | Wizard Modal | Global Outside-Trip Nav | Authenticated Traveler |
| `/trips/:trpId/preview` | `TripPreviewScreen.tsx` | Join Request | Standalone Preview Banner + Back to Dashboard | Authenticated Traveler |
| `/trips/:trpId` | `TripHomeScreen.tsx` | In-Trip Main | Inside-Trip Nav (`Plan` active) + Admin Pill | Trip Member (`owner`/`editor`/`viewer`) |
| `/trips/:trpId/branches/:itmId` | `BranchViewScreen.tsx` | In-Trip Voting | Inside-Trip Nav (`Propose & Resolve` active) | Trip Member |
| `/trips/:trpId/resolved` | `ResolvedItineraryScreen.tsx` | In-Trip Resolution | Inside-Trip Nav | Trip Member |
| `/trips/:trpId/chat` | `TripChatScreen.tsx` | In-Trip Chat | Inside-Trip Nav (`Chat` active) | Trip Member |
| `/trips/:trpId/memories` / `/photos` | `MemoriesScreen.tsx` | In-Trip Gallery | Inside-Trip Nav (`Memories` active) | Trip Member |
| `/trips/:trpId/history` | `AuditHistoryScreen.tsx` | Governance Audit | Inside-Trip Nav | Trip Member |

---

## 2. Global Top Header Navigation (`GlobalTopHeader.tsx`)

### 2.1 Outside-Trip Navigation Mode (When viewing Dashboard, Matching, Onboarding)

| UI Element / Button | Location | Visual / Trigger | On-Click Action | Target Route | Backend API & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WanderMatch Brand** | Left | Text Logo | Navigates to main dashboard | `/trips` | None |
| **My Trips Tab** | Center | Nav Tab | Navigates to user trip list | `/trips` | `GET /api/trips?usr_id=:usr_id` (`trips`, `trip_members`) |
| **Explore & Matching Tab** | Center | Nav Tab | Navigates to solo/group decision screen | `/solo-or-group` | None |
| **User Profile Badge** | Right | Avatar + Name | Navigates to user profile / onboarding | `/onboarding` | `GET /api/users/:usr_id` (`users`, `user_preferences`) |

### 2.2 Inside-Trip Navigation Mode (When viewing a specific trip `/trips/:trpId/...`)

| UI Element / Button | Location | Visual / Trigger | On-Click Action | Target Route | Backend API & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Back to Dashboard** | Far Left | `← Dashboard` | Exits trip workspace to main dashboard | `/trips` | None |
| **Trip Title & Mode Pill** | Left | e.g. *Goa Getaway* + `Mode A (Admin)` / `Mode NA (Consensus)` | Displays active mode badge | Static display | `GET /api/trips/:trpId` (`trips.mode`) |
| **Plan Tab** | Center | Main Itinerary Tab | Opens Day-wise Itinerary timeline | `/trips/:trpId` | `GET /api/trips/:trpId/itinerary` (`itineraries`, `itinerary_items`) |
| **Propose & Resolve Tab** | Center | Voting & Branching Tab | Opens active proposal resolution screen | `/trips/:trpId/branches/:itmId` (or default slot) | `GET /api/trips/:trpId/proposals` (`proposals`, `branches`) |
| **Chat Tab** | Center | Group Discussion Tab | Opens day-scoped group message thread | `/trips/:trpId/chat` | `GET /api/trips/:trpId/messages` (`trip_chat_messages`) |
| **Memories Tab** | Center | Photo Gallery Tab | Opens highlights, stories, & photo folders | `/trips/:trpId/memories` | `GET /api/trips/:trpId/photos` (`photos`, `photo_person`) |
| **Admin Mode Toggle Pill** | Far Right | `👑 Admin Mode A (Click to Toggle)` | Toggles local & context mode between Mode A (Admin) and Mode NA (Democratic) | Stays on page, triggers toast notification | `PATCH /api/trips/:trpId` (`trips.mode = 'MODE_A' / 'MODE_NA'`) |

---

## 3. Screen-by-Screen Detailed Functional & Redirect Map

### 3.1 Login Screen (`/sign-in` → `LoginScreen.tsx`)

- **Purpose**: Authenticate returning travelers via email/password or Google Single Sign-On (Clerk integration ready).
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Email Address** | Input Field | `email: string` | Text input binding | N/A | None |
| **Password** | Input Field | `password: string` | Masked text binding | N/A | None |
| **Sign In Button** | Primary Button | Form submit | Validates credentials & logs in traveler | `/trips` | `POST /api/auth/login` → verifies `users(usr_id, email)` |
| **Continue with Google** | Outline Button | Google OAuth | Triggers Google SSO OAuth flow | `/trips` | `POST /api/auth/google` → upserts `users` record |
| **Sign Up Link** | Text Link | `Don't have an account? Sign up` | Navigates to Registration page | `/sign-up` | None |

---

### 3.2 Onboarding Screen (`/onboarding` → `OnboardingScreen.tsx`)

- **Purpose**: Collect traveler preferences (Age, BCP-47 Languages, Travel Interests) and optional facial biometric registration for photo auto-tagging.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Full Name** | Input Field | `fullName: string` | Stores traveler name | N/A | `users.full_name` |
| **Age Group** | Select Dropdown | `'18-24' \| '25-34' \| '35-49' \| '50+'` | Selects age bucket | N/A | `users.age_group` |
| **Languages Spoken** | Multi-Select Chips | BCP-47 codes: `English (en)`, `Hindi (hi)`, `Kannada (kn)`, `Tamil (ta)`, `Spanish (es)` | Toggles language selection | N/A | `user_preferences.languages` |
| **Travel Style Tags** | Multi-Select Chips | `Beach Lover`, `Trekking`, `Foodie`, `Nightlife`, `Heritage`, `Budget` | Toggles interest tags | N/A | `user_preferences.interests` |
| **Enable Camera (Face ID)** | Primary Button | WebCam stream | Captures face embedding vector | N/A | `face_profiles` (`fcp_id`, `usr_id`, `embedding_data`) |
| **Complete Setup** | Primary Button | Form submit | Saves user preferences & completes profile | `/trips` | `POST /api/users/:usr_id/onboarding` → writes to `users`, `user_preferences`, `face_profiles` |

---

### 3.3 Dashboard Screen (`/trips` → `MyTripsScreen.tsx`)

- **Purpose**: Central hub displaying active, upcoming, and draft trip cards with quick creation & search filters.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Discover Trips Button** | Outline Button | `Discover Trips` | Navigates to solo/group matching discovery | `/solo-or-group` | None |
| **Create a Trip Button** | Primary Button | `+ Create a Trip` | Opens step-by-step trip creation modal | `/trips/new` (or opens Modal) | None |
| **Trip Card Click** | Clickable Card | `trpId: string` (e.g. `trp_goa_2026`) | Opens the trip home workspace | `/trips/:trpId` | `GET /api/trips/:trpId` (`trips`, `itineraries`, `trip_members`) |
| **Trip Card Preview** | Secondary Button | `View Details` | Opens trip join preview banner | `/trips/:trpId/preview` | `GET /api/trips/:trpId/preview` |

---

### 3.4 Solo or Group Decision Screen (`/solo-or-group` → `SoloOrGroupDecisionScreen.tsx`)

- **Purpose**: Directs traveler depending on whether they are a solo traveler seeking a group, or an existing group starting a trip.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Solo Traveler Card** | Clickable Card / Button | `Solo - I'm looking for a trip` | Redirects to AI Solo Matchmaker | `/solo-matches` | None |
| **Already in a Group Card**| Clickable Card / Button | `Already in a group - We're planning` | Redirects to Create Trip wizard | `/trips/new` | None |

---

### 3.5 Solo Matchmaker Screen (`/solo-matches` → `SoloMatchScreen.tsx`)

- **Purpose**: AI-powered matchmaker ranking compatible group trips based on age group, BCP-47 spoken languages, travel interests, and date overlap.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Request to Join** | Primary Button | `trpId: string`, `usrId: string` | Sends join request notification to trip owner | Stays on page (toast shown) | `POST /api/trips/:trpId/join-request` → inserts `trip_members` with `status = 'PENDING'` |
| **View Trip Details** | Outline Button | `trpId: string` | Opens trip preview itinerary before joining | `/trips/:trpId/preview` | `GET /api/trips/:trpId/preview` |

---

### 3.6 Create Trip Wizard Screen (`/trips/new` → `CreateTripScreen.tsx`)

- **Purpose**: Multi-step trip creation interface for admins to define destination, mode, dates, and initial itinerary slots.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Destination Name** | Input Field | `destination: string` (e.g. `Goa, India`) | Resolves against reference cities/countries | N/A | `cities`, `countries` lookup |
| **Start & End Dates** | Date Pickers | `startDate`, `endDate` | Sets trip timeline bounds | N/A | `trips.start_date`, `trips.end_date` |
| **Planning Mode** | Radio Buttons | `MODE_A` (Admin Led) \| `MODE_NA` (Democratic Consensus) | Sets governance structure | N/A | `trips.mode` |
| **Save Draft Button** | Secondary Button | Current form state | Saves trip in `DRAFT` status so admin can edit later | `/trips` | `POST /api/trips` with `status = 'DRAFT'` |
| **Publish Trip Button**| Primary Button | Complete form object | Creates active trip & initializes itinerary version `1` | `/trips/:trpId` | `POST /api/trips` → writes `trips`, `trip_members`, `itineraries`, `itinerary_items` |

---

### 3.7 Trip Preview Screen (`/trips/:trpId/preview` → `TripPreviewScreen.tsx`)

- **Purpose**: Public/Semi-private preview card of a trip allowing non-members to view the itinerary overview and submit a join request.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Back Button** | Text Link | `← Back to Matches` | Returns to matchmaker | `/solo-matches` | None |
| **Send Join Request** | Primary Button | `trpId`, `usrId`, `message` | Submits traveler request to group owner | Stays on page | `POST /api/trips/:trpId/join-request` |

---

### 3.8 Trip Main "Plan" Screen (`/trips/:trpId` → `TripHomeScreen.tsx`)

- **Purpose**: Main itinerary workspace displaying dynamic day tabs (`Day 1`, `Day 2`, `Day 3`), time slots (Morning, Afternoon, Evening, Night), slot status badges (`EMPTY`, `IN_CONSENSUS`, `BRANCHED`, `CONFIRMED`), and Admin edit controls.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Day Tabs** | Horizontal Buttons | `Day 1`, `Day 2`, `Day 3`, `Day 4` | Switches active day filter | Stays on page | Filters `itinerary_items.day_number` |
| **View Decision / Vote**| Action Button | `itmId: string` | Navigates to active proposal voting round | `/trips/:trpId/branches/:itmId` | `GET /api/proposals/:prpId` |
| **View Branches** | Action Button | `itmId: string` | Navigates to side-by-side branch resolution | `/trips/:trpId/branches/:itmId` | `GET /api/branches?itm_id=:itmId` |
| **+ Propose Activity** | Secondary Button | `itmId: string`, `timeSlot` | Opens proposal submission modal | Opens Modal | `POST /api/proposals` → inserts `proposals(prp_)` |
| **Admin: Add Slot** | Outline Button | `dayNumber`, `timeSlot` | Adds custom time slot to itinerary | Stays on page | `POST /api/itinerary-items` → inserts `itinerary_items(itm_)` |
| **Admin: Edit Slot** | Icon Button | `itmId: string` | Edits title, timings, cost, rationale | Opens Edit Modal | `PATCH /api/itinerary-items/:itmId` → updates `itinerary_items` |
| **Admin: Confirm Slot**| Primary Button | `itmId: string` | Directly confirms slot (Mode A privilege) | Stays on page | `PATCH /api/itinerary-items/:itmId` (`slot_status = 'CONFIRMED'`) |

---

### 3.9 Propose & Resolve Screen (`/trips/:trpId/branches/:itmId` → `BranchViewScreen.tsx`)

- **Purpose**: High-stakes consensus resolution screen displaying side-by-side proposal cards, live voting countdown timer (`⏱ Round 1 ends in 06:42`), AI Concierge summary, and voting controls.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vote YES Button** | Primary Button | `prpId`, `usrId`, `value: 'yes'` | Casts YES vote for proposal | Stays on page | `POST /api/votes` → inserts `votes(vot_)` with `value = 'yes'` |
| **Vote NO Button** | Danger/Outline Button | `prpId`, `usrId`, `value: 'no'`, `comment` | Opens required comment modal & casts NO vote | Opens Modal | `POST /api/votes` → inserts `votes(vot_)` with `value = 'no'`, requires non-empty `comment` |
| **Resolve Branch** | Primary Button | `brcId: string` | Admin/Consensus selects winning branch | Stays on page | `POST /api/branches/:brcId/resolve` → sets item to `CONFIRMED` |
| **Propose Alternative**| Secondary Button | `itmId: string` | Opens new proposal submission modal | Opens Modal | `POST /api/proposals` |

---

### 3.10 Trip Chat Screen (`/trips/:trpId/chat` → `TripChatScreen.tsx`)

- **Purpose**: Compact group messaging thread scoped by day/trip, supporting inline proposal references, message editing, and deletion.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Message Input** | Text Field | `content: string` | Binds text message | N/A | None |
| **Send Message** | Icon/Primary Button| `trpId`, `usrId`, `content` | Emits message via REST/WebSocket | Stays on page | `POST /api/chat/messages` → inserts `trip_chat_messages(msg_)` |
| **Edit Message** | Dropdown Action | `msgId`, `newContent` | Updates existing message | Stays on page | `PATCH /api/chat/messages/:msgId` |
| **Delete Message** | Dropdown Action | `msgId` | Removes message from thread | Stays on page | `DELETE /api/chat/messages/:msgId` |

---

### 3.11 Memories & Gallery Screen (`/trips/:trpId/memories` → `MemoriesScreen.tsx`)

- **Purpose**: Post-trip photo gallery with AI story narrative generation, folder creation, empty folder states, and local photo gallery upload.
- **Interactive Breakdown**:

| Element Name | Control Type | Input / Parameters | On-Click / Submit Action | Redirect Target | Required Backend Endpoint & DB Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Generate Trip Story** | Secondary Button | `trpId` | Triggers AI narrative summary generator | Stays on page | `POST /api/trips/:trpId/generate-story` |
| **+ Create Folder** | Secondary Button | `folderName: string` | Opens modal to name & create photo folder | Opens Modal | Saves folder name to state / `photos` metadata |
| **Filter Day Dropdown**| Select Dropdown | `All` \| `Day 1` \| `Day 2` ... | Filters photos by itinerary day | Stays on page | Filters `photos.day` |
| **Filter Folder Dropdown**| Select Dropdown | `All` \| `[FolderName]` | Filters photos by selected folder | Stays on page | Filters `photos.folder` |
| **+ Add Photos from Gallery** | Plus Card & Button | File Input (`image/*`, multiple) | Converts images to Data URLs & attaches to folder | Stays on page | `POST /api/photos` → inserts `photos(pho_)`, triggers face match |
| **Photo Checkbox / Select**| Clickable Overlay | `photoId` | Selects photo for batch download | Stays on page | Local selection state |
| **Download Selected** | Primary Button | `selectedPhotoIds: string[]` | Triggers zip download of selected photos | Browser Download | None |

---

## 4. Backend Integration Summary for API Routes

To power this entire frontend seamlessly, the backend API server (`FastAPI`) should expose the following REST & WebSocket endpoints:

1. **Auth & Profile**:
   - `POST /api/auth/login`
   - `POST /api/users/:usr_id/onboarding`
   - `GET /api/users/:usr_id`

2. **Trips & Itinerary**:
   - `GET /api/trips?usr_id=:usr_id`
   - `POST /api/trips` (Supports `DRAFT` and `PUBLISHED` states)
   - `GET /api/trips/:trpId`
   - `GET /api/trips/:trpId/itinerary`
   - `POST /api/itinerary-items`
   - `PATCH /api/itinerary-items/:itm_id`

3. **Proposals, Voting, & Branching**:
   - `POST /api/proposals`
   - `GET /api/proposals/:prp_id`
   - `POST /api/votes` (Validates binary `'yes'`/`'no'` & mandatory comment for `'no'`)
   - `GET /api/branches?itm_id=:itm_id`
   - `POST /api/branches/:brc_id/resolve`

4. **Chat & Memories**:
   - `GET /api/trips/:trpId/messages`
   - `POST /api/chat/messages`
   - `GET /api/trips/:trpId/photos`
   - `POST /api/photos`

5. **WebSocket Engine**:
   - `WS /ws/trips/:trpId/:usrId` (Broadcasts `voteCast`, `proposalCreated`, `slotStatusChanged`, `aiPlanGenerated`).
