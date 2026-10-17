# AGENTS.md — Global Development Rules & Invariants for AI Agents

> **Project:** Student Savings (SEP)  
> **Platform:** Android Mobile App (Ionic 8 + Angular 18 Standalone + Capacitor) & Cloudflare Edge Backend  
> **Target Audience:** Jonas (student managing monthly allowances on campus)  
> **Authority:** This document defines mandatory, non-negotiable rules for all AI coding agents working on this codebase.

---

## 1. Absolute Invariants (Zero Tolerance)

1. **ZERO EMOJIS**:
   - Under NO circumstances should Unicode emoji characters (e.g., 🚀, 💡, 💰, ⚠️, ❌, 🎉) be written in source code, Angular templates, SCSS, JSON, or agent responses.
   - Use official Ionicons (`sparkles-outline`, `wallet-outline`, `trophy-outline`, `alert-circle-outline`, etc.) for all visual indications.

2. **Bilingual Strict Separation**:
   - **English ONLY** for all user-facing application UI: button labels, page titles, form placeholders, error toasts, notifications, and M. Pognon coaching advice.
   - **French ONLY** for all communication with the developer (Jonas): agent conversation responses, technical reports, pull request summaries, and walkthroughs.

3. **M. Pognon Autonomous Character & Agency**:
   - M. Pognon is the central figure (Campus Financial Guard): half strict coach, half teasing big brother.
   - M. Pognon is an **autonomous agent**: he has full access to financial state and can execute CRUD operations on the student's behalf (allocating envelopes, logging expenses, undoing/deleting entries, topping up allowances).

---

## 2. Design System & UX Standards (Odoo Calm Ledger Theme)

1. **Light Theme Only**:
   - Dark mode is explicitly **prohibited** per UX-DR1. All screens, cards, modals, and toolbars must render on light surfaces.

2. **Official Color Tokens**:
   - **Plum (`#714B67`)**: Primary brand identity. Used for page titles, big balance numbers, envelope branding, and secondary button borders.
   - **Teal (`#017e84`)**: Actionable elements, primary buttons, positive savings progress, and the Avoided Total (the reward).
   - **Amber (`#ffac00` / `#3a2a00`)**: Budget warning states (70%, 90%, and overruns). Overruns stay amber; NEVER use red for a budget state.
   - **Red (`#c0392b`)**: Real technical errors only (failed OCR, network failure). NEVER use for a budget envelope.
   - **Neutrals**: Base surface `#F7F3F6`, Raised card `#FFFFFF`, Ink primary `#2B1F28`, Ink muted `#6B5966`, Border hairline `#EADFE7`.

3. **Typography**:
   - Font family: **Nunito** exclusively.
   - Never use uppercase text for full sentences or headings (reserved only for small badge pills: `DISCOVERY`, `SAFE`).

4. **Vertical Rhythm & Item Spacing**:
   - **14px Spacing Below Each Item**: The vertical separation under each item or card must consistently be **14px** (`gap: 14px` or `margin-bottom: 14px`), following official Ionic guidelines.
   - **No Compressed Cards**: Never squeeze or compact card internal padding. Cards must breathe with comfortable padding (`padding: 14px 16px`), standard 38px icon boxes, and readable typography.
   - **Structured Section Headers**: Every collection of items (envelopes, transactions, wishlist) **MUST** have a clear section header (`.section-header-row`, 12.5px-13px uppercase bold title + count/metadata badge) placed before displaying cards.
   - **Thumb-Zone Ergonomics**: Primary action buttons live in the lower thumb zone, above the bottom navigation bar.

---

## 3. SCSS & Architecture Hygiene Rules

1. **Strict SCSS Sizing Limit (Max 50-100 Lines per File)**:
   - Any SCSS file approaching 100 lines **MUST be modularized**.
   - Modal sheets, complex multi-step forms, and reusable component blocks must be extracted into dedicated SCSS files (e.g., `budget-config-modal.scss`) and imported via `@use`.
   - Never pile hundreds of lines of modal, animation, or utility CSS inside a page-level SCSS file.

2. **Shared Design System Usage**:
   - Always reuse tokens and mixins from `src/theme/shared/`:
     - `_cards.scss` (`sep-card`, `sep-card-hero`)
     - `_mixins.scss` (`sep-card-base`, `sep-pill-badge`, `sep-interactive-tap`)
     - `_ledger-items.scss` (`sep-ledger-list`, `sep-transaction-item`)
     - `_toolbars.scss` (`sep-toolbar`, `sep-header-toolbar`)
   - Maximum CSS nesting depth: **3 levels**. Avoid deep nesting and specificity wars.

3. **Frontend Component Architecture**:
   - Standalone Angular components only (`standalone: true`).
   - Signal-based reactivity with the **Facade Pattern**:
     - Components must **NEVER** contain business calculation logic or direct state mutations.
     - Components inject Facades (`BudgetFacade`, `ExpensesFacade`, `PurchasesFacade`) and read reactive Signals (`computed`, `signal`).
   - Offline-First Architecture:
     - **IndexedDB** (`idb`) is the single authoritative source of truth for the client.
     - UI mutations commit synchronously to local DB first. Never await network responses to confirm local mutations.
   - Zero exposure of credentials: no API keys or secrets in frontend code.

---

## 4. Discovery Mode Lifecycle Invariants

1. **Default Registration**:
   - New accounts are initialized into **Discovery Mode (30 days)** automatically in the background. The user is not burdened with manual envelope configuration during onboarding.

2. **Completion & Permanent Guard**:
   - At the end of Discovery Mode (or when the user requests an audit), M. Pognon analyzes real campus spending velocity, identifies dominant categories, and calculates an ideal envelope blueprint.
   - When Discovery Mode is completed (`discoveryCompleted: true`), the mode permanently switches to `fixed`.
   - Once completed, Discovery Mode **disappears permanently** from settings, budget configuration modals, and profile options. It can never be reactivated.

---

## 5. Verification Gate Before Completion

Before completing any task, every agent MUST:
1. Run `npx ng build --configuration=development` and verify **0 compilation errors**.
2. If Android files, assets, or plugins were modified:
   - Run `npx cap sync android`
   - Run `cd android && ./gradlew assembleDebug` and verify `BUILD SUCCESSFUL`.
3. Provide the user with a concise, structured report in **French**, with **ZERO emojis**.
