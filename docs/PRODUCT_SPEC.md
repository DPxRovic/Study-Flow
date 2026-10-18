# StudyFlow Product Specification

> **Document Status**: Canonical Product Requirements & Feature Architecture  
> **Version**: 2.0.0 (Post-Foundation & Route Sync)  
> **Primary Users**: College Students (Undergraduate & Graduate), Teaching Assistants, Academic Administrators  
> **Core Value Proposition**: Transform chaotic college course syllabi, assignments, and irregular free time into realistic, achievable daily study blocks.

---

## 1. Executive Summary & Core Objective

College students struggle not from a lack of desire to study, but from **scheduling friction, cognitive overload, and unrealistic planning**. 

Traditional calendar apps leave students staring at empty time blocks having to guess how to break down a 15-page research paper or organic chemistry midterm prep. Generic todo apps list 30 items without anchoring them to available hours in the day, leading to late-night cramming, burnout, and missed deadlines.

**StudyFlow** solves this by bridging the gap between **assignments** (work required) and **availability** (real free hours) through an **automated, realistic schedule generator**.

### The Prime UX Question
When a student opens StudyFlow, the interface answers one question immediately without scrolling or navigating:

> **"What do I need to do today?"**

Above the fold on the Dashboard, the student immediately sees:
1. **Today's Active Focus Block**: The specific subject, task, and duration scheduled for right now or next.
2. **Actionable Day Gauge**: Total planned study hours vs. completed hours (e.g., `2.5h of 5.5h done · 3.0h remaining today`).
3. **Imminent Deadlines**: Assignments due within the next 48–72 hours with priority tags.
4. **Immediate Execution Action**: 1-click "Mark Session Done".

---

## 2. Information Architecture & Area Specifications

### Part A: Student Workspaces (9 Core Routes)

#### 1. Dashboard (`/dashboard`)
The central control center focused entirely on today's execution.
- **Header**: Semester progress indicator (`Week 7 of Fall 2026`), greeting (`Good morning, Maya! 👋`), date header, and daily hours gauge.
- **Hero Spotlight Card ("Next Focus Block")**:
  - High-contrast card in sky-to-cyan gradient highlighting current/next study session.
  - Prominent 1-click completion button.
- **Daily Progress Bar**:
  - Two-tone visual progress bar displaying percentage of daily target completed.
- **Today's Chronological Study Timeline**:
  - Sessions list with subject badges, start/end times, and completion checkboxes.
- **Upcoming Deadlines Queue**:
  - Compact list of assignments due in the next 3–5 days with countdowns and priority tags.
- **Weekly Subject Balance**:
  - Horizontal bars showing study hours allocated per enrolled subject this week.

#### 2. Tasks & Deadlines (`/tasks`)
The assignment and project inventory.
- **Views & Filters**:
  - Search by assignment keyword.
  - Category dropdown filter.
  - Status segmented tabs: All, In Progress, Completed.
- **Task Attributes**:
  - Title, Subject reference (e.g., `CS 201`), Due Date & Time.
  - Estimated Study Hours Needed (e.g., `4.5 hrs`).
  - Remaining Hours (auto-decrements as student logs study sessions).
  - Subtask checklists with interactive completion toggles.
- **Creation Modal**:
  - "+ Add Assignment" dialog with form validation.

#### 3. My Subjects (`/subjects`)
The enrolled semester courses catalog.
- Course cards showing course code, name, instructor, classroom, and office hours.
- Credit hours count and weekly target study hours.
- Course category color tags (CS, STEM, Science, Humanities, Social, Arts).
- "+ Enroll in Subject" modal.

#### 4. Weekly Availability (`/availability`)
The student's real-world time inventory.
- 7-day recurring grid (Monday–Sunday) from 08:00 to 22:00.
- Distinct slots for class lectures, work commitments, and open study windows.
- Maximum Daily Study Cap slider ($2.0\text{h}$–$10.0\text{h}$/day) to prevent burnout.
- Add and remove slot controls.

#### 5. Study Schedule (`/schedule`)
The deterministic schedule generator workspace.
- "Auto-Generate Schedule" engine trigger.
- Mode selector: Balanced, Front-Loaded, Pomodoro ($45\text{m}$).
- Session timeline with course tags, start/end times, and duration.
- 1-click session completion and session locking toggle.
- Overload diagnostic alerts when required hours exceed available capacity.

#### 6. Calendar Grid (`/calendar`)
Unified academic calendar view.
- Month and week grid integrating classes, deadlines, and study blocks.
- Interactive date selector with day-specific agenda drawer.
- Export calendar subscription (`.ics`) affordance.

#### 7. Study Progress (`/progress`)
Honest academic pacing reflection (no fake AI vanity scores).
- Study hours planned vs. actually logged this week.
- Course study distribution vs. credit weight balance.
- Healthy focus streak counter (days without late-night cramming).
- Weekly qualitative reflection journal.

#### 8. Notifications (`/notifications`)
Low-anxiety academic alert center.
- Deadline warnings ($48\text{h}$ and $24\text{h}$).
- Missed session rescheduling prompts.
- Campus and department announcements with priority badges.
- Mark as read / mark all as read controls.

#### 9. Preferences & Settings (`/settings`)
Student preferences and system defaults.
- Student profile: Name, university email, major, academic term.
- Study preferences: Default session length (e.g. 50 min), daily study cap.
- Data export to JSON.
- Reset demo data button to return to initial clean state.

---

### Part B: Admin Workspaces (6 Core Routes)

#### 1. Admin Dashboard (`/admin`)
Institutional cohort health overview.
- Total active students, weekly study hours logged, and active planner count.
- Cohort workload crunch warnings (identifying overlapping exam crunch weeks).
- Active campus announcements feed.

#### 2. Users Directory (`/admin/users`)
Student, TA, and faculty management directory.
- Directory table with search, role filters (Student, TA, Advisor, Admin), and status badges.
- User account provisioning modal.

#### 3. Curriculum Catalog (`/admin/subjects`)
Master institutional course catalog management.
- Course codes, departments, credit hours, expected study hours per week.
- Add catalog course modal.

#### 4. Announcements (`/admin/announcements`)
Campus broadcast composer.
- Broadcast composer with audience targeting (All, STEM, Humanities).
- Priority levels: Normal, Important, Critical.
- Live broadcast feed and publication history.

#### 5. Workload Analytics (`/admin/analytics`)
Institutional workload insights.
- Semester-long weekly study workload histogram identifying bottleneck weeks.
- Course difficulty alignment table comparing catalog expectations to actual reported student hours.

#### 6. Admin Settings (`/admin/settings`)
Academic term calendar boundaries and governance.
- Semester calendar boundaries (start/end dates, reading period, final exam week).
- Administrative action audit log.

---

## 3. Scope, Boundaries & Non-Goals

### What is In-Scope:
- Full responsive Single-Page Application (SPA) covering all 19 defined routes.
- Fully interactive in-memory state with deterministic schedule generation.
- Instant Student $\leftrightarrow$ Admin role switcher.
- WCAG 2.1 AA accessibility compliance.

### What is Explicitly Non-Goal (Out-of-Scope):
- **No Generative AI Chatbots**: No floating AI chat widgets or conversational sidebars.
- **No Direct LMS Auto-Grading**: StudyFlow does not submit homework or grade tests.
- **No Social Feeds / Peer Chat**: Individual focus tool, not a social media app.
- **No Micro-Transactions or Paywalls**: Complete educational utility with no synthetic tiers.
