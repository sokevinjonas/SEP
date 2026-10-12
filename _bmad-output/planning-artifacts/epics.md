---
status: draft
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-SEP-2026-10-12/prd.md
  - _bmad-output/planning-artifacts/prds/prd-SEP-2026-10-12/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-SEP-2026-10-12/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-SEP-2026-10-12/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-SEP-2026-10-12/EXPERIENCE.md
---

# Student Savings (SEP) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Student Savings (SEP), decomposing the requirements from the PRD, UX Design contract (DESIGN.md & EXPERIENCE.md), and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Jonas can log an Expense in at most 3 taps from the first screen. Remaining budget on Home updates immediately, offline included.
FR2: Jonas sees Budget Days with a label showing its basis (planned daily budget early in the month; real average after 7 days of data).
FR3: Jonas enters the XOF/GHS rate manually (no external rate API); Hesitation screen displays both XOF and GHS amounts.
FR4: Jonas can manage Categories and export his data to CSV.
FR5: Jonas can start a Purchase ("I want to buy"); the app displays cost in Budget Days and asks "do you really need it?" with options "Yes, buy" (creates Expense without further friction) and "I'll think about it".
FR6: Each Purchase is pending, bought, or abandoned; Jonas can see his Purchases filtered by status.
FR7: Home shows the Avoided Total beneath the remaining budget. Abandoning a purchase increases Avoided Total by its amount.
FR8: Jonas receives an email 24h after choosing "I'll think about it" to revisit the decision.
FR9: Jonas can import a receipt or mobile-payment screenshot (or use the camera); AI extracts amount, currency, category, merchant, and transaction reference. Every capture is stored permanently in R2.
FR10: Jonas reviews and edits extracted data in Preview; uncertain fields are highlighted. Nothing is saved until validated. On extraction failure, Expense stays a draft.
FR11: Jonas is warned when a transaction reference already exists to prevent duplicate logging.
FR12: Captures taken offline appear in a pending queue and upload automatically when network returns.
FR13: Jonas can chat with the Assistant (M. Pognon) about spending advice and purchase challenges. Context is budget summaries, never raw history. Memory is session-only. AI usage is capped at ~$5/month with automatic cut-off and graceful offline degradation.
FR14: Assistant tone and urgency escalate deterministically with overruns up to "uncompromising" (70% advice, 90% warning, 100% overrun alert); LLM only phrases messages. At most one alert per threshold crossing.
FR15: Jonas receives email Recaps at 06:00 and 22:00 (Ghana UTC) plus immediate threshold alerts via Resend from kgslab.com. No local push. Emails degrade gracefully and show stale-data timestamp when offline.

### NonFunctional Requirements

NFR1 (Platform): Android native application built using Ionic Framework with Angular (standalone components) and Capacitor.
NFR2 (Offline-First): IndexedDB via the `idb` wrapper is the single authoritative source of truth. All local operations succeed offline without waiting for network.
NFR3 (Security & Credentials): Zero external API keys (OpenAI, Resend, R2) bundled in the client APK. Client uses a single secret static bearer token to communicate with the Cloudflare Worker.
NFR4 (AI Budget Cap): Automated monthly token budget cap (~$5/month) enforced at the Cloudflare Worker edge. When cap is hit, non-critical AI calls degrade gracefully with HTTP 429 without impairing core app functions.
NFR5 (Data Immutability): All captured receipts and mobile-money screenshots uploaded to Cloudflare R2 are immutable and never deleted.
NFR6 (Single User): Solo builder application (Jonas); all UI content and code in English. No user registration or multi-tenant database tables.

### Additional Requirements (Architecture)

ARCH-1 (Starter Template): Initialize greenfield Ionic/Angular standalone project with Capacitor Android (`@ionic/angular` ^8.0, `@angular/core` ^18.0, `@capacitor/android` ^6.0).
ARCH-2 (Local Repository Layer): Data layer using `idb` repository abstraction for `expenses`, `categories`, `purchases`, `captures`, and `sync_queue`.
ARCH-3 (Sync Engine): Asynchronous event-driven sync engine flushing `sync_queue` FIFO to Cloudflare Worker `POST /api/sync` on network availability.
ARCH-4 (Serverless Edge Backend): Cloudflare Worker with Hono/modular router holding D1 SQLite database mirror and Cron Triggers (06:00 & 22:00 UTC).
ARCH-5 (Multipart Capture Route): `POST /api/captures` handles image streaming to R2, invokes `gpt-4o-mini` vision extraction, and returns structured draft preview.
ARCH-6 (Aggregated LLM Context): Chat endpoint `POST /api/chat` calculates server-side budget summary and injects only high-level aggregates into prompt context.
ARCH-7 (Email Gateway): Resend SDK integration sending digests and threshold alerts from verified domain `kgslab.com`.

### UX Design Requirements

UX-DR1 (Design Tokens): Implement strict design tokens: Plum `#714B67`, Teal `#017e84`, Warning Amber `#ffac00` with dark text `#3a2a00`, Error Red `#c0392b`, Base Background `#F7F3F6`, Hairline `#EADFE7`. Light theme only.
UX-DR2 (Typography): Embed and configure Nunito font scale (Display 46px, Title 22px, Body 16px, Meta 12px) ensuring text stays legible and buttons do not truncate at large Android font accessibility scales.
UX-DR3 (Thumb-Zone Ergonomics): Bottom-anchored persistent action bar on Home (`I want to buy` and `+ Add`, 52dp touch targets) situated above 3-tab navigation bar (Home, Capture, Budget).
UX-DR4 (Hesitation Screen): Implement confrontational impulse-friction screen showing cost in Budget Days, concrete reframing ("That's three weeks of food"), M. Pognon speech bubble, and dual choice buttons (`I'll think about it` in Plum vs `Yes, buy`).
UX-DR5 (M. Pognon Character & Mascot): Integrate official Option 2 logo (golden coin character with monocle, moustache, and plum bowler hat) for app icon, chat avatar, and coach cards.
UX-DR6 (Visual Feedback & Micro-interactions): Gentle breathing balance indicator on Home, discreet celebratory confetti micro-animation when a purchase is abandoned, and amber pill badges for budget warnings.
UX-DR7 (Capture & OCR Preview UI): Large dashed import tile for screenshots/photos with secondary camera trigger, pending queue status cards, and preview form highlighting uncertain fields in amber.
UX-DR8 (Budget & Purchase Status View): Envelopes screen with daily spend allowance, category progress bars, considered purchases list segmented by status (pending, bought, abandoned), and M. Pognon chat launcher.

### FR Coverage Map

FR1: Epic 1 - Fast manual expense logging (≤ 3 taps) and immediate remaining budget update.
FR2: Epic 1 - Budget Days computation with dynamic label (planned vs real average after 7 days).
FR3: Epic 2 - Manual XOF/GHS exchange rate configuration and dual currency display on Hesitation screen.
FR4: Epic 1 - Category management, envelope tracking, and full CSV export.
FR5: Epic 2 - "I want to buy" action, Hesitation screen with days cost, concrete reframing, and immediate vs deferred choice.
FR6: Epic 2 - Purchase status tracking (pending, bought, abandoned) with dedicated list view.
FR7: Epic 2 - Avoided Total accumulation on Home with celebratory micro-animation on purchase abandonment.
FR8: Epic 4 - Automated 24h email reminder for pending purchases via Cloudflare Cron and Resend.
FR9: Epic 3 - Receipt and mobile-money capture (photo & import), immutable R2 storage, and AI extraction.
FR10: Epic 3 - OCR preview and editing screen with uncertain field highlighting and draft fallback.
FR11: Epic 3 - Transaction reference duplicate detection and warning banner.
FR12: Epic 3 - Offline capture queue with automated background sync upon network reconnection.
FR13: Epic 4 - Session-only chatbot with M. Pognon persona, server-side budget context, and ~$5/mo spend cap.
FR14: Epic 4 - Deterministic threshold escalation alerts (70%, 90%, 100%) with M. Pognon progressive tone.
FR15: Epic 4 - Scheduled morning/evening email recaps (06:00 and 22:00 UTC) with stale-data indicator.

## Epic List

### Epic 1: Core Ledger, Offline Budgeting & Fast Logging
**User Outcome:** Jonas can open the app on Android, view his real-time remaining budget and Budget Days, log an expense in 3 taps offline or online, manage his expense categories, and export all data to CSV.
**FRs covered:** FR1, FR2, FR4
**Key Deliverables:**
- Ionic/Angular + Capacitor scaffold with Nunito font, Calm Ledger design tokens (Plum/Teal/Amber), and persistent thumb-zone action bar.
- IndexedDB repository layer (`idb`) for expenses and categories.
- Home dashboard with breathing balance, Budget Days calculation (planned vs 7-day average), and category envelopes.
- 3-tap rapid expense modal and CSV export feature.

### Epic 2: Impulse Purchase Friction & Avoided Savings Reward
**User Outcome:** Jonas can challenge impulse spending through the "I want to buy" flow, confront its cost in days of budget and dual currencies (GHS/XOF) on the Hesitation screen, choose to delay purchase, and see his Avoided Total grow on Home as a tangible reward.
**FRs covered:** FR3, FR5, FR6, FR7
**Key Deliverables:**
- Manual XOF/GHS exchange rate settings.
- Confrontational Hesitation screen with M. Pognon bubble and concrete cost reframing ("That's 3 weeks of food").
- Purchase state machine: *pending*, *bought*, *abandoned*.
- Avoided Total reward card on Home with celebratory micro-animation upon abandonment.
- Considered purchases list grouped by status under Budget tab.

### Epic 3: Document Capture, OCR Extraction & Offline Sync
**User Outcome:** Jonas can photograph receipts or import mobile-money screenshots anywhere (even offline), review AI-extracted details with uncertain fields highlighted, catch duplicate transaction references, and have all media permanently backed up to Cloudflare R2.
**FRs covered:** FR9, FR10, FR11, FR12
**Key Deliverables:**
- Capture screen with prominent image/screenshot import and camera trigger.
- Offline capture queue with automatic retry engine.
- Cloudflare Worker endpoint `POST /api/captures` with streaming to R2 and `gpt-4o-mini` vision parsing.
- Preview screen with editable fields, amber highlight for doubtful values, and duplicate transaction reference detector.
- Background sync engine (`POST /api/sync`) keeping Cloudflare D1 mirrored.

### Epic 4: M. Pognon AI Coach & Scheduled Email Notifications
**User Outcome:** Jonas has an uncompromising financial coach (M. Pognon) available for chat in the app to challenge his expenses, and receives bi-daily email digests (06:00 & 22:00 UTC), threshold alert emails (70%, 90%, 100%), and 24h pending purchase reminders without draining his monthly AI budget.
**FRs covered:** FR8, FR13, FR14, FR15
**Key Deliverables:**
- M. Pognon in-app chat interface with session-only memory and offline degradation banner.
- Cloudflare Worker `POST /api/chat` with aggregated budget summary prompt and monthly cost cut-off ($5/mo).
- Deterministic severity engine triggering escalating email alerts via Resend (`kgslab.com`).
- Scheduled Cron Triggers for 06:00 & 22:00 Ghana digests and 24h pending purchase follow-ups.
