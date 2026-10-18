# StudyFlow Technical Architecture & Conflict Analysis

> **Document Status**: Canonical Technical Architecture & Conflict Report  
> **Version**: 2.0.0 (Post-Foundation & TypeScript Sync)  
> **Primary Technology Stack**: React 19, TypeScript 5.7, Tailwind CSS v4, React Router v7, Lucide React, Motion, Vite 8

---

## 1. Project Health & Repository Inspection

### Current Repository Audit
- **Framework & Bundler**: Vite 8.3.0 + React 19.0.1 + `@tailwindcss/vite` 4.3.3.
- **Routing**: React Router v7 (`react-router-dom` 7.18.4) with clean declarative routes in `src/App.tsx`.
- **TypeScript**: `tsconfig.json` with strict type checking, `moduleResolution: "bundler"`, zero compilation errors.
- **Styling**: Tailwind CSS v4 with `@import "tailwindcss";` and `@theme` CSS variables in `src/index.css`.
- **Design Tokens**: Centralized in `src/theme/tokens.ts` (`THEME_COLORS`, `SUBJECT_CATEGORY_STYLES`, `BUTTON_STYLES`, `INPUT_STYLES`).
- **Icons**: `lucide-react` 0.546.0 installed.
- **Animations**: `motion` 12.23.24 installed.
- **State & Context**: Reactive React Context providers in `src/context/` (`PlannerContext`, `AuthContext`, `ToastContext`).

---

## 2. Identified Project Decisions & Resolutions

### 1. Tailwind CSS v4 vs. Legacy Tailwind v3 Configuration
- **Decision**: Tailwind v4 uses CSS-first configuration via `@theme` directives inside `src/index.css` paired with the `@tailwindcss/vite` plugin.
- **Rule**: Do NOT introduce a `tailwind.config.js` or `postcss.config.js` file. All custom tokens are managed directly in `src/index.css` and `src/theme/tokens.ts`.

### 2. High-Character Academic Typography
- **Decision**: Avoid generic browser sans fallbacks.
- **Rule**: Integrated Google Fonts in `index.html` loading `Plus Jakarta Sans` (for warm, student-friendly legibility) and `JetBrains Mono` (for tabular numerals in study hours, countdowns, and timestamps), with `@theme` bindings in `src/index.css`.

### 3. Deterministic Scheduling vs. Stochastic LLM Generation
- **Decision**: LLM prompts for scheduling introduce latency, hallucinations, and network fragility.
- **Rule**: The core scheduling engine is a client-side **deterministic, greedy knapsack algorithm with fatigue spreading** implemented in `src/context/PlannerContext.tsx`. It runs in $<5\text{ms}$ in-memory, guarantees non-overlapping sessions, respects sleep/class blocks, and yields instant reactive feedback.

### 4. Client-Side Routing vs Sandboxed Dev Server
- **Decision**: React Router v7 (`BrowserRouter`) handles all 19 defined routes smoothly.
- **Rule**: All navigation uses `<NavLink>` or programmatic `useNavigate` with automatic fallback to `/dashboard`.

### 5. Port 3000 & Frame Constraints
- **Decision**: Development server runs strictly on port 3000 with no `window.alert` or `window.open` calls.
- **Rule**: All modals, toast notifications, and user confirmations are rendered with custom accessible in-app components (`Modal.tsx`, `ToastContext.tsx`).

---

## 3. Architecture Roadmap: Phase 1 vs Phase 2

### Phase 1: Current Implementation State (Delivered)
- Full-featured React 19 + TypeScript SPA.
- All 19 routes fully functional with zero placeholder screens.
- In-memory reactive state with rich realistic college seed data (`src/data/mockData.ts`).
- Deterministic anti-cram scheduling engine with mode selection and fatigue caps.
- Instant Student $\leftrightarrow$ Admin role switcher.

### Phase 2: Full-Stack Persistence (Future Backend)
- Express API server mounted via `server.ts` or backend proxy.
- PostgreSQL database managed by Prisma ORM (`prisma/schema.prisma`).
- JWT authentication with bcrypt password hashing and HTTP Bearer tokens.
- REST endpoints (`/api/tasks`, `/api/subjects`, `/api/availability`, `/api/schedule`, `/api/admin/*`).
