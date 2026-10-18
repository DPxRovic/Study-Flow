# StudyFlow — Technical Architecture Specification

> **Document Status**: Canonical Technical Source of Truth  
> **Version**: 2.0.0 (Post-Visual Refinement & TypeScript Architecture Sync)  
> **Target Audience**: Full-Stack Engineers, AI Coding Agents, Academic Advisors  
> **Core Objective**: Provide an exhaustive, unambiguous blueprint for the entire StudyFlow application, clearly distinguishing between the **Current Implementation State** (Phase 1 Frontend Foundation) and the **Target Architectural Standard** (Phase 2 Full-Stack Persistence).

---

## 1. Architecture Goals & Dual-State Model

StudyFlow is a student-friendly study planner and assignment scheduler built to help college students balance course workloads, deadlines, and limited free time.

### Technology Stack Overview
- **Frontend (Current State & Target)**: React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4, React Router v7 (`react-router-dom`), Lucide React icons, Motion.
- **Backend (Target Architectural Standard)**: Node.js, Express, TypeScript / ES Modules, Prisma ORM, PostgreSQL database, JWT (`jsonwebtoken`), `bcrypt`.

### Two-Phase Architectural State Model

| Dimension | Current Implementation State (Phase 1) | Target Architectural Standard (Phase 2) |
| :--- | :--- | :--- |
| **Runtime & Build** | Single-app Vite dev server (`vite --port=3000 --host=0.0.0.0`), React 19 SPA | Express server hosting `/api/*` routes with Vite middleware dev mount (`server.ts`) |
| **Language** | 100% Strict TypeScript (`.tsx` and `.ts`) with zero compilation errors | TypeScript across both client (`/src`) and backend server (`/src/server` or `/server`) |
| **State Management** | Reactive React Context (`PlannerContext`, `AuthContext`, `ToastContext`) | React Context + React Hooks backed by HTTP API calls (`/api/tasks`, `/api/schedule`, etc.) |
| **Data Persistence** | In-memory student workspace initialized with rich realistic college seed data (`src/data/mockData.ts`) | PostgreSQL database managed via Prisma ORM schemas, migrations, and transactions |
| **Scheduler Engine** | Client-side deterministic greedy knapsack scheduler in `PlannerContext.tsx` | Server-side deterministic scheduler in `services/scheduler/schedulerEngine.ts` with client controls |
| **Authentication** | Instant interactive role-switching (Student $\leftrightarrow$ Admin) in `AuthContext.tsx` | JWT Bearer token authentication with password hashing (`bcrypt`), cookie/header storage, and role-based middleware (`requireAdmin`) |

### Core Engineering Principles
1. **Maintainability**: Clean, predictable file organization where any developer or AI assistant can locate code instantly.
2. **Clear Separation of Concerns**: Strict boundary lines between presentation, state orchestration, business logic, API transmission, and persistence.
3. **Small, Understandable Modules**: Avoid monolithic god-objects. Reusable UI components stay small and focused.
4. **Minimal Unnecessary Abstraction**: No heavy Redux/MobX boilerplate, no complicated microservices. Standard React hooks, Context providers, and Express route-controller-service layers.
5. **Easy AI-Assisted Development**: Explicit contracts, strict TypeScript interfaces (`src/types/index.ts`), and deterministic algorithms make iterative AI development safe and reproducible.
6. **Easy Debugging**: Descriptive error states, boundary fallbacks (`ErrorBoundary.tsx`), and deterministic scheduling algorithms that can be verified without external mocks.
7. **Predictable File Locations**: A consistent directory layout aligned with functional domains.

---

## 2. Complete Directory Tree

### Actual Current Repository Tree (Phase 1 Implementation)

```
StudyFlow/
├── CLAUDE.md                           # AI assistant rules, conventions & anti-slop guidelines
├── PRODUCT.md                          # Product requirements document & UX specs
├── DESIGN.md                           # Design system, 17 design rules, tokens & visual contract
├── ARCHITECTURE.md                     # Technical source of truth (this document)
├── README.md                           # Developer-facing overview & quickstart
├── .gitignore                          # Git ignore rules for node_modules, dist, .env
├── .env.example                        # Documented environment variables template
├── metadata.json                       # Applet metadata, capabilities & app name
├── index.html                          # HTML5 entry point (Google Fonts: Plus Jakarta Sans & JetBrains Mono)
├── package.json                        # Root package manifest & dependencies
├── tsconfig.json                       # TypeScript compiler configuration (strict mode)
├── vite.config.ts                      # Vite bundler configuration with @tailwindcss/vite plugin
├── bun.lock                            # Lockfile
│
├── docs/                               # Supporting design & architecture specifications
│   ├── DESIGN_SYSTEM.md                # Design system rules, token tables & component specs
│   ├── PRODUCT_SPEC.md                 # Product specifications & student/admin feature matrix
│   └── ARCHITECTURE_PLAN.md            # Technical roadmap, conflict audit & directory layout
│
└── src/                                # Frontend Source Code (100% TypeScript)
    ├── main.tsx                        # React 19 root entry point
    ├── App.tsx                         # Root router tree (19 routes) & provider wrapper
    ├── index.css                       # Tailwind v4 theme tokens (@theme) & typography rules
    │
    ├── types/                          # Shared canonical TypeScript definitions
    │   └── index.ts                    # Subject, Task, AvailabilitySlot, Session, User, Role types
    │
    ├── theme/                          # Design tokens & visual contract
    │   └── tokens.ts                   # THEME_COLORS, SUBJECT_CATEGORY_STYLES, BUTTON_STYLES, INPUT_STYLES
    │
    ├── data/                           # Canonical seed & demo dataset
    │   └── mockData.ts                 # Realistic college profile, courses, problem sets, sessions
    │
    ├── context/                        # React context providers & hooks
    │   ├── AuthContext.tsx             # User session, role switcher (student/admin), login/logout
    │   ├── PlannerContext.tsx          # StudyFlow core state: tasks, subjects, sessions, scheduler
    │   └── ToastContext.tsx            # App-wide notification toasts (success, error, info)
    │
    ├── components/                     # Reusable presentation components
    │   └── ui/                         # Accessible domain-agnostic UI primitives
    │       ├── Button.tsx              # Primary, secondary, ghost, destructive with loading spinner
    │       ├── Input.tsx               # Accessible form input with label, error & helper text
    │       ├── Select.tsx              # Accessible dropdown selector with consistent styling
    │       ├── Modal.tsx               # Dialog backdrop with Escape listener, close button & focus management
    │       ├── Badge.tsx               # Academic subject category badges & semantic status tags
    │       ├── EmptyState.tsx          # Instructive, non-patronizing empty state with call-to-action
    │       ├── Skeleton.tsx            # Accessible low-contrast loading placeholder
    │       └── ErrorBoundary.tsx       # React error boundary fallback screen with retry button
    │
    ├── layouts/                        # Shell layout wrappers
    │   ├── StudentLayout.tsx           # Authenticated student shell: Top Bar + Sidebar + Quick Add Modal
    │   ├── AdminLayout.tsx             # Authenticated admin shell: Top Bar + Admin Navigation + Role Switch
    │   ├── PublicLayout.tsx            # Public unauthenticated shell with simple top bar & footer
    │   └── AuthLayout.tsx              # Centered authentication shell with branding & card container
    │
    └── pages/                          # Page orchestrators (all 19 routes)
        ├── public/                     # Public website routes
        │   ├── LandingPage.tsx         # Product overview, value prop, "What do I need to do today?" preview
        │   ├── LoginPage.tsx           # Sign-in form with demo account quick-login buttons
        │   ├── RegisterPage.tsx        # Registration form with academic term and major inputs
        │   └── ForgotPasswordPage.tsx  # Password recovery request form
        │
        ├── student/                    # Student workspace routes (9 core areas)
        │   ├── DashboardPage.tsx       # Prime question: "What do I need to do today?" + Spotlight card
        │   ├── TasksPage.tsx           # Assignment & exam queue with search, category & status filters
        │   ├── SubjectsPage.tsx        # Enrolled courses, instructors, credit hours, study target hours
        │   ├── AvailabilityPage.tsx    # 7-day recurring grid of lectures, jobs & open study windows
        │   ├── SchedulePage.tsx        # Deterministic schedule generator, mode picker & session timeline
        │   ├── CalendarPage.tsx        # Month & week academic calendar with day agenda drawer & .ics export
        │   ├── ProgressPage.tsx        # Study pacing (planned vs done), course balance & streak tracker
        │   ├── NotificationsPage.tsx   # Low-anxiety deadline countdowns & campus announcements
        │   └── SettingsPage.tsx        # Study preferences (daily study cap, session length) & data reset
        │
        └── admin/                      # Admin workspace routes (6 core areas)
            ├── AdminDashboardPage.tsx  # Cohort enrollment metrics, weekly study hours & crunch alerts
            ├── UsersPage.tsx           # Student & faculty directory table with search, role filters & add user
            ├── CurriculumPage.tsx      # Master course catalog manager with credit hours & weekly study hours
            ├── AnnouncementsPage.tsx   # Campus announcement composer with audience targeting & priority
            ├── AnalyticsPage.tsx       # Workload bottleneck heatmaps & course difficulty comparisons
            └── AdminSettingsPage.tsx   # Academic term dates, reading periods, system parameters & audit log
```

### Target Full-Stack Additions (Phase 2 Persistence)

When full-stack backend persistence is connected, the root server architecture mounts Express routes alongside Vite:

```
StudyFlow/ (Target Full-Stack)
├── server.ts                           # Express app entry point & Vite middleware mount
├── prisma/
│   ├── schema.prisma                   # PostgreSQL database schema & relations
│   └── seed.ts                         # Database seeder script
└── src/
    ├── server/                         # Backend Express application
    │   ├── routes/                     # /api/auth, /api/tasks, /api/schedule, etc.
    │   ├── controllers/                # Request validation & HTTP response handling
    │   ├── services/                   # Business logic, Prisma queries & scheduler engine
    │   └── middleware/                 # JWT verification, role authorization, error handling
    └── services/api.ts                 # Frontend HTTP client (fetch/axios) with Bearer token
```

---

## 3. Frontend File Map (Current Implementation Reality)

Every file in `src/` has a single, well-defined responsibility:

| Exact Path | Responsibility | Primary Imports | Consumers | Reusable? | Business Logic? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/main.tsx` | Mounts React 19 app into `#root` DOM element | `React`, `ReactDOM`, `App`, `index.css` | Browser entry | No | None |
| `src/App.tsx` | Declares all 19 application routes and wraps providers | `BrowserRouter`, `Routes`, `Route`, contexts, layouts, pages | `main.tsx` | No | Route declarations |
| `src/index.css` | Tailwind v4 configuration, font imports, `@theme` color tokens | `@import "tailwindcss"` | `main.tsx` | Global | None |
| `src/types/index.ts` | Authoritative TypeScript interfaces & union types | None (Pure TS definitions) | App-wide | Global | None |
| `src/theme/tokens.ts` | Color tokens, subject category color matrix, button/input styles | `SubjectCategory` from types | Components & layouts | Yes | None |
| `src/data/mockData.ts` | Rich realistic college courses, assignments, study sessions, profile | Types from `src/types` | `PlannerContext.tsx` | Yes | Initial state |
| `src/context/AuthContext.tsx` | Authentication state, user profile, role switcher (student/admin) | `createContext`, `useState`, `User` | App-wide (`useAuth`) | Yes | Session management |
| `src/context/PlannerContext.tsx` | StudyFlow state: tasks, subjects, sessions, availability, scheduler | `createContext`, `useState`, `mockData` | App-wide (`usePlanner`)| Yes | State mutations & scheduling |
| `src/context/ToastContext.tsx` | Non-intrusive notification toasts (success, error, info) | `createContext`, `useState`, `lucide-react`| App-wide (`useToast`)| Yes | Toast queue management |
| `src/layouts/StudentLayout.tsx` | Student shell with 3-zone top bar, 3-group sidebar, quick-add modal | `Outlet`, `NavLink`, `useAuth`, `usePlanner` | `App.tsx` | Yes | Shell orchestration |
| `src/layouts/AdminLayout.tsx` | Admin management shell with admin navigation & role switcher | `Outlet`, `NavLink`, `useAuth` | `App.tsx` | Yes | Shell orchestration |
| `src/layouts/PublicLayout.tsx` | Public website shell with navigation and student login links | `Outlet`, `Link` | `App.tsx` | Yes | Shell orchestration |
| `src/layouts/AuthLayout.tsx` | Clean centered auth card with graduation cap branding | `Outlet`, `Link` | `App.tsx` | Yes | Shell orchestration |
| `src/components/ui/Button.tsx` | Accessible button (primary, secondary, ghost, destructive) with loading | `React` | All pages | Yes | None |
| `src/components/ui/Input.tsx` | Accessible input with label, error alert, and helper text | `React` | Forms & modals | Yes | None |
| `src/components/ui/Select.tsx` | Styled accessible dropdown select control | `React` | Forms & modals | Yes | None |
| `src/components/ui/Modal.tsx` | Accessible modal dialog with backdrop, Escape key, and close button | `React`, `X`, `Button` | Quick Add, Forms | Yes | Modal state |
| `src/components/ui/Badge.tsx` | Subject category badge with colored dot and semantic status pills | `SUBJECT_CATEGORY_STYLES` | Pages & lists | Yes | None |
| `src/components/ui/EmptyState.tsx` | Instructive, non-patronizing empty state with primary action | `React`, `Button` | Filtered lists | Yes | None |
| `src/components/ui/Skeleton.tsx` | Accessible loading placeholder pulse | `React` | Future async loading| Yes | None |
| `src/components/ui/ErrorBoundary.tsx` | Top-level crash handler with user-friendly retry button | `React.Component` | `App.tsx` | Yes | Error catching |

---

## 4. Application Routes & Workspaces

The application implements **19 complete, functional routes** across 3 distinct zones. There are zero "Coming Soon" placeholders.

### Public Routes (`PublicLayout` & `AuthLayout`)
1. **`/` (`LandingPage.tsx`)**: Product introduction, "What do I need to do today?" concept preview, feature showcase, student call to action.
2. **`/login` (`LoginPage.tsx`)**: Student and Admin sign-in with pre-filled 1-click demo login buttons for instant exploration.
3. **`/register` (`RegisterPage.tsx`)**: Student registration form capturing name, university email, academic term, and major.
4. **`/forgot-password` (`ForgotPasswordPage.tsx`)**: Clean password reset request screen with recovery instructions.

### Student Workspace (`StudentLayout.tsx`)
1. **`/dashboard` (`DashboardPage.tsx`)**:
   - Answers **"What do I need to do today?"** within 3 seconds.
   - Personalized greeting (`Good morning, Maya! 👋`) with semester progress (`Week 7 of Fall 2026`).
   - Tabular hours gauge: `2.5h of 5.5h done` with remaining study time.
   - Prominent **Next Focus Block** spotlight card with 1-click completion.
   - Two-tone daily study progress bar.
   - Today's chronological study session timeline.
   - Upcoming deadlines queue with urgency tags ($\le 48\text{h}$).
   - Course workload balance overview.
2. **`/tasks` (`TasksPage.tsx`)**:
   - Comprehensive assignment queue with search, category filtering, and status segmented tabs (All, In Progress, Completed).
   - Shows remaining vs estimated hours and subtask checklists.
   - "+ Add Assignment" modal.
3. **`/subjects` (`SubjectsPage.tsx`)**:
   - Enrolled semester courses with course code, instructor, classroom, and office hours.
   - Weekly target study hours per course.
   - "+ Enroll in Subject" modal.
4. **`/availability` (`AvailabilityPage.tsx`)**:
   - 7-day recurring grid (Monday–Sunday) distinguishing class lectures, work shifts, and open study windows.
   - Maximum daily study cap slider ($2.0\text{h}$–$10.0\text{h}$/day) to prevent burnout.
   - Add/remove time slot controls.
5. **`/schedule` (`SchedulePage.tsx`)**:
   - Deterministic study schedule generator.
   - Mode selector: Balanced, Front-Loaded, Pomodoro ($45\text{m}$).
   - Session timeline with course tags and start/end times.
   - 1-click completion and session lock toggle.
   - Overload diagnostic warning banners when demand exceeds capacity.
6. **`/calendar` (`CalendarPage.tsx`)**:
   - Month and week grid integrating classes, assignment due dates, and study blocks.
   - Interactive date selector with day-specific agenda drawer.
   - Export calendar subscription (`.ics`) affordance.
7. **`/progress` (`ProgressPage.tsx`)**:
   - Honest study pacing: hours planned vs hours actually completed this week.
   - Course study distribution vs credit weight balance.
   - Healthy focus streak counter (days without late-night cramming).
   - Weekly qualitative reflection journal.
8. **`/notifications` (`NotificationsPage.tsx`)**:
   - Deadline countdown alerts ($48\text{h}$ and $24\text{h}$).
   - Missed session rescheduling prompts.
   - Campus and department announcements with priority badges.
   - Mark as read / mark all as read controls.
9. **`/settings` (`SettingsPage.tsx`)**:
   - Student profile: Name, email, major, term.
   - Study preferences: Default session duration (50m), daily study cap.
   - Data export to JSON.
   - Reset demo data button to return to initial clean state.

### Admin Workspace (`AdminLayout.tsx`)
1. **`/admin` (`AdminDashboardPage.tsx`)**:
   - Cohort enrollment totals, active planner count, weekly study hours logged.
   - Cohort crunch alerts (identifying overlapping exam crunch weeks).
   - Active campus announcement feed.
2. **`/admin/users` (`UsersPage.tsx`)**:
   - Student, TA, and faculty directory table with search and role filters.
   - Account provisioning modal.
3. **`/admin/subjects` (`CurriculumPage.tsx`)**:
   - Master institutional course catalog management.
   - Course codes, departments, credit hours, expected study hours per week.
   - Add catalog course modal.
4. **`/admin/announcements` (`AnnouncementsPage.tsx`)**:
   - Campus broadcast composer with audience targeting (All, STEM, Humanities).
   - Priority levels: Normal, Important, Critical.
   - Live broadcast feed and publication history.
5. **`/admin/analytics` (`AnalyticsPage.tsx`)**:
   - Semester-long weekly study workload histogram identifying bottleneck weeks.
   - Course difficulty alignment table comparing catalog expectations to actual reported student hours.
6. **`/admin/settings` (`AdminSettingsPage.tsx`)**:
   - Academic term boundaries (Start/end dates, reading period, final exam week).
   - Administrative action audit log.

---

## 5. Visual System & Design Token Architecture

The visual architecture is codified in `src/theme/tokens.ts` and `src/index.css`:

### Brand Palette (Blue & Cyan Core)
- `bluePrimary`: `#0284c7` (`sky-600`) — Primary brand, buttons, active navigation, focus rings.
- `blueHover`: `#0369a1` (`sky-700`) — Button hover and pressed states.
- `blueWash`: `#e0f2fe` (`sky-100`) — Active navigation background, highlight tags.
- `cyanAccent`: `#06b6d4` (`cyan-500`) — Brand accent, spotlight card gradient end.

### Neutral Canvas
- `canvas`: `#f8fafc` (`slate-50`) — Soft light blue-slate page canvas.
- `surface`: `#ffffff` — Cards, modals, top bar, sidebar.
- `surfaceSubtle`: `#f1f5f9` (`slate-100`) — Table headers, secondary control backgrounds.
- `inkPrimary`: `#0f172a` (`slate-900`) — High-contrast display headlines and body text.
- `inkSecondary`: `#475569` (`slate-600`) — Secondary descriptions and metadata.
- `borderSubtle`: `#e2e8f0` (`slate-200`) — Card borders and dividers.

### Subject Category Color Matrix
Each academic discipline receives a vibrant, dedicated palette for instant recognition:
- **Computer Science (`cs`)**: Cyan (`bg-cyan-50`, `text-cyan-800`, `border-cyan-200`, accent `bg-cyan-500`)
- **STEM & Mathematics (`stem`)**: Royal Blue (`bg-blue-50`, `text-blue-800`, `border-blue-200`, accent `bg-blue-600`)
- **Natural Sciences (`science`)**: Fresh Emerald (`bg-emerald-50`, `text-emerald-800`, `border-emerald-200`, accent `bg-emerald-500`)
- **Humanities & Literature (`humanities`)**: Warm Gold (`bg-amber-50`, `text-amber-800`, `border-amber-200`, accent `bg-amber-500`)
- **Social Sciences (`social`)**: Coral Orange (`bg-orange-50`, `text-orange-800`, `border-orange-200`, accent `bg-orange-500`)
- **Arts & Electives (`arts`)**: Violet (`bg-purple-50`, `text-purple-800`, `border-purple-200`, accent `bg-purple-500`)

---

## 6. Scheduling Engine Architecture

The StudyFlow scheduler is a **deterministic, fatigue-aware greedy knapsack algorithm with interval spreading** (Anti-Cram Engine).

```
Task Inventory (due date, remaining hours, priority)
       ↓
Availability Windows (open study slots per day of week)
       ↓
Locked Historical Sessions (cannot be modified)
       ↓
Candidate Time Slot Generator
       ↓
Anti-Cram Spreader (limits single-day task allocation)
       ↓
Fatigue Checker (max 90m per session + 15m break + daily study cap)
       ↓
Conflict Detector (flags shortages when required hours > available capacity)
       ↓
Generated Sessions + Unscheduled Task Warnings
```

### Four Invariant Rules of the Scheduling Algorithm:
1. **Rule 1 (Anti-Cram)**: A task requiring 6 hours due in 4 days is capped at $\le 2\text{ hours/day}$ so it spreads over 3+ days instead of cramming the night before.
2. **Rule 2 (Fatigue Limit)**: Session chunks are bounded to $45\text{m}$–$90\text{m}$ with mandatory rest intervals.
3. **Rule 3 (Daily Study Cap)**: Total daily study hours cannot exceed the student's `targetDailyStudyCapHours` (default 5.5h–6.0h).
4. **Rule 4 (Subject Interleaving)**: When multiple subjects have pending work, the algorithm interleaves different courses across adjacent slots to prevent mental saturation.

### Conflict & Overload Diagnostics:
When the total required study hours before a deadline exceed the available open study windows within the student's daily study cap, the algorithm:
- Does NOT silently discard tasks.
- Emits structured overload warnings (e.g., `"2.5 hours unallocated for CS 201 Problem Set 4 before Oct 8"`).
- Displays actionable diagnostic banners prompting the student to either open up additional availability or adjust study caps.

### 6.1 Scheduler Input Contract: Availability & Study Preferences
The deterministic scheduler engine strictly consumes the following validated contract from the database:

1. **Day-of-Week Representation**:
   - Standard 0-indexed integers: `0 = Sunday`, `1 = Monday`, `2 = Tuesday`, `3 = Wednesday`, `4 = Thursday`, `5 = Friday`, `6 = Saturday`.
2. **Time Format & Boundary Semantics**:
   - `startTime` and `endTime` are 24-hour time strings in format `HH:mm` (e.g. `"09:00"`, `"14:30"`).
   - Time intervals are **half-open `[startTime, endTime)`**:
     - A slot spanning `09:00` to `11:30` includes minute `09:00` up to `11:29:59`.
     - An adjacent slot starting at `11:30` is completely valid and does NOT conflict.
   - Single-day invariant: `startTime < endTime`. Overnight windows crossing midnight (e.g. `23:00` to `02:00`) must be split into two discrete day slots (`23:00`–`23:59` and `00:00`–`02:00`).
3. **Slot Types & Availability Classification**:
   - `PREFERRED_STUDY`: Open study window candidate for scheduling study sessions.
   - `CLASS`: In-person lecture, lab, or recitation (fixed commitment; blocks study scheduling).
   - `WORK`: Campus employment, work shift, or internship (fixed commitment; blocks study scheduling).
   - `PERSONAL`: Athletics, clubs, meals, family commitments (fixed commitment; blocks study scheduling).
4. **Study Preferences & Unit Boundaries**:
   - `targetDailyStudyCapHours`: Float, units in hours (range: `1.0` to `14.0`, default `5.5h`). Upper bound on total scheduled study hours for any single calendar day.
   - `defaultSessionMinutes`: Integer, units in minutes (range: `20` to `180`, default `50m`). Target chunk size for allocating study sessions.
   - `preferredBreakMinutes`: Integer, units in minutes (range: `5` to `60`, default `10m`). Mandatory rest interval placed between consecutive sessions.
   - `preferredStudyTime`: String enum (`"morning"`: 08:00–12:00, `"afternoon"`: 12:00–17:00, `"evening"`: 17:00–22:00, or `"flexible"`). Used by the knapsack weight heuristic to prioritize preferred intervals.
   - `bufferMinutes`: Integer, units in minutes (range: `0` to `45`, default `15m`). Travel/setup buffer required around fixed commitments (`CLASS`, `WORK`).
5. **Timezone Assumption**:
   - Availability recurring slots are evaluated in the student's campus local time. Deadlines stored in UTC are projected into campus local time when matching against day slots.

### 6.2 Schedule & Study Session Persistence Contract
Before the future recursive scheduling algorithm runs, the persistent data layer establishes concrete operational invariants:

1. **Schedule Boundary & Representation**:
   - `Schedule` entity anchors multi-day planning runs (`startDate` to `endDate`, `mode`: `BALANCED` | `FRONT_LOADED` | `POMODORO`).
   - Querying schedules (`GET /api/schedule`) caps date ranges to $\le 60\text{ days}$ to protect server resources.
   - Sessions are always ordered chronologically: `[{ date: 'asc' }, { startTime: 'asc' }]`.
2. **Locking Semantics & Lock Preservation**:
   - When a student locks a study session (`locked: true`), the session becomes immutable against automatic schedule regeneration.
   - Locked sessions cannot be rescheduled, shifted in time, or deleted without explicit confirmation (`unlockExplicit: true` or `force: true`).
3. **Idempotent Workload Reconciliation**:
   - When a study session transitions to `COMPLETED`:
     - Its duration (in hours, e.g. 90m = 1.5h) is deducted from the parent task's `remainingHours`.
     - When `remainingHours` reaches `0`, the task status automatically updates to `COMPLETED`.
   - Idempotency guarantee: Repeatedly submitting `COMPLETED` status does not subtract time twice.
   - If a session is reopened (`SCHEDULED` / `MISSED` / `CANCELLED`), the deducted study hours are restored to the task's remaining workload.
4. **Collision Prevention**:
   - Overlapping study sessions for the same student on the same day are rejected inside database transactions (`intervalsOverlap: startA < endB && startB < endA`).
   - Adjacent boundary sessions (`endA == startB`) are valid and permitted.

### 6.3 Progress Metrics & Notification Event Architecture
The progress analytics and student notification subsystems operate on authoritative database records:

1. **Progress Metric Definitions (Authoritative)**:
   - **Deliverable Completion**: A task is counted as completed if `task.status === 'COMPLETED'` or `task.remainingHours <= 0`.
   - **Workload Hours**:
     - `totalEstimatedHours`: $\sum \text{task.estimatedHours}$.
     - `totalRemainingHours`: $\sum \text{active task.remainingHours}$.
     - `totalCompletedWorkloadHours`: $\max(0, \text{totalEstimatedHours} - \text{totalRemainingHours})$.
   - **Session Completion**: Count of sessions marked `completed: true` or `status: COMPLETED`.
   - **Logged Study Hours**: Derived directly from `actualMinutesLogged` on completed sessions (or session `durationMinutes` if not explicitly logged).
   - **Subject Attention Levels**:
     - `needs_attention`: If subject has past-due assignments or remaining workload exceeds scheduled time by $> 4\text{ hours}$.
     - `on_track`: Active work is covered by planned sessions.
     - `healthy`: All deliverables completed or caught up.
2. **Notification Event Invariants**:
   - Supported categories: `deadline`, `overdue`, `conflict`, `schedule`, `task_completed`, `announcement`.
   - **Idempotent Event Syncing**: `/api/notifications/sync-events` evaluates approaching deadlines (within 48 hours), past-due deliverables, and campus broadcasts. Events use key uniqueness `category:relatedId` to prevent duplicate notification creation across dashboard refreshes.
   - **Privacy Boundary**: All progress metrics and notifications strictly isolate records by `userId = req.user.userId`.

### 6.4 Administrative Governance & Permissions Architecture
Institutional administration operations enforce strict server-side authorization:

1. **Server-Side Authorization Invariant**:
   - Every administrative endpoint (`/api/admin/*`) strictly applies `authenticate` followed by `requireRole('admin')`.
   - Hidden frontend navigation links are never relied upon for security; unauthenticated callers receive `401 Unauthorized`, and students receive `403 Forbidden`.
2. **User Governance & Sensitive Field Protection**:
   - `passwordHash`, session secrets, and internal tokens are never selected or returned in administrative user queries.
   - **Last-Admin Safeguard**: Attempting to demote or remove the last active institutional administrator returns `403 Forbidden` to ensure the system remains manageable.
   - **Self-Demotion Safeguard**: Administrators are prevented from self-demoting to avoid accidental administrative lockouts.
3. **Master Catalog vs Personal Subject Separation**:
   - Personal student subjects belong strictly to individual students (`userId`).
   - The global course catalog (`GET /api/admin/catalog`) aggregates distinct courses across departments with enrollment counts without exposing individual student schedules or personal task inventories.
4. **Institutional Announcements**:
   - Author metadata is automatically attached from the authenticated administrator principal.
   - Supports audience cohorts (`all`, `stem`, `humanities`, `undergrad`) and priorities (`normal`, `important`, `critical`).

---

## 7. Target Backend Architecture & Prisma Schema (Phase 2)

When backend database persistence is provisioned, the authoritative schema maps directly to the TypeScript interfaces established in `src/types/index.ts`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  STUDENT
  ADMIN
  ADVISOR
  TA
}

enum Priority {
  URGENT
  HIGH
  MEDIUM
  LOW
}

enum TaskStatus {
  BACKLOG
  SCHEDULED
  IN_PROGRESS
  COMPLETED
}

enum SlotType {
  PREFERRED_STUDY
  CLASS
  WORK
  PERSONAL
}

enum ScheduleMode {
  BALANCED
  FRONT_LOADED
  POMODORO
}

model User {
  id                       String             @id @default(uuid())
  email                    String             @unique
  passwordHash             String
  name                     String
  role                     Role               @default(STUDENT)
  major                    String?
  term                     String?            @default("Fall 2026")
  targetDailyStudyCapHours  Float              @default(6.0)
  defaultSessionMinutes    Int                @default(50)
  preferredStudyTime       String?            @default("afternoon")
  createdAt                DateTime           @default(now())
  updatedAt                DateTime           @updatedAt

  subjects                 Subject[]
  tasks                    Task[]
  availabilitySlots        AvailabilitySlot[]
  schedules                Schedule[]
  studySessions            StudySession[]

  @@index([email])
}

model Subject {
  id                 String         @id @default(uuid())
  userId             String
  code               String         // e.g. "MATH 241"
  name               String         // e.g. "Calculus III"
  instructor         String?
  credits            Int            @default(3)
  colorKey           String         @default("cs")
  weeklyTargetHours  Float          @default(6.0)
  classroom          String?
  officeHours        String?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  user               User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks              Task[]
  studySessions      StudySession[]

  @@index([userId])
}

model Task {
  id               String         @id @default(uuid())
  userId           String
  subjectId        String
  title            String
  dueDate          DateTime
  estimatedHours   Float          @default(2.0)
  remainingHours   Float          @default(2.0)
  type             String         @default("assignment")
  priority         Priority       @default(MEDIUM)
  status           TaskStatus     @default(BACKLOG)
  notes            String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject          Subject        @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  studySessions    StudySession[]

  @@index([userId, status])
  @@index([dueDate])
}

model AvailabilitySlot {
  id           String    @id @default(uuid())
  userId       String
  dayOfWeek    Int       // 0 = Sunday, 1 = Monday ... 6 = Saturday
  startTime    String    // "09:00"
  endTime      String    // "11:30"
  type         SlotType  @default(PREFERRED_STUDY)
  label        String?
  createdAt    DateTime  @default(now())

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, dayOfWeek])
}

model Schedule {
  id             String         @id @default(uuid())
  userId         String
  startDate      DateTime
  endDate        DateTime
  mode           ScheduleMode   @default(BALANCED)
  createdAt      DateTime       @default(now())

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions       StudySession[]

  @@index([userId])
}

model StudySession {
  id                   String     @id @default(uuid())
  userId               String
  scheduleId           String?
  taskId               String
  subjectId            String
  date                 String     // "YYYY-MM-DD"
  startTime            String     // "10:00"
  endTime              String     // "11:30"
  durationMinutes      Int        @default(90)
  completed            Boolean    @default(false)
  actualMinutesLogged  Int?
  locked               Boolean    @default(false)
  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt

  user                 User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  schedule             Schedule?  @relation(fields: [scheduleId], references: [id], onDelete: SetNull)
  task                 Task       @relation(fields: [taskId], references: [id], onDelete: Cascade)
  subject              Subject    @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@index([taskId])
}

model Announcement {
  id              String    @id @default(uuid())
  title           String
  content         String
  author          String
  priority        String    @default("normal")
  targetCohort    String    @default("all")
  publishedAt     DateTime  @default(now())
  expiresAt       DateTime?

  @@index([publishedAt])
}
```

---

## 8. File Ownership & Layer Dependency Rules

```
Pages (Routing & Layout Integration)
   ↓
Components (Presentation & User Micro-Interactions)
   ↓
Contexts / Custom Hooks (Client State Orchestration)
   ↓
Theme Tokens & Utils (Styling & Pure Calculations)
   ↓
Data (Initial Mock Seeds / Future API Client)
```

### Strict Architectural Boundaries:
1. **Pages** own top-level layout composition and route-level state wiring. Pages must never perform low-level DOM manipulations or invent ad-hoc styling outside `DESIGN.md`.
2. **Components** own presentation and accessibility (ARIA attributes, keyboard navigation, focus rings). UI primitives in `src/components/ui/` are completely domain-agnostic.
3. **Contexts** (`PlannerContext`, `AuthContext`, `ToastContext`) own application state mutation and scheduling orchestration.
4. **Theme Tokens** (`src/theme/tokens.ts`) and **Tailwind Directives** (`src/index.css`) own the color system, category styles, and font hierarchies.
5. **No Circular Dependencies**: Lower-level primitives never import higher-level components or layouts.

---

## 9. Verification & Anti-Over-Engineering Commitment

- **No Microservices**: Single cohesive full-stack application.
- **No Redux / MobX**: Standard React 19 state and Context hooks handle all state with zero boilerplate.
- **Deterministic Scheduling**: No stochastic AI calls or unpredictable LLM hallucinations for scheduling.
- **Zero-Warning TypeScript**: All code compiles cleanly (`tsc --noEmit`) with strict type safety.
- **Instant Usability**: Every route renders an active, responsive, interactive workspace.
