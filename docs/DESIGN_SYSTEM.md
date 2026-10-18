# StudyFlow Design System Specification

> **Document Status**: Canonical Architecture & Design Contract  
> **Version**: 2.0.0 (Post-Visual Refinement Pass)  
> **Target Audience**: College Students, Academic Advisors, AI Coding Agents, Frontend Engineers  
> **Design Philosophy**: Colorful Academic Atelier / Student-First Academic Utility  
> **Core Mandate**: COLORFUL + POLISHED + PURPOSEFUL (Never Minimal + Bland + Sterile)

---

## 1. Design Philosophy & Impeccable Critique Principles

StudyFlow is designed specifically for **college students** managing dense coursework, multiple exam dates, competing deadlines, and irregular study hours. It is **not** a generic B2B SaaS dashboard or sterile enterprise tool.

### Core Product Principles
1. **Student-First**: Built around the cognitive reality of a student: limited attention, anxiety over impending deadlines, fragmented study windows between lectures, and fatigue.
2. **Simple Before Clever**: A student must get answers in under 3 seconds. The interface must not demand tedious configuration before providing value.
3. **Information Hierarchy Over Decoration**: Deadlines, hours remaining, and subject clarity always trump decorative art, background illustrations, or fancy cards.
4. **Clear Deadlines and Actions**: Every pending assignment must clearly convey *when* it is due, *how many hours* are estimated, and *when the next study block is scheduled*.
5. **Low Cognitive Load**: Calm light-blue canvas, high-contrast typography, zero flashing animations, and purposeful academic color tags reduce academic stress.
6. **Fast Navigation**: Instant switching between today's plan, task lists, subjects, and calendar.
7. **Responsive & Mobile-Friendly**: Students check tasks on their phone walking between classes, then open their laptop in the library to plan their week.
8. **Accessible (WCAG 2.1 AA)**: High contrast, keyboard navigation, focus rings (`focus-visible:ring-2`), and accessible button dimensions.
9. **Consistent**: Single elevation depth, unified spacing scale, predictable control placement.
10. **Realistic Rather Than Flashy**: A schedule generation engine that accounts for realistic human fatigue, meal breaks, and actual course weights—not fake AI vanity scores.

---

## 2. Anti-AI-Slop Rules & Strict Bans

Every screen, component, and style in StudyFlow must adhere to the following anti-slop rules:

| Banned Anti-Pattern | Reason for Ban | Mandatory StudyFlow Alternative |
| :--- | :--- | :--- |
| **Purple/Blue Neon Gradients & Generic AI Cockpits** | Creates eye fatigue, screams generic AI template | Vibrant Blue/Cyan brand identity (`#0284c7`, `#06b6d4`), soft light-blue canvas (`#f8fafc`), clean white surfaces (`#ffffff`) |
| **Glassmorphism (`backdrop-blur` cards with translucent borders)** | Severe contrast and readability issues | Solid opaque surfaces with crisp 1px hairline dividers (`#e2e8f0`) |
| **Monochrome / Sterile Minimalism** | Makes app look like a documentation site or developer CLI | Purposeful, energetic academic color tokens across subjects, statuses, and day gauges |
| **Cards Inside Cards (Nested Card Sandwiches)** | Creates Russian-doll visual claustrophobia | Flat single-elevation surfaces divided by whitespace (`16px`–`24px`) and hairline dividers |
| **Floating Stat Cockpits & Fake Innovation Scores** | Hallucinated SaaS vanity metrics ("94% Innovation", "88% Study Mastery") | Real, actionable quantities with units: `"3 assignments due this week"`, `"2.5h of 5.5h done"`, `"1 overdue"` |
| **Decorative Emoji as Interface Icons** | Feels childish, inconsistent rendering across OS | Lucide SVG icons used strictly for functional affordances (Search, Filter, Calendar, Clock, Check) |
| **Line-by-Line Decorative Icons** | Visual noise that destroys text alignment | Left-aligned text with consistent indentation; icons only on action buttons or status indicators |
| **Excessive Micro-Animations & Page Bouncing** | Distracts and slows down students who just want to see their work | Subtle, instant transitions with gentle active press feedback (`active:scale-[0.99]`) |
| **Mechanical Code Comments in Headings (`// 01_OVERVIEW`)** | Developer artifact pretending to be design | Natural, human, collegiate titles: `"Today's Focus"`, `"Upcoming Milestones"`, `"Subject Workload"` |

---

## 3. The 17 Core Design Requirements

### 1. Color System (Blue & Cyan Core + Academic Disciplines)
Codified in `src/theme/tokens.ts` and `src/index.css`:

- **Brand Tokens (Blue & Cyan Core)**:
  - `bluePrimary`: `#0284c7` (`sky-600`) — Primary CTA, active navigation highlights
  - `blueHover`: `#0369a1` (`sky-700`) — Hover state
  - `blueWash`: `#e0f2fe` (`sky-100`) — Selected nav pill background, highlighted tags
  - `cyanAccent`: `#06b6d4` (`cyan-500`) — Brand accent, spotlight gradient stop

- **Neutral Canvas & Surfaces**:
  - `canvas`: `#f8fafc` (`slate-50`) — Soft, light blue-slate page canvas
  - `surface`: `#ffffff` — Cards, modals, top bar, sidebar
  - `surfaceSubtle`: `#f1f5f9` (`slate-100`) — Table headers, secondary control backgrounds
  - `inkPrimary`: `#0f172a` (`slate-900`) — High-contrast display headlines and body text
  - `inkSecondary`: `#475569` (`slate-600`) — Secondary descriptions and metadata
  - `inkTertiary`: `#94a3b8` (`slate-400`) — Placeholders and subtle helper text
  - `borderSubtle`: `#e2e8f0` (`slate-200`) — Card borders and dividers
  - `borderStrong`: `#cbd5e1` (`slate-300`) — Form input borders, active borders

- **Semantic State Colors**:
  - Success / Completed: `#10b981` (`emerald-500`), wash `#ecfdf5`
  - Warning / Imminent: `#f59e0b` (`amber-500`), wash `#fffbeb`
  - Danger / Overdue: `#f43f5e` (`rose-500`), wash `#fff1f2`

- **Subject Category Color Matrix**:
  - Computer Science: Cyan (`bg-cyan-50`, `text-cyan-800`, `border-cyan-200`, accent `bg-cyan-500`)
  - STEM & Mathematics: Royal Blue (`bg-blue-50`, `text-blue-800`, `border-blue-200`, accent `bg-blue-600`)
  - Natural Sciences: Fresh Emerald (`bg-emerald-50`, `text-emerald-800`, `border-emerald-200`, accent `bg-emerald-500`)
  - Humanities & Literature: Warm Gold (`bg-amber-50`, `text-amber-800`, `border-amber-200`, accent `bg-amber-500`)
  - Social Sciences: Coral Orange (`bg-orange-50`, `text-orange-800`, `border-orange-200`, accent `bg-orange-500`)
  - Arts & Electives: Violet (`bg-purple-50`, `text-purple-800`, `border-purple-200`, accent `bg-purple-500`)

### 2. Typography Hierarchy
Two font families maximum, paired with strict monospace tabular figures:
- **Display & UI Face**: `Plus Jakarta Sans` (Clean, warm geometric humanist sans-serif with high x-height)
- **Data, Hours & Tabular Numerals**: `JetBrains Mono` with `tabular-nums`
- **Scale Definition**:
  - `Display / Page Title`: `24px`–`30px` (`text-2xl` sm: `text-3xl`), font-weight 800, tracking `-0.025em`, line-height 1.2
  - `Section Heading (H2)`: `18px`–`20px` (`text-lg` sm: `text-xl`), font-weight 700, tracking `-0.015em`
  - `Card Title / Group Heading (H3)`: `15px`–`16px` (`text-sm` sm: `text-base`), font-weight 700
  - `Body Standard`: `14px` (`text-sm`), font-weight 500, line-height 1.5, color `text-slate-600`
  - `Secondary / Caption`: `12px`–`13px` (`text-xs`), font-weight 500, color `text-slate-500`
  - `Micro Metadata / Badges`: `11px` (`text-[11px]`), font-weight 700
  - `Time & Duration Digits`: `JetBrains Mono font-bold tabular-nums`

### 3. Spacing Scale
Built on a disciplined 4px / 8px modular scale:
- `space-1`: `4px` (gap between icon and adjacent label)
- `space-2`: `8px` (button internal gap, badge padding)
- `space-3`: `12px` (input vertical padding, compact list gap)
- `space-4`: `16px` (card padding, container spacing)
- `space-5`: `20px` (hero spotlight card padding)
- `space-6`: `24px` (section separation, desktop gutters)
- `space-8`: `32px` (major page block rhythm)

### 4. Border Radius Rules
Surfaces use modern, friendly rounding:
- Small Controls (`rounded-lg` / 8px): Inputs, buttons, dropdown selects, badge tags
- Medium Panels (`rounded-xl` / 12px): Timeline session items, list rows, notification cards
- Large Hero Surfaces (`rounded-2xl` / 16px): Dashboard spotlight cards, course overview cards, major modal dialogs
- Full Capsules (`rounded-full`): Status pills, category dots, avatar circles

### 5. Elevation, Surfaces & Depth System (Prompt 3.7)
StudyFlow uses a purposeful 5-Level Layered Hierarchy & Soft-Morphism Architecture:
1. **Level 0 — Environmental Canvas (`bg-academic-canvas`)**:
   - Soft `#f8fafc` canvas infused with radial sky ambiance and a delicate 28px blueprint grid (`radial-gradient(rgba(14, 165, 233, 0.09) 1px, transparent 1px)`).
2. **Level 1 — Surface Base (`surface-base`)**:
   - Dual-layer lighting: crisp 1px border (`rgba(226, 232, 240, 0.95)`) + top hairline inset highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.95)`) + soft drop shadow (`0 1px 3px rgba(15, 23, 42, 0.04)`).
3. **Level 2 — Elevated Surface (`surface-elevated`)**:
   - Interactive popovers, active modal drawers, and floating toolbars with multi-layer shadow (`0 6px 16px -2px rgba(15, 23, 42, 0.07)`).
4. **Level 3 — Focal Surface (`surface-focal`)**:
   - The commanding academic hero anchor (Dashboard "Next Up" block).
   - Deep collegiate slate-950/navy gradient with glowing sky-500 rim lighting and subtle radial bloom.
5. **Level 4 — Recessed Wells & Insets (`surface-inset`)**:
   - Form inputs, search fields, progress track troughs, and metric wells with inner shadow (`inset 0 1.5px 3px rgba(15, 23, 42, 0.05)`).
6. **Academic Binder Motif (`surface-binder`)**:
   - Course cards, timetable blocks, and advisory alerts featuring a dedicated 4px left color spine matching the course category.

### 6. Button Styles (`Button.tsx`)
- **Primary Action** (`variant="primary"`): `btn-tactile-primary` with vertical gradient, top hairline rim highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.28)`), and physical active press depression (`translate-y-[0.5px]`).
- **Secondary Action** (`variant="secondary"`): `btn-tactile-secondary` with crisp white-to-slate gradient, top rim highlight, and subtle hover lift.
- **Ghost Action** (`variant="ghost"`): `bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 active:bg-slate-200/70`.
- **Destructive Action** (`variant="destructive"`): `bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/90 shadow-2xs`.
- **Loading State**: Accessible spinner replaces icon while retaining button geometry (`aria-busy="true"`).

### 7. Form & Input Styles (`Input.tsx`, `Select.tsx`)
- White surface, `border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900`
- Focus state: `focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600`
- Clear labels (`text-xs font-semibold text-slate-800`) and inline error alerts with icons.

### 8. Navigation & Sidebar Contract (`StudentLayout.tsx`)
- **3-Zone Top Bar**: Zone 1 (Graduation cap + StudyFlow wordmark + Term badge), Zone 2 (Context breadcrumb), Zone 3 (Vibrant `+ New Task` button + instant Student $\leftrightarrow$ Admin role switcher).
- **Sidebar**: 240px desktop width, 3 logical categories (`OVERVIEW`, `PLANNING & TIME`, `INSIGHTS & SYSTEM`), active highlight (`bg-sky-50 text-sky-700 font-bold border border-sky-100`), bottom student profile card.

### 9. Dashboard Philosophy & "What Do I Need To Do Today?"
The dashboard immediately provides:
1. Personalized greeting + semester week + daily study hours gauge.
2. Prominent **Next Focus Block** spotlight card in vibrant sky-to-cyan gradient with 1-click completion.
3. Two-tone daily study progress bar.
4. Chronological session checklist with checkmarks.
5. Upcoming deadlines queue with urgency countdowns.
6. Course workload distribution.

### 10. Page Composition & Varied Layouts
Each page is purposefully structured for its task:
- Tasks (`/tasks`): Filterable work queue with subtask checklists.
- Calendar (`/calendar`): Calendar grid with day agenda drawer.
- Availability (`/availability`): 7-day schedule-builder grid with burnout fatigue cap slider.
- Progress (`/progress`): Pacing metrics, course balance bars, and qualitative reflections.
- Notifications (`/notifications`): Activity feed format.
- Admin (`/admin/*`): High-density management tables and catalog tools.

### 11. Accessibility (WCAG 2.1 AA)
- 4.5:1 minimum text contrast for body and 3:1 for large display text.
- Visual focus rings on all interactive elements (`focus-visible:ring-2 focus-visible:ring-sky-500/30`).
- Statuses pair color with distinct icons or text labels (never color alone).
- Minimum 44px touch targets on mobile viewports.

---

## 4. Authentication Architecture & Atelier System

### 1. Dedicated Split-Screen Authentication Architecture & Auth Surface Rule
- **Canonical Route-Based Flow**:
  - StudyFlow authentication **ALWAYS** uses dedicated full-page routes (`/login`, `/register`, `/forgot-password`).
  - Authentication is **NEVER** displayed as a modal dialog, popup, overlay, or portal from the public landing page or header.
  - Clicking "Sign In" from the landing page or header navigates directly to `/login`.
  - Clicking "Get Started Free" from the landing page or header navigates directly to `/register`.
  - Logging out immediately navigates to `/login` to render the exact same dedicated split-screen login page.
- **The Auth Surface (Critical Distinction)**:
  - The right side of `AuthLayout` contains an **Auth Surface** (`surface-base bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-9`).
  - The Auth Surface is an **elevated container** that is a permanent, embedded part of the page composition.
  - It is **NOT** a modal dialog, overlay, popup, portal, or backdrop.
  - There is **never** a darkened or blurred landing page behind the authentication form.
- **Split-Screen Layout Composition**:
  - **Left Half (Desktop)**: Deep StudyFlow academic environment (slate-950/sky-800 gradient, geometric arcs, brand title, route-specific narrative, dynamic product preview cards, and academic value pillars).
  - **Right Half (Desktop)**: Light academic canvas (`bg-academic-canvas`) embedding the elevated Auth Surface with high-contrast inputs, mono-tabular duration counters, and 1-click instant demo credentials.

### 2. Container & Surface Morphism Recipes
StudyFlow enforces tactile material depth across all components:
```css
/* Level 0: Environmental Canvas */
.bg-academic-canvas {
  background-color: #f8fafc;
  background-image: 
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(2, 132, 199, 0.08), transparent 70%),
    radial-gradient(rgba(14, 165, 233, 0.09) 1px, transparent 1px);
  background-size: 100% 100%, 28px 28px;
}

/* Level 1: Surface Base (Cards, Sidebars, Containers) */
.surface-base {
  background-color: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 
    inset 0 1px 0 0 rgba(255, 255, 255, 0.95),
    0 1px 3px 0 rgba(15, 23, 42, 0.04);
}

/* Level 2: Surface Card (Lifted interactive panels) */
.surface-card {
  background-color: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 
    inset 0 1px 0 0 rgba(255, 255, 255, 0.9),
    0 2px 4px -1px rgba(15, 23, 42, 0.04),
    0 4px 10px -2px rgba(15, 23, 42, 0.05);
}

/* Level 4: Surface Inset (Recessed form wells, inputs, meter tracks) */
.surface-inset {
  background-color: #f8fafc;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: inset 0 1.5px 3px 0 rgba(15, 23, 42, 0.05);
}

/* Academic Binder Motif (Subject Spines) */
.surface-binder {
  position: relative;
  border-left-width: 4px;
}
```

### 3. Typography & Mono Tabular Standards
- **Font Pairing**: Plus Jakarta Sans for UI + JetBrains Mono for all data figures.
- **Data Numerals**: All durations (`90 min`), time ranges (`14:00 – 15:30`), credits (`4 cr`), fatigue caps (`5.5h/day`), and percentages must use `font-mono tabular-nums`.
- **Editorial Subheaders**: Small collegiate section titles must be uppercase, tracking-wider, font-bold (`text-[10px]` or `text-xs`), colored in slate-400 or sky-700.

### 4. Gradient System & Discipline Palette
- **Primary Action Gradient**: `linear-gradient(180deg, #0284c7 0%, #0369a1 100%)` with top rim highlight `inset 0 1px 0 rgba(255,255,255,0.28)`.
- **Hero Atelier Banner**: `linear-gradient(135deg, #0369a1 0%, #075985 45%, #020617 100%)`.
- **Discipline Color Identifiers**:
  - CS & Engineering: Sky & Cyan (`#0284c7`, `#06b6d4`)
  - Mathematics & Physics: Royal Blue & Indigo (`#2563eb`, `#4f46e5`)
  - Life & Natural Sciences: Fresh Emerald (`#059669`, `#10b981`)
  - Literature & Humanities: Amber & Ochre (`#d97706`, `#b45309`)
  - Social Sciences: Coral Orange (`#ea580c`)
  - Arts & Electives: Purple (`#9333ea`)

### 5. Header Architecture
- **Public Header**: Frosted glass `bg-white/90 backdrop-blur-md`, 16px height, logo with collegiate badge, semester pill (`Fall 2026 Academic Term`), and direct Auth Modal trigger.
- **Student Workspace Top Bar**: Semantic 3-zone structure with institution details, quick `+ New Task` modal launcher, and student $\leftrightarrow$ admin switch.
- **Admin Console Top Bar**: Amber shield badge, institutional operations breadcrumb, and instant return to student view.

### 6. Interactive Simulator Architecture
- The public landing page embeds a live, client-side knapsack pacing calculator:
  - Input: Credit Load (12, 16, 20 credits) and Daily Fatigue Ceiling Slider (3.0h to 8.0h).
  - Output: Deterministic weekly study hours, active study days required, guaranteed rest days preserved, and burnout risk classification.

