# StudyFlow — Claude Engineering & Project Constitution

> **Project**: StudyFlow — Student-Friendly Study Planner & Assignment Scheduler  
> **Authority**: Permanent development constitution for all AI-assisted engineering turns  
> **Core Objective**: Build a student-focused, colorful, polished, high-utility academic planner.

---

## 1. Development Behavior & Engineering Rules

1. **Inspect Before Modifying**:
   - Always inspect relevant files before making changes.
   - Read the project's Markdown documentation (`DESIGN.md`, `PRODUCT.md`, `ARCHITECTURE.md`) before major modifications.
2. **Preserve Working Functionality**:
   - Never break or restart existing working routes, components, state management, or interactions.
   - Do not rewrite unrelated code.
3. **No Unnecessary Dependencies**:
   - Use the established stack (React 19, Vite, Tailwind CSS v4, React Router, Lucide React).
   - Do not add state libraries, CSS frameworks, or heavy packages without practical necessity.
4. **Prefer Simple, Understandable Solutions**:
   - Avoid over-engineering. Keep code clean, modular, and readable to an undergraduate Computer Science student.
   - Do not create abstractions, adapters, or wrapper folders without a clear operational purpose.
5. **Verify After Implementation**:
   - Always verify changes using `compile_applet` and `lint_applet` to ensure zero compilation or TypeScript errors.

---

## 2. Visual & Design Behavior

1. **Follow `DESIGN.md` as the Absolute Visual Authority**:
   - StudyFlow is a **colorful, polished, student-focused application**.
   - **Anti-AI-slop does NOT mean making the interface bland, monochrome, sterile, or excessively minimal**.
   - Do not strip away color, roundings, or personality under the guise of minimalism.
   - The visual standard is: **COLORFUL + POLISHED + PURPOSEFUL**, never *minimal + bland + sterile*.
2. **Blue/Cyan Academic Brand Identity**:
   - Grounded in vibrant blue (`#0284c7`, `sky-600`), bright blue (`#0ea5e9`), and cyan accents (`#06b6d4`), with deep navy text (`#0f172a`), soft light-blue canvas (`#f8fafc`), and crisp white surfaces.
   - Distinct, colorful subject tags (CS cyan, Math royal blue, Bio emerald, Humanities amber, Social orange, Arts violet).
3. **MyStudyLife Inspiration (Product Personality Only)**:
   - Use MyStudyLife screenshots as inspiration for **personality, student warmth, color variety, and visual hierarchy**.
   - Do NOT copy MyStudyLife's logo, branding, exact layout, proprietary assets, or wording. StudyFlow has its own identity.
4. **No Generic AI SaaS Templates**:
   - Do not default to purple AI gradients, glassmorphism blur cards, floating stat cockpits, or identical card-grid templates.
   - Do not invent new visual languages for individual pages; adhere to the tokens in `DESIGN.md`.

---

## 3. Implementation Quality Standards

Every feature must maintain complete user state handling:
- **Loading States**: Low-contrast skeleton pulses matching real element geometry.
- **Empty States**: Instructive, non-patronizing messages with clear primary action buttons.
- **Error States**: Inline field error alerts and top-level boundary fallbacks with actionable retry options.
- **Validation States**: Immediate client-side form feedback and strict future backend validation.
- **Disabled & Active States**: Distinct visual feedback with accessible focus rings (`focus-visible:ring-2`).
- **Security Invariant**: Frontend route protection is for user experience only; backend authorization must independently verify permissions on every request when server functionality is connected.

---

## 4. Key Commands & Runtime Setup

- **Dev Server**: `npm run dev` (Runs Vite dev server on port 3000).
- **Build**: `npm run build` (Vite build into `dist`).
- **Lint / Typecheck**: `npm run lint` (`tsc --noEmit`).

---

## 5. Source of Truth References

- **Visual & UX Rules**: 👉 `DESIGN.md` (Primary Visual Authority)
- **Product Scope & Requirements**: 👉 `PRODUCT.md`
- **Technical Architecture & File Map**: 👉 `ARCHITECTURE.md`
- **Developer Overview**: 👉 `README.md`

---

## 6. Authentication UX & Routing Constitution

1. **Dedicated Route-Based Architecture**:
   - StudyFlow authentication ALWAYS uses dedicated full-page routes (`/login`, `/register`, `/forgot-password`).
   - Authentication is **NEVER** displayed as a modal pop-up, modal dialog, overlay, or portal from the public landing page or header.
   - Clicking "Sign In" anywhere navigates directly to `/login`.
   - Clicking "Get Started Free" anywhere navigates directly to `/register`.
   - Logging out ALWAYS navigates to `/login` to render the exact same split-screen authentication experience.
2. **Auth Surface vs Modal Dialog (Critical Distinction)**:
   - The form container on the right side of `AuthLayout` is an **Auth Surface** (an elevated, tactile, softly-shadowed container embedded in the page composition).
   - It is **NOT** a modal dialog, popup, or overlay with a darkened/blurred backdrop.
   - There should NEVER be a blurred landing page behind a login or register form.
