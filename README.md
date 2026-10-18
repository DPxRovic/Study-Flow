# StudyFlow — Student Study Planner & Assignment Scheduler

> **A student-first academic planner and deterministic assignment scheduler designed for college and university students.**  
> Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **React Router v7**, and **Lucide React**.

---

## 🎯 What StudyFlow Is & Why It Exists

College students constantly juggle multiple courses with complex syllabi, overlapping midterm weeks, homework problem sets, long-term papers, campus jobs, and lectures. 

Traditional calendar apps leave students staring at blank time blocks having to guess when and how to break down assignments. Traditional to-do apps display unbounded lists of 25+ tasks unanchored to actual available hours. This disconnect causes procrastination, late-night cramming, burnout, and missed deadlines.

**StudyFlow closes the gap between what needs to be done and when the student is actually free to study.** It provides an automated, realistic study scheduler that transforms course deliverables into achievable daily study blocks while actively safeguarding against fatigue and burnout.

---

## ⚡ The Prime UX Question

When a student opens StudyFlow, the application answers one question immediately above the fold within 3 seconds:

> ### **"What do I need to do today?"**

Above the fold on the Dashboard, students immediately see:
1. **Personalized Context & Greeting**: `Good morning, Maya! 👋 · Tuesday, October 6 · Week 7 of Fall 2026`
2. **Actionable Day Gauge**: Total planned study hours vs. completed hours (e.g., `2.5h of 5.5h done · 3.0h remaining`).
3. **Hero Spotlight Card ("Next Focus Block")**: High-contrast, vibrant focal card displaying the active study session, course code, due date, and a prominent 1-click completion action.
4. **Today's Progress Bar**: Two-tone visual gauge tracking daily target accomplishment.
5. **Today's Chronological Study Timeline**: Checklist of today's study blocks with category tags and instant status toggling.
6. **Imminent Deadlines**: Priority-tagged assignments due within the next 48–72 hours.

---

## 🎨 Visual Identity & Product Personality

StudyFlow's design constitution is defined by **COLORFUL + POLISHED + PURPOSEFUL**.

- **Not Bland or Corporate**: Rejects gray enterprise SaaS templates, sterile documentation layouts, and monochrome minimalism that strips away personality under the guise of "minimalism".
- **Not AI Slop**: Rejects purple/blue neon gradients, glassmorphism blur panels, nested card sandwiches, floating stat cockpits, and fake vanity scores ("94% Innovation Mastery").
- **Vibrant Blue/Cyan Brand Identity**:
  - Primary Brand Sky: `#0284c7` (`sky-600`) / Hover `#0369a1` (`sky-700`)
  - Cyan Accent: `#06b6d4` (`cyan-500`)
  - Soft Light-Blue Canvas: `#f8fafc` (`slate-50`)
  - Clean Opaque Surfaces: `#ffffff` with hairline dividers (`#e2e8f0`)
  - Deep Navy Prose: `#0f172a` (`slate-900`)
- **Distinct Academic Course Colors**: Every subject has an energetic, high-contrast category identity:
  - 🖥️ **Computer Science**: Cyan (`bg-cyan-50`, `text-cyan-800`, `border-cyan-200`, accent `bg-cyan-500`)
  - 📐 **Mathematics & STEM**: Royal Blue (`bg-blue-50`, `text-blue-800`, `border-blue-200`, accent `bg-blue-600`)
  - 🧬 **Natural Sciences**: Fresh Emerald (`bg-emerald-50`, `text-emerald-800`, `border-emerald-200`, accent `bg-emerald-500`)
  - 📚 **Humanities & Literature**: Warm Gold (`bg-amber-50`, `text-amber-800`, `border-amber-200`, accent `bg-amber-500`)
  - 🏛️ **Social Sciences**: Coral Orange (`bg-orange-50`, `text-orange-800`, `border-orange-200`, accent `bg-orange-500`)
  - 🎨 **Arts & Electives**: Violet (`bg-purple-50`, `text-purple-800`, `border-purple-200`, accent `bg-purple-500`)

---

## 🗺️ Application Workspaces & Routes (19 Complete Routes)

StudyFlow features 19 fully functional routes with zero "Coming Soon" placeholders.

### 1. Public & Authentication Routes
- **`/` (`LandingPage`)**: Product introduction, "What do I need to do today?" preview, and student CTA.
- **`/login` (`LoginPage`)**: Student & Admin authentication with 1-click quick-demo login buttons.
- **`/register` (`RegisterPage`)**: Student onboarding capturing academic major and semester term.
- **`/forgot-password` (`ForgotPasswordPage`)**: Clean password recovery screen.

### 2. Student Workspace (`StudentLayout`)
- **`/dashboard` (`DashboardPage`)**: Prime question answer, hero spotlight card, day gauge, and deadlines queue.
- **`/tasks` (`TasksPage`)**: Assignment queue with search, category filtering, subtasks, and add-task modal.
- **`/subjects` (`SubjectsPage`)**: Course cards with credit counts, instructors, classroom locations, and office hours.
- **`/availability` (`AvailabilityPage`)**: 7-day recurring grid distinguishing lectures, work shifts, and open study windows, plus daily study cap slider ($2\text{h}$–$10\text{h}$).
- **`/schedule` (`SchedulePage`)**: Deterministic study schedule generator (Balanced, Front-Loaded, Pomodoro) with session locking and overload diagnostics.
- **`/calendar` (`CalendarPage`)**: Month & week grid integrating classes, deadlines, and study blocks with day agenda drawer.
- **`/progress` (`ProgressPage`)**: Honest study hours pacing (planned vs completed), course balance distribution, and streak tracker.
- **`/notifications` (`NotificationsPage`)**: Deadline alerts ($48\text{h}$ / $24\text{h}$), rescheduling prompts, and campus announcements.
- **`/settings` (`SettingsPage`)**: Daily study caps, default session duration, data export to JSON, and demo reset.

### 3. Admin Workspace (`AdminLayout`)
- **`/admin` (`AdminDashboardPage`)**: Cohort enrollment metrics, weekly study hours logged, and crunch index warnings.
- **`/admin/users` (`UsersPage`)**: Student, TA, and faculty directory with role filters, search, and user provisioning.
- **`/admin/subjects` (`CurriculumPage`)**: Institutional course catalog manager with credit hours and study targets.
- **`/admin/announcements` (`AnnouncementsPage`)**: Broadcast composer with cohort targeting and priority levels.
- **`/admin/analytics` (`AnalyticsPage`)**: Semester workload heatmaps and catalog difficulty vs actual hours analysis.
- **`/admin/settings` (`AdminSettingsPage`)**: Academic term calendar boundaries, reading periods, and audit log.

---

## 🧠 Deterministic Scheduling Engine

StudyFlow implements a deterministic **greedy knapsack algorithm with interval spreading** (Anti-Cram Engine):
1. **Anti-Cram Principle**: Automatically spreads long deliverables across multiple days rather than scheduling 8 hours the night before a deadline.
2. **Fatigue Limits**: Chunks study blocks into human-scale sessions ($45\text{m}$–$90\text{m}$) with mandatory breaks.
3. **Daily Cap Safeguard**: Caps daily study hours at the student's configured threshold (default 5.5h) to safeguard mental health.
4. **Subject Interleaving**: Alternates subjects across sequential sessions to minimize cognitive exhaustion.
5. **Overload Diagnostics**: Emits clear alerts when requested study hours exceed available capacity before a deadline.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: React 19 (SPA on Vite 8)
- **Language**: TypeScript 5.7 (Strict mode, zero compilation/type errors)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + `@theme` CSS variables
- **Typography**: Google Fonts — Plus Jakarta Sans (Headings/prose) & JetBrains Mono (Tabular numerals)
- **Routing**: React Router v7 (`react-router-dom`)
- **Icons**: Lucide React
- **Animations**: Motion
- **State Management**: React Context (`PlannerContext`, `AuthContext`, `ToastContext`)
- **Persistence**: In-memory with rich college seed data (`src/data/mockData.ts`); architected for PostgreSQL / Prisma backend (Phase 2).

---

## 🚀 Getting Started

### Installation & Development
```bash
# Install dependencies
npm install

# Start local dev server (Runs on port 3000)
npm run dev

# Run TypeScript type check
npm run lint

# Database operations (PostgreSQL with Prisma ORM)
npm run db:validate    # Validate Prisma schema
npm run db:migrate     # Run development database migrations
npm run db:deploy      # Apply migrations in production deployment
npm run db:seed        # Seed development accounts and coursework

# Run backend & database integration test suite
npm run test:backend

# Build production bundle
npm run build
```

---

## 📚 Documentation Hierarchy & Source of Truth

To ensure consistency across human engineers and AI coding assistants:

1. **`PRODUCT.md`**: Canonical product requirements, user personas, flows, and feature scope.
2. **`DESIGN.md`**: Primary visual authority, color tokens, typography rules, and anti-AI-slop standards.
3. **`ARCHITECTURE.md`**: Technical architecture specification, file map, data flows, and Phase 1 vs Phase 2 definitions.
4. **`CLAUDE.md`**: Engineering constitution and implementation behavioral rules for AI assistants.
5. **`README.md`**: Developer-facing project overview and quickstart (this file).
6. **`/docs/`**: Detailed supplementary specifications (`DESIGN_SYSTEM.md`, `PRODUCT_SPEC.md`, `ARCHITECTURE_PLAN.md`).
