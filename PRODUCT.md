# StudyFlow — Product Requirements Document (PRD)

> **Document Status**: Canonical Product Scope & Functional Contract  
> **Target Audience**: College Students (Undergraduate & Graduate), Academic Advisors, Product Engineers  
> **Product Personality**: Student-focused, approachable, energetic, organized, trustworthy, and easy to use.

---

## 1. What StudyFlow Is & Why It Exists

StudyFlow is a student-friendly study planner and assignment scheduler designed for college and university students.

### The Problem
College students juggle multiple courses with complex syllabi, overlapping midterm weeks, homework problem sets, long-term papers, campus jobs, and lectures. Traditional calendars leave students staring at empty time blocks having to guess when and how to break down assignments. Traditional to-do apps display unbounded lists of 25+ tasks unanchored to available hours. This disconnect causes procrastination, late-night cramming, burnout, and missed deadlines.

### The Solution
StudyFlow closes the gap between **what needs to be done** (assignments, projects, exam preparation) and **when the student is actually free to study** (weekly free windows, energy preferences, sleep/fatigue limits). It provides an automated, realistic study scheduler that transforms course deliverables into achievable daily study blocks.

---

## 2. Target Users

1. **Undergraduate Students**: Managing 12–18 credit hours across varying disciplines with heavy homework and lab deliverables.
2. **Graduate & Professional Students**: Managing dense seminar readings, research milestones, and thesis deadlines.
3. **Teaching Assistants (TAs) & Academic Advisors**: Monitoring cohort workload health, managing syllabi, and assisting at-risk students.
4. **Department Administrators**: Overseeing institutional curriculum standards, academic term calendars, and campus-wide notifications.

---

## 3. Product Objective & Primary UX Priority

### The Prime UX Question
When a student opens StudyFlow, the application must answer one question immediately above the fold:

> **"What do I need to do today?"**

Above the fold, the student immediately sees:
1. **Current / Next Study Session**: The course, specific task, time slot, and duration scheduled right now.
2. **Actionable Day Gauge**: Total planned study hours vs. completed hours (e.g., `2.5h / 4.0h completed today`).
3. **Imminent Deadlines**: Assignments due within the next 48–72 hours with priority tags.
4. **Immediate Execution Action**: 1-click "Mark Session Done".

---

## 4. Main User Flows

### Flow 1: Quick Assignment Capture
Student receives an assignment in class $\rightarrow$ clicks "+ New Task" in top bar $\rightarrow$ inputs title, course, due date, estimated study hours, and priority $\rightarrow$ task is saved into the assignment backlog.

### Flow 2: Automated Schedule Generation
Student opens Schedule $\rightarrow$ selects scheduling mode (Balanced, Front-Loaded, or Pomodoro) $\rightarrow$ clicks "Auto-Generate Schedule" $\rightarrow$ algorithm allocates available weekly free study windows $\rightarrow$ timeline populates with anti-crammed daily sessions.

### Flow 3: Daily Execution & Focus Logging
Student opens Dashboard $\rightarrow$ sees today's active study session $\rightarrow$ completes study session $\rightarrow$ clicks "Mark Session Done" $\rightarrow$ remaining assignment hours decrement automatically $\rightarrow$ progress bar updates.

### Flow 4: Availability & Fatigue Boundary Setting
Student navigates to Availability $\rightarrow$ marks recurring lecture times and work shifts $\rightarrow$ designates open study windows $\rightarrow$ adjusts the "Maximum Daily Study Cap" slider (default 6.0h) to safeguard against burnout.

---

## 5. Feature Scope

### Student Features (9 Core Workspaces)
1. **Dashboard (`/dashboard`)**:
   - Greeting and semester progress context (`Week 7 of Fall 2026`).
   - Active/next study session spotlight card.
   - Today's study progress bar (hours completed vs planned).
   - Chronological daily study session checklist with 1-click completion.
   - Upcoming deadlines queue with urgency countdowns.
   - Weekly course workload allocation breakdown.
2. **Tasks & Deadlines (`/tasks`)**:
   - Assignment queue with keyword search and course filtering.
   - Active vs. Completed status segmented tabs.
   - Estimated vs. remaining hours tracking.
   - Subtasks checklist support.
   - Task creation and deletion modal.
3. **Subjects (`/subjects`)**:
   - Course cards for enrolled semester subjects.
   - Course code, course title, credit hours, and lead faculty.
   - Classroom location and instructor office hours.
   - Weekly target study hours per course.
   - Subject enrollment modal.
4. **Availability (`/availability`)**:
   - 7-day recurring weekly grid (Monday–Sunday).
   - Distinction between class commitments, work shifts, and open study windows.
   - Maximum daily study cap slider (2h–10h/day).
   - Add/remove time window controls.
5. **Schedule (`/schedule`)**:
   - Deterministic study schedule generator.
   - Optimization modes: Balanced, Front-Loaded, Pomodoro (45m).
   - Session timeline with start/end times and subject tags.
   - Session locking toggle (protects specific slots from regeneration).
   - Overload diagnostic alerts when needed hours exceed available capacity.
6. **Calendar (`/calendar`)**:
   - Month and week grid integrating classes, deadlines, and study blocks.
   - Interactive date selector showing day-specific agenda.
   - Export calendar subscription (`.ics`) affordance.
7. **Progress (`/progress`)**:
   - Study hours pacing: hours planned vs hours actually completed this week.
   - Course study distribution vs. credit weight balance.
   - Healthy focus streak counter (days without midnight overruns).
   - Weekly qualitative reflection journal.
8. **Notifications (`/notifications`)**:
   - Deadline alerts (48h and 24h reminders).
   - Missed session rescheduling prompts.
   - Campus and department announcements.
   - Mark as read / mark all as read controls.
9. **Settings & Preferences (`/settings`)**:
   - Student profile: Name, university email, major, term.
   - Study preferences: Default session duration (e.g. 50m), daily study cap.
   - Data export to JSON.
   - Reset demo data to initial clean semester state.

### Admin Features (6 Core Workspaces)
1. **Admin Dashboard (`/admin`)**:
   - Cohort enrollment totals, active planner count, weekly study hours logged.
   - Cohort crunch alerts (identifying overlapping exam crunch weeks).
   - Active campus announcement feed.
2. **Users Directory (`/admin/users`)**:
   - Student, TA, and faculty directory table.
   - Role filtering (Student, TA, Advisor, Admin) and search.
   - Account provisioning modal.
3. **Curriculum Catalog (`/admin/subjects`)**:
   - Master institutional course catalog management.
   - Course codes, departments, credit hours, expected study hours per week.
   - Add catalog course modal.
4. **Announcements (`/admin/announcements`)**:
   - Campus broadcast composer with audience targeting (All, STEM, Humanities).
   - Priority levels: Normal, Important, Critical.
   - Live broadcast feed and publication history.
5. **Workload Analytics (`/admin/analytics`)**:
   - Semester-long weekly study workload histogram identifying bottleneck weeks.
   - Course difficulty alignment table comparing catalog expectations to actual reported student hours.
6. **Admin Settings (`/admin/settings`)**:
   - Academic term boundaries (Start/end dates, reading period, final exam week).
   - Administrative action audit log.

---

## 6. Scope, Limitations & Out-of-Scope Features

### What is In-Scope
- Single-page React client with client-side reactive state management.
- Complete, functional UI for all 19 defined routes (no "Coming Soon" placeholders).
- Deterministic schedule generation respecting human fatigue and anti-cramming rules.
- Local data persistence and instant role-switching between Student and Admin.

### What is Intentionally Out-of-Scope (Non-Goals)
- **No Generative AI Chatbots**: No floating AI assistants, chat bubbles, or "Ask AI" sidebars.
- **No Direct LMS Bi-Directional Auto-Grading**: StudyFlow does not submit homework to Canvas or Blackboard.
- **No Social Feeds or Peer Chatting**: StudyFlow is an individual focus and scheduling utility, not a social network.
- **No Paid Micro-Transactions**: No premium feature gates or synthetic tiers.
