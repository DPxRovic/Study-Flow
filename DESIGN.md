# StudyFlow — Design System & Visual Constitution

> **Document Status**: Canonical Visual & UX Authority (Primary Standard)  
> **Visual Identity**: Colorful Academic Atelier / Student-First Academic Utility  
> **Core Mandate**: COLORFUL + POLISHED + PURPOSEFUL (Never Minimal + Bland + Sterile)

---

## 1. Design Philosophy

StudyFlow is designed specifically for **college students**. It must feel like an encouraging, modern academic companion that reduces stress and clarifies daily study priorities.

### What StudyFlow Feels Like:
- **Colorful**: Energetic, meaningful color used across subjects, statuses, progress bars, and brand anchors.
- **Friendly & Approachable**: Warm greetings, inviting typography, and clear scannable layouts.
- **Academic**: Grounded in real college course rhythms, credit hours, lecture windows, and syllabus milestones.
- **Energetic**: High-contrast focal points, motivating day progress gauges, and distinct interactive feedback.
- **Organized & Trustworthy**: Predictable controls, reliable time calculations, and clean alignment.
- **Modern & Polished**: Soft rounded corners, subtle depth, crisp hairline borders, and fluid responsive layouts.

### What StudyFlow Must NEVER Feel Like:
- ❌ **Corporate or Clinical**: No drab gray enterprise interfaces or sterile bureaucratic forms.
- ❌ **Monochrome or Overly Minimalist**: No stark black-and-white layouts that strip away color and personality under the guise of "minimalism".
- ❌ **Developer-Tool-Like**: No mechanical terminal prefixes (`// 01_OVERVIEW`, `>_ SYSTEM`).
- ❌ **Generic AI SaaS Template**: No purple/blue neon gradients, floating glassmorphism blur panels, or fake innovation scores.
- ❌ **Cardception**: No cards nested inside cards nested inside cards.

---

## 2. Visual References (Inspiration Only)

StudyFlow draws visual inspiration from the product personality of **MyStudyLife**:
- **What We Emulate**:
  - The vibrant, colorful student-planner personality.
  - Distinct subject color-coding that makes schedules immediately scannable.
  - Friendly, modern typography and inviting greeting hierarchy.
  - Polished composition with clear primary actions and varied visual rhythm.
- **What We Must NOT Copy**:
  - Do NOT copy MyStudyLife's logo, brand mark, exact layout templates, proprietary icons, or wording.
  - StudyFlow retains its own distinct **Blue/Cyan academic brand identity** and unique deterministic scheduling mechanics.

---

## 3. Color System

Color is a foundational pillar of the StudyFlow brand. Blue and cyan establish the brand and primary actions, while semantic and category colors communicate functional meaning.

### Brand Tokens (Blue & Cyan Core)
| Token | Hex Value | Tailwind Class | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| `primary` | `#0284c7` | `bg-sky-600` | Primary brand color, primary CTAs, active highlights |
| `primaryHover` | `#0369a1` | `hover:bg-sky-700`| Button hover and pressed states |
| `primaryLight` | `#e0f2fe` | `bg-sky-50` / `bg-sky-100` | Active navigation pill background, selected date chips |
| `primaryDark` | `#075985` | `text-sky-900` | Dark brand text on light blue surfaces |
| `cyanAccent` | `#06b6d4` | `text-cyan-500` / `bg-cyan-500`| Secondary brand accent, spotlight card gradient end |

### Surface & Neutral Tokens
| Token | Hex Value | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| `pageBackground` | `#f8fafc` | `bg-slate-50` | Soft, light blue-slate page canvas (not stark white, not drab gray) |
| `surface` | `#ffffff` | `bg-white` | Primary content cards, modals, top bar, sidebar |
| `surfaceSubtle` | `#f1f5f9` | `bg-slate-100` | Table headers, secondary control backgrounds |
| `text` | `#0f172a` | `text-slate-900` | High-contrast display headlines and primary body prose |
| `mutedText` | `#475569` | `text-slate-600` | Secondary descriptions, timestamps, metadata |
| `tertiaryText` | `#94a3b8` | `text-slate-400` | Placeholders, subtle helper text |
| `border` | `#e2e8f0` | `border-slate-200` | Card borders, table dividers (hairline 1px) |
| `borderStrong` | `#cbd5e1` | `border-slate-300` | Form input borders, active borders |

### Semantic State Colors
| Semantic State | Base Color | Light Wash | Text Token | Meaning / Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Success / Completed** | `#10b981` (`emerald-500`) | `#ecfdf5` (`emerald-50`) | `text-emerald-800` | Completed study sessions, on-time submissions |
| **Warning / Imminent** | `#f59e0b` (`amber-500`) | `#fffbeb` (`amber-50`) | `text-amber-800` | Deadlines due in $\le 48\text{h}$, high workload alert |
| **Danger / Overdue** | `#f43f5e` (`rose-500`) | `#fff1f2` (`rose-50`) | `text-rose-800` | Overdue assignments, schedule overload diagnostics |
| **Informational** | `#0284c7` (`sky-600`) | `#f0f9ff` (`sky-50`) | `text-sky-800` | System notices, study reminders |

### Subject Category Color Matrix
Each academic discipline receives a vibrant, dedicated palette for instant recognition:
- **Computer Science**: Cyan (`bg-cyan-50`, `text-cyan-800`, `border-cyan-200`, accent bar `bg-cyan-500`)
- **STEM & Mathematics**: Royal Blue (`bg-blue-50`, `text-blue-800`, `border-blue-200`, accent bar `bg-blue-600`)
- **Natural Sciences**: Fresh Emerald (`bg-emerald-50`, `text-emerald-800`, `border-emerald-200`, accent bar `bg-emerald-500`)
- **Humanities & Literature**: Warm Gold (`bg-amber-50`, `text-amber-800`, `border-amber-200`, accent bar `bg-amber-500`)
- **Social Sciences & History**: Coral Orange (`bg-orange-50`, `text-orange-800`, `border-orange-200`, accent bar `bg-orange-500`)
- **Arts & Electives**: Violet (`bg-purple-50`, `text-purple-800`, `border-purple-200`, accent bar `bg-purple-500`)

---

## 4. Typography Hierarchy

StudyFlow uses two intentional Google Fonts:
1. **`Plus Jakarta Sans`**: Modern, warm geometric humanist sans-serif for headlines, navigation, and body text.
2. **`JetBrains Mono`** (with `tabular-nums`): Monospace figures strictly for times, durations, countdowns, and tabular hours.

### Type Scale
- **Page Display / Title**: `24px`–`30px` (`text-2xl` sm: `text-3xl`), font-weight 800 (Extrabold), tracking `-0.025em`, line-height 1.2.
- **Section Heading (H2)**: `18px`–`20px` (`text-lg` sm: `text-xl`), font-weight 700 (Bold), tracking `-0.015em`.
- **Card Title / Group Heading (H3)**: `15px`–`16px` (`text-sm` sm: `text-base`), font-weight 700 (Bold).
- **Body Prose**: `14px` (`text-sm`), font-weight 500 (Medium), line-height 1.5, color `text-slate-600`.
- **Secondary / Captions**: `12px`–`13px` (`text-xs`), font-weight 500, color `text-slate-500`.
- **Micro Badges**: `11px` (`text-[11px]`), font-weight 700, uppercase tracking `0.04em` or title case.
- **Time & Hour Figures**: `JetBrains Mono font-bold tabular-nums`.

### Typography Discipline Rules:
- Avoid tiny gray text for important data.
- Avoid all-caps shouting in section headers.
- Always apply `text-wrap: balance` on hero titles to prevent awkward orphan words.

---

## 5. Spacing Scale

Built on a disciplined 4px / 8px modular scale:
- `space-1`: `4px` (gap between icon and adjacent text)
- `space-2`: `8px` (button internal gap, badge padding)
- `space-3`: `12px` (input vertical padding, compact list gap)
- `space-4`: `16px` (card padding, container spacing)
- `space-5`: `20px` (hero spotlight card padding)
- `space-6`: `24px` (section separation, desktop gutters)
- `space-8`: `32px` (major page block rhythm)

---

## 6. Shape Language & Border Radius

Surfaces use modern, friendly rounding:
- **Small Controls (`rounded-lg` / 8px)**: Inputs, buttons, dropdown selects, badge tags.
- **Medium Panels (`rounded-xl` / 12px)**: Timeline session items, list rows, notification cards.
- **Large Hero Surfaces (`rounded-2xl` / 16px)**: Dashboard spotlight cards, course overview cards, major modal dialogs.
- **Full Capsules (`rounded-full`)**: Status pills, category dots, avatar circles.
- **Anti-Cardception Formula**: Do NOT nest rounded cards inside rounded cards inside rounded cards. Use flat rows with hairline dividers (`divide-y divide-slate-100`) inside a single-level parent container.

---

## 7. Elevation, Surfaces & Depth System (Prompt 3.7)

StudyFlow uses a purposeful **5-Level Layered Hierarchy & Soft-Morphism Architecture** that replaces flat SaaS containers with tangible physical surfaces:

### The 5-Level Surface Architecture:
1. **Level 0 — Environmental Canvas (`bg-academic-canvas`)**:
   - Soft `#f8fafc` canvas infused with radial sky ambiance and a delicate 28px blueprint grid (`radial-gradient(rgba(14, 165, 233, 0.09) 1px, transparent 1px)`).
   - Prevents sterile, empty dead-white voids.
2. **Level 1 — Surface Base (`surface-base`)**:
   - Primary content cards, timetable frames, radar panels, and top bars.
   - Dual-layer lighting: crisp 1px border (`rgba(226, 232, 240, 0.95)`) + top hairline inset highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.95)`) + soft drop shadow (`0 1px 3px rgba(15, 23, 42, 0.04)`).
3. **Level 2 — Elevated Surface (`surface-elevated`)**:
   - Interactive popovers, active modal drawers, and floating toolbars.
   - Multi-layer elevation shadow (`0 6px 16px -2px rgba(15, 23, 42, 0.07)`).
4. **Level 3 — Focal Surface (`surface-focal`)**:
   - The commanding academic hero anchor (e.g. Dashboard "Next Up" block).
   - Deep collegiate slate-950/navy gradient with glowing sky-500 rim lighting and subtle radial bloom.
5. **Level 4 — Recessed Wells & Insets (`surface-inset`)**:
   - Form inputs, search fields, progress track troughs, and metric wells.
   - Inner shadow (`inset 0 1.5px 3px rgba(15, 23, 42, 0.05)`) creating physical dimensionality.
6. **Academic Binder Motif (`surface-binder`)**:
   - Course cards, timetable blocks, and advisory alerts featuring a dedicated 4px left color spine matching the course category.

### Tactile Interactive Controls:
- **`btn-tactile-primary`**: Vertical gradient (`#0284c7` $\to$ `#0369a1`), top hairline rim highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.28)`), and physical active press depression (`translate-y-[0.5px]`).
- **`btn-tactile-secondary`**: Crisp white-to-slate gradient with top rim highlight and subtle hover lift (`translate-y-[-1px]`).

---

## 8. Navigation & Sidebar Contract

### Student Sidebar
- **Width**: `240px` (desktop), collapsible off-canvas drawer on mobile.
- **Grouping**: Three clean logical groups with subtle uppercase category labels (`OVERVIEW`, `PLANNING & TIME`, `INSIGHTS & SYSTEM`).
- **Active Navigation Treatment**:
  - `bg-sky-50 text-sky-700 font-bold border border-sky-100 shadow-2xs`
  - High-contrast icon in `text-sky-600`
  - Active badge counter filled in solid `bg-sky-600 text-white`
- **Inactive Navigation Treatment**:
  - `text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold`
  - Icon in `text-slate-400`
- **Student Profile Anchor**: Bottom card with avatar initials ("ML"), student name, major, and sign-out link.

### Top Bar Contract
- **Zone 1 (Brand)**: Graduation cap logo in sky/cyan gradient + bold `StudyFlow` wordmark + current semester badge (`Fall 2026`).
- **Zone 2 (Context)**: Active view breadcrumb (`Dashboard / Today`).
- **Zone 3 (Actions)**: Vibrant `+ New Task` primary button + instant Student $\leftrightarrow$ Admin role switcher.

---

## 9. Buttons

1. **Primary Button** (`Button variant="primary"`):
   - Background: `bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white`
   - Typography: `font-semibold text-xs sm:text-sm`
   - Shadow & Motion: `shadow-xs hover:shadow-sm active:scale-[0.99] transition-all`
2. **Secondary Button** (`Button variant="secondary"`):
   - Background: `bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs`
3. **Ghost Button** (`Button variant="ghost"`):
   - Background: `bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900`
4. **Destructive Button** (`Button variant="destructive"`):
   - Background: `bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200`
5. **Loading State**: Accessible spinner replaces icon while retaining button dimensions (`aria-busy="true"`).

---

## 10. Forms & Input Controls

- **Base Input / Select**: White background, `border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900`.
- **Focus State**: `focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500`.
- **Label**: `text-xs font-semibold text-slate-800 mb-1.5`, required fields marked with red asterisk (`*`).
- **Inline Error**: `text-xs text-rose-600 mt-1 flex items-center gap-1` with alert icon.
- **Helper Text**: `text-xs text-slate-500 mt-1`.

---

## 11. Dashboard Philosophy

When a student opens StudyFlow, the dashboard must answer within 3 seconds:

> **"What do I need to do today?"**

### Priority Order:
1. **Greeting & Time Gauge**: Personalized greeting (`Good morning, Maya! 👋`) + date + total study hours planned vs. completed today.
2. **Hero Spotlight Card ("Next Up")**: Prominent, vibrant colored card (`bg-gradient-to-br from-sky-600 via-sky-700 to-cyan-700 text-white rounded-2xl`) highlighting the current or next immediate study block with a prominent 1-click completion button.
3. **Today's Progress Bar**: Two-tone visual bar displaying percentage of daily planned study hours achieved.
4. **Today's Schedule Timeline**: Chronological sessions with colored category tags and completion checkmarks.
5. **Upcoming Due Dates Queue**: Imminent deadlines with amber/coral countdown tags.
6. **Weekly Subject Balance**: Horizontal distribution bars comparing actual study time to course credit expectations.

---

## 12. Page Composition & Varied Information Hierarchy

Different pages serve different mental modes and must NOT all look like identical card grids:
- **Tasks (`/tasks`)**: Structured work queue with search, category dropdown, segmented status tabs (Active, Done, All), and subtask checklists.
- **Calendar (`/calendar`)**: Calendar-first layout with month navigation, day cells indicating deadlines and sessions, plus day-specific agenda drawer.
- **Availability (`/availability`)**: Schedule-builder grid (Monday–Sunday) showing recurring classes vs open study windows, plus daily study cap slider.
- **Progress (`/progress`)**: Visualization-oriented analytics with real hours pacing, course balance bars, and qualitative reflection journal.
- **Notifications (`/notifications`)**: Activity feed format with deadline countdowns, campus alerts, and mark-all-as-read controls.
- **Admin Console (`/admin/*`)**: High-density management tables with cohort enrollment metrics, master curriculum catalogs, and campus broadcast composers.

---

## 13. Color Usage & Meaning

Color is intentionally purposeful:
- **Blue & Cyan**: Core brand anchor, primary action points, active routes, schedule generation.
- **Emerald**: Task and session completion, positive pacing adherence, verified requirements.
- **Amber**: Deadlines within $\le 48\text{h}$, warnings, approaching midterms, administrative alerts.
- **Rose / Coral**: Overdue tasks, schedule overload shortages, destructive actions.
- **Subject Hues**: Instant visual differentiation of courses in calendars, timelines, and queues.

---

## 14. Anti-AI-Slop Rules

### What is Strictly BANNED:
- ❌ Meaningless purple/magenta AI gradients.
- ❌ Glassmorphism (`backdrop-blur` cards with unreadable contrast).
- ❌ Floating cardception (cards nested inside cards).
- ❌ Random decorative blobs and confetti.
- ❌ Giant decorative icons used simply to fill whitespace.
- ❌ Emoji used as primary interface icons.
- ❌ Fabricated AI vanity scores ("94% Innovation Mastery").
- ❌ Excessive bounce animations that delay student interaction.

### What is Explicitly ENCOURAGED:
- ✅ **Vibrant Blue/Cyan branding** that gives StudyFlow a memorable, polished identity.
- ✅ **Rich colored surfaces** (such as the gradient Next Up spotlight card).
- ✅ **Distinct subject category tags** that make scanning courses fast and joyful.
- ✅ **Expressive empty states** with clear instructions and primary CTAs.
- ✅ **Rounded controls and soft shadows** that feel tactile and modern.
- ✅ **Two-tone progress bars and visual gauges** that make study progress feel rewarding.

---

## 15. Accessibility (WCAG 2.1 AA)

- **Contrast Ratios**: All text meets minimum 4.5:1 contrast against its background (navy on light blue, white on sky-600).
- **Focus Visibility**: Clear `:focus-visible` rings on all interactive elements (`ring-2 ring-sky-500/40`).
- **Non-Color-Only Communication**: Status indicators pair color with text labels or distinct icons (checkmark for done, clock for due soon, alert circle for overdue).
- **Touch Targets**: Minimum touch target size of $44\text{px} \times 44\text{px}$ on mobile viewports.
- **Semantic HTML**: Proper use of `<main>`, `<nav>`, `<aside>`, `<header>`, `<h1>`–`<h3>`, `<button>`, and `<label>`.

---

## 16. Responsive Behavior

- **Desktop ($\ge 1024\text{px}$)**: Fixed 240px sidebar, 3-zone top bar, 5-column dashboard split (3-col timeline + 2-col deadlines).
- **Tablet ($640\text{px}$–$1023\text{px}$)**: Sidebar collapses to clean rail or drawer; dashboard stacks into 2 columns.
- **Mobile ($< 640\text{px}$)**:
  - Sticky top header $\le 56\text{px}$ with hamburger drawer trigger.
  - Off-canvas navigation drawer with full accessible menu.
  - Single-column flow with full-width action buttons.
  - Tap targets $\ge 44\text{px}$ for easy thumb operation between lectures.

---

## 17. Authentication Architecture & Atelier System Design

- **Dedicated Route-Based Flow**:
  - StudyFlow authentication **strictly** uses dedicated full-page routes (`/login`, `/register`, `/forgot-password`).
  - Authentication is **NEVER** displayed as a modal dialog, popup, overlay, or portal from the public landing page or header.
  - Clicking "Sign In" from the landing page or header navigates directly to `/login`.
  - Clicking "Get Started Free" from the landing page or header navigates directly to `/register`.
  - Logging out immediately navigates to `/login` to render the exact same dedicated split-screen login page.
- **The Auth Surface (Critical Distinction)**:
  - The right side of `AuthLayout` contains an **Auth Surface** (`surface-base bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-9`).
  - The Auth Surface is an **elevated container** that is a permanent, embedded part of the page composition.
  - It is **NOT** a modal dialog, overlay, popup, portal, or backdrop.
  - There is **never** a darkened or blurred landing page behind the authentication form.
- **Surface Morphism & Depth Hierarchy**:
  - Replaced flat white sheets with a strict 5-layer material depth model (`bg-academic-canvas`, `surface-base`, `surface-card`, `surface-elevated`, `surface-inset`, and `surface-binder`).
  - Added hairline inset highlights (`inset 0 1px 0 rgba(255,255,255,0.9)`) on all tactile cards and buttons.
- **Editorial Typography & Tabular Figures**:
  - Strict requirement that all credit values, hour counts, fatigue ceilings, and time intervals render with `font-mono tabular-nums`.
- **Public Landing Page Overhaul**:
  - Asymmetric editorial hero with academic badges, interactive credit load and fatigue pacing simulator, and tactile student schedule preview console.
  - Split comparison board exposing the "Unbounded Syllabus Trap" against the "StudyFlow Spaced Scheduling Method".
- **Purge of Legacy Color Tokens**:
  - Completely removed all legacy palette hex values (`#1b4d3e`, `#1c1f24`, `#d5d1c6`, `#e8e6df`, `#be123c`, etc.) across all components, modals, and admin pages, replacing them with StudyFlow's cohesive slate and sky design tokens.
