# StudyFlow QA Audit Report

**Audit date:** 2026-10-23  
**Repository:** `Study-Flow`  
**Runtime checked:** Bun 1.4.3, Node.js 24.18.0  
**Audit mode:** Static analysis, logical data-flow analysis, and safe runtime checks  
**Status:** 64 documented findings (60 original + 4 follow-up); remediation and full regression testing await the user's go signal

## Scope

This report covers frontend behavior, backend/API behavior, configuration, authentication, authorization, scheduling logic, frontend-to-backend contracts, and the follow-up environment incident observed on 2026-10-26.

The following areas were intentionally excluded:

- Database schema design and query-quality review (the follow-up records migration readiness only)
- ORM model design and query quality
- SQL, database indexes, and database configuration
- Cosmetic style preferences that do not cause functional or serious maintainability problems

`bun run lint` passes. Express and Vite intentionally share port `3000`; the absence of a second frontend port is not a defect.

## Executive Summary

| Severity  | Frontend | Backend | Integration | Operations | Total |
| --------- | -------: | ------: | ----------: | ---------: | ----: |
| Critical  |        0 |       0 |           1 |          1 |     2 |
| High      |       11 |       6 |           6 |          0 |    23 |
| Medium    |       12 |      18 |           4 |          0 |    34 |
| Low       |        2 |       3 |           0 |          0 |     5 |
| **Total** |   **25** |  **27** |      **11** |      **1** | **64** |

### Highest-risk areas

1. UI authentication, API authorization, and audit attribution use different identities, including a hardcoded shared administrator login.
2. Schedule generation and completion accounting can violate availability constraints or corrupt remaining workload.
3. Much of the student workspace is local-only, while several administrative screens report success for changes that were never saved.
4. Role-based permissions for curriculum management, faculty loads, and assignment lifecycles are not properly segregated among Admins, Professors, and Students.
5. Live infrastructure credentials were disclosed outside the local secret store and must be rotated before any release or further connectivity testing.

## Codebase Reconnaissance

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Motion, React Context, and browser `localStorage`.
- **Backend:** Express 4, TypeScript through `tsx`, JWT authentication, bcrypt, and REST routes under `/api`.
- **Development runtime:** Express mounts Vite in middleware mode and serves both frontend and backend on port `3000`.
- **Production runtime:** The declared `build` and `start` commands are incompatible; see `INT-06`.
- **Package manager:** Bun is the selected workflow, but stale npm metadata and npm-oriented documentation remain; see `INT-09`.
- **Environment:** No real `.env` is tracked. The example JWT value is predictable; see `BE-22`.

## Frontend Issues

### FE-01 — Browser storage is treated as the authentication authority

- **Severity:** High
- **Category:** Security
- **Location:** `src/context/AuthContext.tsx` lines 40–78, 82–120, 125–148, 167–183; `src/components/auth/ProtectedRoute.tsx` lines 21–36
- **Problem:** Passwords are stored in plaintext, and editable `localStorage` user/role data is trusted by route guards.
- **Reproduction:** Register an account and inspect `studyflow_registered_accounts`, or edit `studyflow_user.role` to `admin` and reload.
- **Impact:** Credential exposure and forgeable frontend authorization.

### FE-02 — Editing a session creates a duplicate

- **Severity:** High
- **Category:** Logic Bug
- **Location:** `src/pages/student/SchedulePage.tsx` lines 94–100 and 360–369; `src/pages/student/CalendarPage.tsx` lines 83–90 and 509–518; `src/components/schedule/SessionEditModal.tsx` lines 50–74, 137–163, 175, and 347
- **Problem:** Pages pass the edit target through `session`, while submission checks only `sessionToEdit`, so it calls `addSession` instead of `updateSession`.
- **Reproduction:** Edit an existing session and save it.
- **Impact:** Duplicate sessions, overlaps, and inflated workload.

### FE-03 — Schedule generation ignores advertised constraints

- **Severity:** High
- **Category:** Logic Bug
- **Location:** `src/utils/scheduleGenerator.ts` lines 194–323; `src/pages/student/SchedulePage.tsx` lines 68–81 and 172–197; `src/components/availability/StudyPreferencesCard.tsx` lines 93–105 and 138–171
- **Problem:** Availability, date range, daily cap, break duration, session length, preferred time, and transition buffer do not affect generated sessions.
- **Reproduction:** Save a two-hour cap and an 11:00–13:00 class, then regenerate.
- **Impact:** Sessions can conflict with commitments, exceed limits, or occur after deadlines.

### FE-04 — Completed work is deducted twice during regeneration

- **Severity:** High
- **Category:** Logic Bug
- **Location:** `src/utils/scheduleGenerator.ts` lines 207–245 and 264–273; `src/context/PlannerContext.tsx` lines 271–294
- **Problem:** Completion reduces `remainingHours`, then regeneration subtracts the preserved completed session again.
- **Reproduction:** Complete one hour of a three-hour task and regenerate.
- **Impact:** Work is silently under-scheduled.

### FE-05 — Session completion accounting is irreversible and control-dependent

- **Severity:** High
- **Category:** State Management
- **Location:** `src/context/PlannerContext.tsx` lines 271–321; `src/components/schedule/SessionDetailModal.tsx` lines 65–67 and 309–315
- **Problem:** Toggling incomplete does not restore task hours, while the status selector changes completion without adjusting task workload.
- **Reproduction:** Toggle complete → incomplete → complete, then compare with marking Completed from the detail modal.
- **Impact:** The same work can be deducted repeatedly or not deducted at all.

### FE-06 — Planner data leaks between accounts

- **Severity:** High
- **Category:** Security
- **Location:** `src/App.tsx` lines 54–57; `src/context/PlannerContext.tsx` lines 102–165; `src/context/AuthContext.tsx` lines 125–148 and 200–214
- **Problem:** Account-independent storage keys remain mounted across authentication changes.
- **Reproduction:** Add a journal entry or schedule as one user, log out, then sign in as another user.
- **Impact:** Cross-account disclosure of schedules, availability, notifications, and journals.

### FE-07 — Partial persistence creates orphaned sessions

- **Severity:** High
- **Category:** State Management
- **Location:** `src/context/PlannerContext.tsx` lines 100–165 and 179–245
- **Problem:** Sessions persist, but newly created subjects and tasks do not.
- **Reproduction:** Create a subject and task, add a session, and refresh.
- **Impact:** The subject/task disappears while the session retains invalid references.

### FE-08 — Administrative screens claim unsaved changes succeeded

- **Severity:** High
- **Category:** Error Handling
- **Location:** `src/pages/admin/AnnouncementsPage.tsx` lines 85–163; `src/pages/admin/UsersPage.tsx` lines 116–199; `src/pages/admin/CurriculumPage.tsx` lines 32–34 and 80–131; `src/pages/admin/AdminSettingsPage.tsx` lines 82–90
- **Problem:** Announcement errors are swallowed, and user, curriculum, and settings operations are partly or entirely local-only.
- **Reproduction:** Disable the API and perform administrative mutations.
- **Impact:** Administrators receive false success messages and changes disappear on reload.

### FE-09 — Focus timer records a different duration than it displays

- **Severity:** High
- **Category:** Logic Bug
- **Location:** `src/components/dashboard/FocusTimerModal.tsx` lines 43–49 and 80–101; `src/pages/student/DashboardPage.tsx` lines 724–732; `src/context/PlannerContext.tsx` lines 271–294
- **Problem:** The timer sends only the session ID, and the context credits the session's original full duration.
- **Reproduction:** Select 25 minutes for a 60-minute session and immediately complete it.
- **Impact:** Displayed time, credited workload, and logged minutes disagree.

### FE-10 — Health and analytics screens display fabricated healthy values

- **Severity:** Medium
- **Category:** Error Handling
- **Location:** `src/pages/admin/AdminSettingsPage.tsx` lines 58–80 and 136–160; `src/pages/admin/AdminDashboardPage.tsx` lines 39–69; `src/pages/student/ProgressPage.tsx` lines 73–75 and 265–297; `src/components/progress/CoreMetricsGrid.tsx` lines 98–116
- **Problem:** Failed calls fall back to “Operational,” `18ms`, or fixture values; several student metrics are hardcoded.
- **Reproduction:** Run without the API or create data that contradicts the rendered metrics.
- **Impact:** Outages and overload are hidden behind reassuring values.

### FE-11 — Audit-log requests can overwrite newer results

- **Severity:** Medium
- **Category:** State Management
- **Location:** `src/pages/admin/AuditLogsPage.tsx` lines 61–130
- **Problem:** Search immediately requests using the old page closure, and requests are neither cancelled nor sequenced.
- **Reproduction:** Search from page two or rapidly change filters.
- **Impact:** The page label and displayed results can disagree.

### FE-12 — “Today” and calendar navigation are fixed to October 2026

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/context/PlannerContext.tsx` lines 171–174; `src/pages/student/CalendarPage.tsx` lines 50–63 and 199–211; `src/pages/student/SchedulePage.tsx` lines 53 and 303–326; `src/components/schedule/WeeklyTimeGrid.tsx` lines 36–48
- **Problem:** “Today” includes October 6 sessions, calendar ranges are fixed, and previous/next-month controls do nothing.
- **Reproduction:** Use the app outside October 2026 or click month navigation.
- **Impact:** Current-day data and calendar periods are wrong.

### FE-13 — Cancelled sessions remain active in day and month views

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/components/schedule/DailyTimeline.tsx` lines 46–77; `src/pages/student/CalendarPage.tsx` lines 92–95, 234–243, and 399–460
- **Problem:** These views do not exclude cancelled sessions.
- **Reproduction:** Cancel a session and open a daily or monthly agenda.
- **Impact:** Cancelled work inflates totals and can still be completed.

### FE-14 — Progress time-range selector changes only its styling

- **Severity:** Medium
- **Category:** UI/UX
- **Location:** `src/pages/student/ProgressPage.tsx` lines 38, 52–105, 193–222, and 265–309; `src/components/progress/WeeklyPacingChart.tsx` lines 27–54; `src/components/progress/DeadlineWorkloadHorizon.tsx` lines 21–38
- **Problem:** `timeHorizon` is unused by calculations and child charts.
- **Reproduction:** Switch among Week 7, Last 14 Days, and Term Horizon.
- **Impact:** Identical data is presented under different reporting periods.

### FE-15 — Subject assignment links perform no action

- **Severity:** Medium
- **Category:** UI/UX
- **Location:** `src/components/subjects/SubjectDetailModal.tsx` lines 197–228; `src/pages/student/SubjectsPage.tsx` lines 315–335
- **Problem:** The child invokes `onSelectTask`, but the parent callback is empty.
- **Reproduction:** Open a course and click one of its assignments.
- **Impact:** The expected task-detail flow silently fails.

### FE-16 — Course-specific assignment form displays an untrusted course selection

- **Severity:** Medium
- **Category:** State Management
- **Location:** `src/pages/student/SubjectsPage.tsx` lines 69–71 and 329–347; `src/components/tasks/TaskModal.tsx` lines 68–83 and 178–193
- **Problem:** The modal displays one course while the parent silently overwrites submission with a different preselected course.
- **Reproduction:** Add an assignment from a course other than the first and change the course selector.
- **Impact:** The displayed selection is misleading and the user's selection is ignored.

### FE-17 — “Export All Data” and calendar exports omit major datasets

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/pages/student/SettingsPage.tsx` lines 44–59; `src/utils/icsExport.ts` lines 21–31 and 42–88
- **Problem:** JSON export includes only today's sessions and omits other planner state; ICS export accepts availability but never emits it.
- **Reproduction:** Add future sessions, availability, notifications, and journals, then export.
- **Impact:** Backups and calendar exports are incomplete despite success messaging.

### FE-18 — Destructive student actions lack confirmation

- **Severity:** Medium
- **Category:** UI/UX
- **Location:** `src/pages/student/TasksPage.tsx` lines 703–720 and 818–832; `src/pages/student/SubjectsPage.tsx` lines 280–289; `src/pages/student/AvailabilityPage.tsx` lines 443–459 and 591–613; `src/context/PlannerContext.tsx` lines 193–197 and 240–245; `src/pages/student/SettingsPage.tsx` lines 180–185
- **Problem:** Task, subject, availability, and complete demo-reset actions execute immediately.
- **Reproduction:** Misclick a trash icon or reset control.
- **Impact:** One click can remove a course with related work or reset all planner state.

### FE-19 — Zero-minute transition buffer cannot be saved

- **Severity:** Low
- **Category:** Logic Bug
- **Location:** `src/pages/student/SettingsPage.tsx` lines 27, 29–40, and 146–154
- **Problem:** `parseInt(value) || 15` replaces valid zero with 15.
- **Reproduction:** Enter `0`, save, and revisit the setting.
- **Impact:** A supported preference cannot be stored.

### FE-20 — Login route restoration drops query strings and fragments

- **Severity:** Low
- **Category:** State Management
- **Location:** `src/components/auth/ProtectedRoute.tsx` lines 21–27; `src/pages/public/LoginPage.tsx` lines 68–74; `src/components/auth/GuestRoute.tsx` lines 23–29
- **Problem:** Only `.pathname` is restored after authentication.
- **Reproduction:** Authenticate from `/tasks?status=completed#item`.
- **Impact:** Deep-link filter and anchor state is lost.

### FE-21 — Broken "Admin Quick Demo Access" and "Switch to Admin Console" buttons

- **Severity:** High
- **Category:** Logic Bug / Authentication
- **Location:** `src/pages/public/LoginPage.tsx`; `src/context/AuthContext.tsx`; Navigation/Sidebar components
- **Problem:** The "Admin Quick Demo Access" button on the login screen and the "Switch to Admin Console" navigation button fail to properly transition user state, role permissions, or route redirection into the `/admin` workspace.
- **Reproduction:** Click the "Admin Quick Demo Access" button from the login screen or click "Switch to Admin Console" while logged into the workspace.
- **Impact:** Administrators and demo evaluators cannot reliably access or switch to the Admin Console via the designated UI controls.

### FE-22 — Professor assignment controls allow task completion and lack deadline auto-close/reopen logic

- **Severity:** High
- **Category:** Logic Bug / Role Permissions
- **Location:** `src/pages/student/TasksPage.tsx`; `src/context/PlannerContext.tsx`
- **Problem:** Professors have access to the student-only "Complete Assignment" action. Furthermore, assignments do not automatically close acceptance when their deadline passes, and professors lack the control to manually reopen closed assignments for student resubmission.
- **Reproduction:** Log in as a Professor and view assignment controls; let an assignment's due date pass and observe that submissions remain open without an option to manage or reopen acceptance.
- **Impact:** Professors can trigger student completion states, and assignment deadline enforcement cannot be automated or overridden for resubmissions.

### FE-23 — Overlapping visual elements in the Study Schedule and Calendar views

- **Severity:** Medium
- **Category:** UI/UX
- **Location:** `src/pages/student/SchedulePage.tsx`; `src/pages/student/CalendarPage.tsx`; `src/components/schedule/WeeklyTimeGrid.tsx`; `src/components/schedule/DailyTimeline.tsx`
- **Problem:** Concurrent, back-to-back, or closely scheduled study sessions and commitments render with colliding bounding boxes and overlapping text in the calendar and study schedule grids.
- **Reproduction:** Schedule two sessions or commitments in overlapping or adjacent time slots and view them in the Study Schedule or Calendar time grids.
- **Impact:** Schedule blocks become unreadable and difficult to click or manage when events overlap.

### FE-24 — Missing "Take Subject" onboarding flow for newly created accounts

- **Severity:** Medium
- **Category:** UI/UX / Onboarding
- **Location:** `src/context/AuthContext.tsx`; `src/context/PlannerContext.tsx`; `src/pages/student/SubjectsPage.tsx`; `src/pages/student/DashboardPage.tsx`
- **Problem:** When a user registers a new account, there is no guided onboarding step or empty-state prompt to "Take Subject" (for students) or "Add Faculty Load" (for professors) from the available curriculum catalog.
- **Reproduction:** Register a new account and land on the initial workspace.
- **Impact:** New users are not guided to select and enroll in their subjects upon account creation.

## Backend Issues

### BE-01 — Public authentication endpoints have no request throttling

- **Severity:** High
- **Category:** Security
- **Location:** `server.ts` lines 11–22; `src/server/routes/index.ts` lines 37–38; `src/server/controllers/authController.ts` lines 73–111
- **Problem:** Login and registration have no rate limit, progressive delay, or lockout.
- **Reproduction:** Send parallel login attempts or registrations with unique emails.
- **Impact:** Unbounded password guessing and bcrypt-driven CPU exhaustion.

### BE-02 — Students can read unpublished administrative announcements

- **Severity:** High
- **Category:** Security
- **Location:** `src/server/routes/index.ts` line 111; `src/server/controllers/adminController.ts` lines 466–480
- **Problem:** `GET /api/admin/announcements` omits the admin-role guard and returns all statuses/audiences.
- **Reproduction:** Request it with a student token.
- **Impact:** Draft, archived, and restricted announcements are disclosed.

### BE-03 — Alternate preferences endpoint bypasses scheduler validation

- **Severity:** High
- **Category:** Logic Bug
- **Location:** `src/server/controllers/authController.ts` lines 139–180; `src/server/utils/validators.ts` lines 197–243
- **Problem:** `/auth/preferences` uses direct conversions instead of the strict preference validator.
- **Reproduction:** Submit negative caps, zero duration, oversized breaks, or an unknown preferred time.
- **Impact:** Invalid configuration is accepted or causes unexpected errors.

### BE-04 — Concurrent cross-demotion can remove every administrator

- **Severity:** High
- **Category:** Security
- **Location:** `src/server/controllers/adminController.ts` lines 154–206
- **Problem:** The last-admin count/check and role update are separate operations.
- **Reproduction:** With two admins, concurrently have each demote the other.
- **Impact:** Both checks can pass, leaving no administrator.

### BE-05 — Manual session APIs ignore scheduling invariants

- **Severity:** High
- **Category:** Logic Bug
- **Location:** `src/server/controllers/scheduleController.ts` lines 227–303 and 308–387
- **Problem:** The API checks study-session overlap but ignores fixed commitments, caps, breaks, buffers, and preferred windows.
- **Reproduction:** Create a session during a class or exceed the daily cap using non-overlapping sessions.
- **Impact:** The backend accepts schedules that violate core product guarantees.

### BE-06 — Concurrent completions can lose workload deductions

- **Severity:** High
- **Category:** Logic Bug
- **Location:** `src/server/controllers/scheduleController.ts` lines 439–483
- **Problem:** Remaining task hours are read before the transaction, allowing concurrent requests to calculate from the same stale value.
- **Reproduction:** Complete two one-hour sessions for the same four-hour task concurrently.
- **Impact:** Only one hour may be deducted.

### BE-07 — Password suffixes after bcrypt's 72-byte limit are ignored

- **Severity:** Medium
- **Category:** Security
- **Location:** `src/server/utils/validators.ts` lines 98–105; `src/server/utils/jwt.ts` lines 17–23
- **Problem:** Password validation does not enforce bcrypt's byte limit.
- **Reproduction:** Register with 72 identical bytes plus `x`, then log in using the same prefix plus `y`.
- **Impact:** Passwords users perceive as different authenticate identically.

### BE-08 — Logout does not revoke bearer tokens

- **Severity:** Medium
- **Category:** Security
- **Location:** `src/server/controllers/authController.ts` lines 194–199; `src/server/utils/jwt.ts` lines 26–33; `src/server/config/index.ts` line 41
- **Problem:** Logout returns success without invalidating the seven-day token.
- **Reproduction:** Reuse a captured token after logout.
- **Impact:** Retained or stolen tokens remain usable.

### BE-09 — Malformed login passwords cause 500 responses and leak internals

- **Severity:** Medium
- **Category:** Error Handling
- **Location:** `src/server/controllers/authController.ts` lines 73–91; `src/server/utils/jwt.ts` lines 22–23; `src/server/middleware/errorHandler.ts` lines 20–36
- **Problem:** Password type is not validated, and bcrypt error text reaches the client.
- **Reproduction:** Submit an object as the password for an existing account.
- **Impact:** Internal details leak and responses can help distinguish existing accounts.

### BE-10 — Editing or deleting completed sessions leaves workload unreconciled

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/scheduleController.ts` lines 343–380, 459–483, and 518–551
- **Problem:** Resizing or deleting a completed session does not adjust or restore its previous deduction.
- **Reproduction:** Complete a 90-minute session, then resize or delete it.
- **Impact:** Remaining workload permanently diverges from session history.

### BE-11 — Missing status silently resets a session to scheduled

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/utils/validators.ts` lines 75–84; `src/server/controllers/scheduleController.ts` lines 429–495
- **Problem:** A falsy status defaults to `SCHEDULED` on an explicit status endpoint.
- **Reproduction:** PATCH a completed session's status using `{}`.
- **Impact:** The session is reopened without an explicitly requested status.

### BE-12 — String booleans bypass locked-session behavior

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/scheduleController.ts` lines 326–341 and 395–417
- **Problem:** Truthiness and `Boolean(...)` convert the string `"false"` to true.
- **Reproduction:** Send `"unlockExplicit":"false"` or `"locked":"false"`.
- **Impact:** Locked sessions can move unexpectedly, or apparent false values can lock them.

### BE-13 — Date validation accepts impossible and non-ISO dates

- **Severity:** Medium
- **Category:** API Contract
- **Location:** `src/server/utils/validators.ts` lines 245–265; `src/server/controllers/scheduleController.ts` lines 31–53 and 227–238; `src/server/controllers/taskController.ts` lines 191–204
- **Problem:** Date-only strings are pattern-checked without calendar validation, while datetime parsing is permissive.
- **Reproduction:** Submit `2026-02-30` or `10/23/2026`.
- **Impact:** Invalid dates are accepted or normalize unexpectedly.

### BE-14 — Default schedule date uses UTC rather than local date

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/scheduleController.ts` lines 31–41
- **Problem:** “Today” is derived using `toISOString()`.
- **Reproduction:** Request the default schedule in Asia/Manila between 00:00 and 07:59.
- **Impact:** The returned range begins on the previous local day.

### BE-15 — Task estimate can be reduced below remaining work

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/taskController.ts` lines 292–314
- **Problem:** The remaining-versus-estimate invariant is checked only when both fields are submitted together.
- **Reproduction:** Reduce a task's estimate from four hours to one without sending `remainingHours`.
- **Impact:** Task workload becomes internally contradictory.

### BE-16 — Unscheduled tasks are derived from the wrong session set

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/scheduleController.ts` lines 56–104
- **Problem:** Cancelled sessions count as scheduled, while valid sessions outside the displayed range do not.
- **Reproduction:** Give a task only a cancelled in-range session or a valid future session outside the range.
- **Impact:** Tasks incorrectly enter or disappear from the unscheduled queue.

### BE-17 — Announcement audience targeting is ignored during notification sync

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/notificationController.ts` lines 156–175 and 217–233
- **Problem:** Published announcements are copied to every user without evaluating `targetCohort`; selection is also arbitrarily limited to five.
- **Reproduction:** Publish a restricted announcement and synchronize as an unrelated student.
- **Impact:** Restricted content reaches unintended users, and other broadcasts may be omitted.

### BE-18 — Historical sessions make current workload appear covered

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/progressController.ts` lines 75–105 and 112–129
- **Problem:** Historical completed and missed sessions are compared against current remaining work without a default time window.
- **Reproduction:** Leave current work without future sessions on a subject that has enough old sessions.
- **Impact:** The subject can be labeled `on_track` despite having no future plan.

### BE-19 — Explicit zero logged minutes count as full duration

- **Severity:** Medium
- **Category:** Logic Bug
- **Location:** `src/server/controllers/scheduleController.ts` lines 486–495; `src/server/controllers/progressController.ts` lines 107–110; `src/server/controllers/adminController.ts` lines 424–429
- **Problem:** Aggregations use `actualMinutesLogged || durationMinutes`.
- **Reproduction:** Complete a 90-minute session with `actualMinutesLogged: 0`.
- **Impact:** Some metrics report 90 minutes while others report zero.

### BE-20 — Privileged actions succeed when audit recording fails

- **Severity:** Medium
- **Category:** Security
- **Location:** `src/server/utils/auditLogger.ts` lines 20–42; `src/server/controllers/adminController.ts` lines 196–228, 507–523, 552–573, and 593–612
- **Problem:** Audit failures are swallowed and mutation callers do not inspect the result.
- **Reproduction:** Cause audit recording to fail during a role or announcement mutation.
- **Impact:** Security-sensitive actions complete without an audit trail.

### BE-21 — Announcement creation accepts invalid enums and misleading booleans

- **Severity:** Medium
- **Category:** API Contract
- **Location:** `src/server/controllers/adminController.ts` lines 483–505 and 529–555
- **Problem:** Creation accepts arbitrary truthy status strings and converts `"false"` to true; invalid update enums are silently ignored.
- **Reproduction:** Submit `status:"publshed"` and `pinned:"false"`.
- **Impact:** Announcements enter invalid states or appear updated when fields were discarded.

### BE-22 — Predictable JWT secret is presented as usable configuration

- **Severity:** Medium
- **Category:** Security
- **Location:** `.env.example` lines 11–12; `src/server/config/index.ts` lines 28–35; `src/server/utils/jwt.ts` lines 26–33
- **Problem:** The example and development fallback contain public fixed signing secrets.
- **Reproduction:** Deploy using the copied example value.
- **Impact:** Tokens can be forged wherever the published secret is reused.

### BE-23 — Development server is exposed to the local network

- **Severity:** Medium
- **Category:** Security
- **Location:** `server.ts` lines 43–48
- **Problem:** The combined development server binds to `0.0.0.0`.
- **Reproduction:** Run `bun run dev` on a shared network.
- **Impact:** Development middleware, demo credentials, and writable APIs are reachable from other devices unless firewalled.

### BE-24 — Unknown API routes return the SPA with HTTP 200

- **Severity:** Low
- **Category:** Error Handling
- **Location:** `server.ts` lines 18–38; `src/server/routes/index.ts` lines 19–116
- **Problem:** No `/api` not-found handler runs before the SPA fallback.
- **Reproduction:** Request `/api/not-a-real-route`.
- **Impact:** API typos appear successful and JSON clients receive HTML.

### BE-25 — Baseline HTTP security headers are absent

- **Severity:** Low
- **Category:** Security
- **Location:** `server.ts` lines 11–22
- **Problem:** Express identification remains enabled and common defensive headers are not applied.
- **Reproduction:** Inspect any response headers.
- **Impact:** `X-Powered-By: Express` is exposed and browser defense-in-depth is reduced.

### BE-26 — Invalid port configuration crashes startup

- **Severity:** Low
- **Category:** Error Handling
- **Location:** `src/server/config/index.ts` line 38; `server.ts` line 46
- **Problem:** `PORT` is parsed without validating `NaN`, range, or trailing text.
- **Reproduction:** Start with `PORT=abc` or `PORT=70000`.
- **Impact:** Startup throws instead of reporting a controlled configuration error.

## Integration and Contract Issues

### INT-01 — UI and API authentication use separate identities

- **Severity:** Critical
- **Category:** Security
- **Location:** `src/context/AuthContext.tsx` lines 83–120, 125–184, and 200–220; `src/components/auth/ProtectedRoute.tsx` lines 21–36; `src/services/adminService.ts` lines 84–136; `src/server/controllers/authController.ts` lines 72–108; `src/server/middleware/auth.ts` lines 16–52
- **Problem:** UI login never consumes a backend token. Admin calls independently log in using hardcoded credentials for `e.vance@university.edu`.
- **Reproduction:** Log into the UI as any locally accepted admin, then open an API-backed admin page.
- **Impact:** Actions can run under a shared unrelated identity, defeating authorization and audit attribution; otherwise, UI-authorized admins encounter broken API operations.

### INT-02 — The student API is disconnected from the student workspace

- **Severity:** High
- **Category:** API Contract
- **Location:** `src/context/PlannerContext.tsx` lines 97–165, 179–353, and 419–457; `src/context/AuthContext.tsx` lines 216–220; `src/pages/student/SettingsPage.tsx` lines 29–41; `src/server/routes/index.ts` lines 39–97
- **Problem:** No frontend caller uses the subject, task, availability, session, notification, progress, profile, preference, or logout routes.
- **Reproduction:** Perform any student mutation while monitoring network traffic.
- **Impact:** Server validation and ownership checks are bypassed, and changes cannot synchronize across devices.

### INT-03 — Announcement creation discards the server ID

- **Severity:** High
- **Category:** State Management
- **Location:** `src/pages/admin/AnnouncementsPage.tsx` lines 84–163; `src/context/PlannerContext.tsx` lines 382–417; `src/services/adminService.ts` lines 223–265; `src/server/controllers/adminController.ts` lines 466–477, 519–523, and 529–612
- **Problem:** The frontend invents a local ID, does not await creation, ignores the returned ID, and never hydrates from `getAnnouncements`.
- **Reproduction:** Create an announcement, then edit, pin, unpublish, or delete it.
- **Impact:** Follow-up requests target nonexistent server IDs while local state falsely changes.

### INT-04 — Account suspension overwrites the academic term

- **Severity:** High
- **Category:** Security
- **Location:** `src/pages/admin/UsersPage.tsx` lines 174–188 and 479–491; `src/services/adminService.ts` lines 210–220; `src/server/controllers/adminController.ts` lines 234–284
- **Problem:** The UI's account status is sent through the backend's `term` field.
- **Reproduction:** Mark a user Suspended and then authenticate as that user.
- **Impact:** Access remains enabled while the academic term is corrupted.

### INT-05 — Combined user edit can secretly commit an admin grant

- **Severity:** High
- **Category:** Error Handling
- **Location:** `src/pages/admin/UsersPage.tsx` lines 116–154 and 462–500; `src/services/adminService.ts` lines 197–220; `src/server/controllers/adminController.ts` lines 152–228 and 234–284
- **Problem:** Role and major updates are sequential with no rollback; local state changes only if both succeed.
- **Reproduction:** Change a student to admin while submitting a one-character major that the second request rejects.
- **Impact:** Administrator privilege is committed while the UI reports failure and displays the old role.

### INT-06 — Production build and start scripts are incompatible

- **Severity:** High
- **Category:** API Contract
- **Location:** `package.json` lines 8–9; `server.ts` lines 24–37; `.gitignore` line 3
- **Problem:** `build` emits only client assets, while `start` requires nonexistent `dist/server.js`; `start` also does not set production mode.
- **Reproduction:** Run `bun run build` followed by `bun run start`.
- **Impact:** The repository-defined production deployment cannot start.

### INT-07 — User-directory pagination and server search are ignored

- **Severity:** Medium
- **Category:** API Contract
- **Location:** `src/pages/admin/UsersPage.tsx` lines 58–90, 201–221, and 288–330; `src/services/adminService.ts` lines 181–195; `src/server/controllers/adminController.ts` lines 14–95
- **Problem:** The UI loads only the default first page, ignores metadata, and searches that page locally.
- **Reproduction:** Search for a user outside the first 50 name-sorted records.
- **Impact:** The user cannot be found or managed, and displayed totals represent only the first page.

### INT-08 — Empty user responses preserve stale users

- **Severity:** Medium
- **Category:** State Management
- **Location:** `src/pages/admin/UsersPage.tsx` lines 40 and 58–85; `src/server/controllers/adminController.ts` lines 74–95
- **Problem:** Successful results replace state only when `data.length > 0`.
- **Reproduction:** Select a role with zero backend users.
- **Impact:** Fixture or previous-filter users remain visible and receive invalid mutations.

### INT-09 — npm metadata contradicts the selected Bun workflow

- **Severity:** Medium
- **Category:** API Contract
- **Location:** `package.json` line 46; `package-lock.json` lines 27–38; `bun.lock` lines 24–36; `README.md` lines 114–135; `CLAUDE.md` lines 59–63
- **Problem:** `package-lock.json` is out of sync, while setup documentation still instructs npm instead of Bun.
- **Reproduction:** Run a clean `npm ci`.
- **Impact:** npm-based installation and CI fail, while mixing managers can recreate native dependency corruption.

### INT-10 — Subject creation, credit hours, and enrollment permissions violate role boundaries

- **Severity:** High
- **Category:** Authorization / Role Permissions
- **Location:** `src/pages/student/SubjectsPage.tsx`; `src/pages/admin/CurriculumPage.tsx`; `src/context/PlannerContext.tsx`; `src/server/controllers/subjectController.ts`
- **Problem:** Subject creation and enrollment are not properly segregated by role:
  1. Non-admin users can create/add new subjects and modify credit hours/units, whereas **only the Admin** should be permitted to create subjects and set or edit their credit hours/units.
  2. **Professors/Teachers** are shown "Enroll Subject" instead of **"Add Faculty Load"**, and cannot claim existing admin-created subjects to set or adjust their class schedules.
  3. **Students** can create arbitrary subjects from scratch instead of only being able to **take/enroll** in existing subjects from the curriculum.
- **Reproduction:** Log in as a Student or Professor, navigate to Subjects, and observe the ability to create custom subjects, edit credit units, or use "Enroll Subject" as a faculty member.
- **Impact:** Unauthorized curriculum modifications, inaccurate faculty load terminology, and uncoordinated subject schedules across roles.

## Follow-up Configuration and Login Findings (2026-10-26)

These findings were added after reproducing the user-facing message `Database service is temporarily unavailable`. No application-code remediation was authorized during this follow-up. Sensitive values are intentionally omitted.

### FE-25 — Login error collapses configuration and schema failures into a generic outage

- **Severity:** Medium
- **Category:** Error Handling / Operability
- **Location:** `src/pages/public/LoginPage.tsx`; `src/server/middleware/errorHandler.ts`; `src/server/db/prisma.ts`
- **Problem:** The login page presents the same temporary-database-outage message for a missing `DATABASE_URL`, an old server process that has not reloaded `.env`, an unreachable provider, and an unapplied database migration.
- **Reproduction:** Start the development server with an empty `.env`, attempt login, then save a valid `.env` without restarting the server and attempt login again.
- **Impact:** Operators repeatedly retry credentials even though the failure is unrelated to the email or password, and the UI provides no correlation or development-only diagnostic path.

### BE-27 — Development startup succeeds without its required database dependency

- **Severity:** Medium
- **Category:** Configuration / Availability
- **Location:** `src/server/config/index.ts`; `src/server/db/prisma.ts`; `server.ts`
- **Problem:** In development, a missing `DATABASE_URL` emits a warning but still starts the unified application. The frontend loads normally, while authentication and all persisted workflows fail later at request time.
- **Reproduction:** Leave `.env` empty and run `bun run dev`; load the login page and submit valid-looking credentials.
- **Impact:** The application appears healthy even though its core dependency is unavailable, producing a misleading partially running state and avoidable user-facing 503 responses.

### INT-11 — Environment, migration, restart, and seed readiness are not verified as one workflow

- **Severity:** Medium
- **Category:** Integration / Deployment Readiness
- **Location:** `.env.example`; `README.md`; `package.json`; `server.ts`; `prisma/migrations/`; `prisma/seed.ts`
- **Problem:** Setup is split across manual steps without a single readiness check. Saving `.env` does not update an already running process, pending migrations are not detected before the login UI becomes available, and the known seed password applies only to explicitly seeded accounts—not to an arbitrary email entered on the login form.
- **Observed evidence:** The saved `.env` was initially zero bytes. After a valid URL was saved, Prisma reached the configured PostgreSQL service, reported one pending migration, and the migration was deployed. The browser still required a full server restart and a verified account before login could be meaningfully retested.
- **Reproduction:** Start with an empty `.env`, open the app, save valid environment values, deploy a pending migration, but leave the original server process running and try an email that was never seeded or registered.
- **Impact:** A valid database can still appear unavailable, while seed credentials are mistakenly tested against unrelated accounts.

### OPS-01 — Live infrastructure credentials were disclosed outside the secret store

- **Severity:** Critical
- **Category:** Secret Management / Incident Response
- **Location:** External conversation history and the local git-ignored `.env`; affected providers include PostgreSQL, object storage, email delivery, and JWT signing.
- **Problem:** Live-looking connection and API credentials were copied into a conversational channel. Git ignore rules prevent repository commits but do not make already disclosed credentials safe.
- **Required response:** Revoke and rotate the database role password, object-storage access key pair, email-provider API key, and JWT signing secret. Do not reuse the disclosed values. Invalidate active JWTs after rotating the signing secret.
- **Release gate:** Old credentials must be proven rejected, new credentials must exist only in approved secret stores/local ignored files, and repository/history secret scanning must pass before deployment.
- **Impact:** Unauthorized database, storage, or email access and forged authentication tokens are possible until rotation is complete.

### Sanitized follow-up evidence

- The local `.env` is git-ignored.
- The local `.env` now contains the required variable names; values were not recorded in this report.
- Prisma successfully contacted the configured PostgreSQL database.
- Migration `20261025_add_password_reset` was pending and was successfully deployed during diagnosis.
- The currently displayed login failure has not yet been revalidated after a confirmed server restart.
- The existence, role, and password state of the email used in the latest screenshot have not yet been verified.

## QA Validation Plan

The following checklist should be executed after fixes begin. Each item maps back to one or more findings above.

### P0 — Security and identity

- [ ] Rotate every credential covered by `OPS-01` and verify each disclosed credential is rejected.
- [ ] Rotate the JWT secret and verify tokens signed with the disclosed secret no longer authenticate.
- [ ] Run a secret scan across tracked files and repository history without printing secret values (`OPS-01`).
- [ ] Verify that UI login creates and uses the authenticated user's backend token (`INT-01`).
- [ ] Confirm that no administrator credentials exist in the client bundle (`INT-01`).
- [ ] Attempt to edit browser storage and verify that it cannot grant protected access (`FE-01`).
- [ ] Log out and confirm the token cannot access `/api/auth/me` or admin routes (`BE-08`).
- [ ] Log in as a student and verify all `/api/admin/*` endpoints reject access, including announcements (`BE-02`).
- [ ] Exercise login and registration rate limits under parallel requests (`BE-01`).
- [ ] Validate passwords at 71, 72, and more than 72 UTF-8 bytes (`BE-07`).
- [ ] Verify production rejects missing, example, or weak JWT secrets (`BE-22`).
- [ ] Confirm role demotion cannot leave the deployment without an administrator (`BE-04`).
- [ ] Force audit recording to fail and verify privileged changes do not silently succeed (`BE-20`).
- [ ] Verify the "Admin Quick Demo Access" and "Switch to Admin Console" buttons authenticate and route to the Admin Console properly (`FE-21`).

### P0 — Environment and database readiness

- [ ] Start with no `DATABASE_URL` and verify the server fails fast with an operator-facing message before serving the login UI (`BE-27`).
- [ ] Start with an unreachable database and verify readiness is reported as unhealthy without exposing connection details (`BE-27`).
- [ ] Save or rotate `.env`, fully restart `bun run dev`, and confirm the new process loaded the updated variables (`INT-11`).
- [ ] Run `prisma migrate status` and require zero pending migrations before authentication smoke tests (`INT-11`).
- [ ] Verify the intended account exists, has the intended role, and is tested with its own password—not the seed password of a different account (`INT-11`).
- [ ] Confirm configuration/schema failures are distinguishable in server logs while the browser retains a safe, actionable message (`FE-25`).

### P0 — Cross-account isolation and persistence

- [ ] Create private planner data as user A, log out, and confirm user B cannot see it (`FE-06`).
- [ ] Create subjects, tasks, sessions, availability, notifications, and preferences; refresh and verify referential consistency (`FE-07`).
- [ ] Verify student actions call their matching backend routes and reload from authoritative state (`INT-02`).
- [ ] Test the same account across two browser profiles/devices for consistent data (`INT-02`).

### P0 — Role-based curriculum, faculty load, and assignment workflows

- [ ] Verify that **only Admins** can create new subjects and modify subject credit hours/units (`INT-10`).
- [ ] Verify that **Professors/Teachers** see **"Add Faculty Load"** (never "Enroll Subject") and can claim admin-created subjects to set/adjust class schedules (`INT-10`).
- [ ] Verify that **Students** can only take/enroll in existing subjects and cannot create new subjects or alter credit units (`INT-10`).
- [ ] Verify that **Professors** cannot use the "Complete Assignment" function (`FE-22`).
- [ ] Verify that assignment acceptance automatically closes when the deadline is reached, and that Professors can reopen closed assignments for resubmission (`FE-22`).
- [ ] Create a new account and verify the onboarding / initial state provides a clear "Take Subject" flow (`FE-24`).

### P0 — Scheduling and workload integrity

- [ ] Generate schedules around class, work, and personal commitments (`FE-03`, `BE-05`).
- [ ] Verify daily caps, preferred windows, break length, session duration, buffers, requested date range, and deadlines (`FE-03`, `BE-05`).
- [ ] Complete, reopen, re-complete, resize, cancel, and delete sessions while checking remaining workload after every action (`FE-04`, `FE-05`, `BE-10`).
- [ ] Complete multiple sessions concurrently and confirm every deduction is preserved (`BE-06`).
- [ ] Regenerate after completed sessions and confirm completed minutes are not deducted twice (`FE-04`).
- [ ] Submit empty, invalid, and string-valued status/lock payloads (`BE-11`, `BE-12`).
- [ ] Confirm zero actual minutes remain zero in every progress/admin metric (`BE-19`).

### P1 — Administrative workflows

- [ ] Create an announcement and verify subsequent edit, pin, publish, and delete operations use the returned server ID (`INT-03`).
- [ ] Verify draft and cohort-restricted announcements are visible only to intended users (`BE-02`, `BE-17`).
- [ ] Test invalid announcement status, priority, and string booleans (`BE-21`).
- [ ] Test failed announcement requests and ensure the UI never reports success (`FE-08`).
- [ ] Verify account suspension actually restricts access without changing academic term (`INT-04`).
- [ ] Force the second half of a combined user edit to fail and verify no partial role grant remains (`INT-05`).
- [ ] Test user pagination/search with more than 50 accounts and with empty result sets (`INT-07`, `INT-08`).
- [ ] Rapidly change audit filters/pages and verify stale requests cannot overwrite newer results (`FE-11`).

### P1 — Calendar, timers, and dates

- [ ] Edit sessions from both Schedule and Calendar and verify no duplicate is created (`FE-02`).
- [ ] Test “today” near local midnight and across multiple time zones (`FE-12`, `BE-14`).
- [ ] Navigate calendar months and weeks outside October 2026 (`FE-12`).
- [ ] Confirm cancelled sessions are excluded from every planned-hours view (`FE-13`).
- [ ] Run focus timers for partial and zero elapsed durations, close/reopen them, and compare displayed versus credited time (`FE-09`).
- [ ] Submit leap days, month boundaries, impossible dates, and non-ISO datetimes (`BE-13`).
- [ ] Schedule concurrent or adjacent events in the Study Schedule and Calendar views and verify that blocks render side-by-side or cleanly without overlapping text/UI collisions (`FE-23`).

### P1 — Error and failure states

- [ ] Disconnect the API and verify dashboards show unavailable/error states rather than healthy fixture values (`FE-10`).
- [ ] Submit malformed login payload types and verify controlled 4xx responses without internal text (`BE-09`).
- [ ] Request unknown `/api` paths and verify a JSON 404 response (`BE-24`).
- [ ] Test invalid `PORT` values and verify controlled startup validation (`BE-26`).
- [ ] Inspect production response security headers (`BE-25`).
- [ ] Verify the development server is not unintentionally reachable from other network devices (`BE-23`).

### P2 — UX and data portability

- [ ] Verify progress horizon controls recalculate all charts and labels (`FE-14`).
- [ ] Open assignments from the subject-detail modal (`FE-15`).
- [ ] Add assignments from several courses and verify the displayed and saved course match (`FE-16`).
- [ ] Export all data and compare every supported dataset against in-app state (`FE-17`).
- [ ] Import calendar export into an external calendar and verify study sessions and commitments (`FE-17`).
- [ ] Verify destructive actions require confirmation and communicate cascade scope (`FE-18`).
- [ ] Save a zero-minute transition buffer (`FE-19`).
- [ ] Authenticate from a URL containing query parameters and a fragment, then verify full restoration (`FE-20`).

### P0 — Build and release

- [ ] Perform a clean Bun install using only the selected lockfile (`INT-09`).
- [ ] Run lint and the backend test suite from a clean checkout.
- [ ] Build the production client and server artifacts (`INT-06`).
- [ ] Start the generated production server with production environment settings (`INT-06`).
- [ ] Smoke-test frontend routes, SPA refreshes, API routes, static assets, and unknown API routes in the production build.

## Verified Non-Issues

- The frontend and backend intentionally share port `3000` through Vite middleware.
- TypeScript checking currently passes.
- The inspected focus timer clears its interval on dependency changes and unmount.
- Inspected document and modal keyboard listeners are removed correctly.
- Login and registration submit buttons prevent ordinary repeated clicks while loading.
- No `dangerouslySetInnerHTML` usage was found; inspected text paths retain React escaping.
- No permissive CORS middleware was found.
- No raw-query or string-concatenation injection path was found at the inspected API boundary.
- Most asynchronous controllers forward failures to the global error handler.
