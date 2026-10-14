---
status: final
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
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

## Epic 1: Core Ledger, Offline Budgeting & Fast Logging

Jonas can open the app on Android, view his real-time remaining budget and Budget Days, log an expense in 3 taps offline or online, manage his expense categories, and export all data to CSV.

### Story 1.1: Project Scaffold & Calm Ledger Design System

As Jonas,  
I want a cleanly scaffolded native Android application with the Calm Ledger visual design system,  
So that I have an ergonomic, one-handed mobile foundation that feels pleasant and responsive.

**Acceptance Criteria:**

**Given** a fresh Android device or emulator with the SEP Capacitor application installed  
**When** Jonas opens the application cold  
**Then** the application launches into the Home view using the light theme with `#F7F3F6` background  
**And** the Nunito typography scale and custom colors (Plum `#714B67`, Teal `#017e84`, Amber `#ffac00`) are active  
**And** the persistent bottom action bar is displayed in the thumb zone (`I want to buy` and `+ Add` buttons, height 52dp)  
**And** the 3-tab navigation bar (Home, Capture, Budget) is present and functional  
**And** the official app icon featuring M. Pognon (golden coin character) is visible in the Android app drawer.

### Story 1.2: Local-First Database & Repository Engine (idb)

As Jonas,  
I want all my core financial data persisted directly in a robust local IndexedDB store,  
So that the application works seamlessly offline with zero latency or split-brain state.

**Acceptance Criteria:**

**Given** the application initializes for the first time  
**When** the database service starts  
**Then** an IndexedDB database named `sep_local_db` is created via the `idb` library with object stores: `expenses`, `categories`, `monthly_budgets`, and `sync_queue`  
**And** default categories (Food, Transport, Books & School, Social, Utilities) are seeded if empty  
**And** all read and write repository methods execute asynchronously against local storage without any mandatory network call.

### Story 1.3: Home Dashboard & Budget Days Calculation

As Jonas,  
I want to see my remaining monthly budget in GHS and XOF alongside my calculated Budget Days,  
So that I instantly know my financial runway without doing mental math.

**Acceptance Criteria:**

**Given** Jonas has a monthly budget and recorded expenses  
**When** he views the Home dashboard  
**Then** the remaining monthly budget is prominently displayed in Plum (`display` font size) in GHS with equivalent XOF value  
**And** the balance displays a subtle breathing animation in normal state  
**And** Budget Days is computed: before 7 recorded spend days, it calculates `Remaining Budget / Planned Daily Budget` and displays label `"(planned)"`  
**And** after 7 days of spend data exists in the current month, it calculates `Remaining Budget / Real Daily Average` and displays label `"(average)"`  
**And** a horizontal progress bar in Teal indicates the percentage of the monthly budget consumed.

### Story 1.4: Rapid 3-Tap Expense Logging

As Jonas,  
I want to log a manual expense in at most 3 taps from the Home screen,  
So that tracking expenses between lectures never feels like a tedious chore.

**Given** Jonas is on the Home screen  
**When** he taps the `+ Add` button (Tap 1)  
**Then** a lightweight bottom sheet opens with immediate numeric input focus and quick-select category chips  
**When** he inputs the amount and taps a category chip (Tap 2)  
**And** taps the primary "Save Expense" button (Tap 3)  
**Then** the expense is committed to `expenses` in IndexedDB in under 100ms  
**And** the bottom sheet dismisses  
**And** the Home remaining budget and category envelope update immediately without page reload  
**And** an item is appended to `sync_queue` with status `'pending'`.

### Story 1.5: Category Management & CSV Data Export

As Jonas,  
I want to manage my expense categories and export all my transactions to a CSV file,  
So that I have full control over my budget structure and own my raw financial records.

**Acceptance Criteria:**

**Given** Jonas opens the Categories & Export section from the side drawer  
**When** he adds a new category or edits an existing budget ceiling  
**Then** the changes are saved to IndexedDB and immediately reflected in budget calculations  
**When** he taps the "Export Data (CSV)" button  
**Then** all recorded expenses are compiled into a standard RFC 4180 CSV string (Date, Amount, Currency, Category, Merchant, Reference)  
**And** the native Android file download/share prompt is triggered allowing him to save or share the `.csv` file.


## Epic 2: Impulse Purchase Friction & Avoided Savings Reward

Jonas can challenge impulse spending through the "I want to buy" flow, confront its cost in days of budget and dual currencies (GHS/XOF) on the Hesitation screen, choose to delay purchase, and see his Avoided Total grow on Home as a tangible reward.

### Story 2.1: Manual Currency Exchange Settings (XOF / GHS)

As Jonas,  
I want to manually configure the exchange rate between XOF and GHS,  
So that dual-currency calculations remain accurate without relying on an external live rate API.

**Acceptance Criteria:**

**Given** Jonas opens the Currencies screen from the side navigation drawer  
**When** he enters a new exchange rate (e.g. `1 GHS = 42 XOF`) and taps Save  
**Then** the rate is validated (must be a positive number) and saved to IndexedDB  
**And** all dual-currency conversions throughout the application update immediately without making any external network requests.

### Story 2.2: "I Want to Buy" Action & Confrontational Hesitation Screen

As Jonas,  
I want to trigger the "I want to buy" flow and be confronted with the true cost of an item on the Hesitation screen,  
So that I feel psychological friction before spending money on impulse desires.

**Acceptance Criteria:**

**Given** Jonas is on the Home screen  
**When** he taps the `I want to buy` button in the bottom action bar  
**Then** an input screen prompts for item name, amount, and category  
**When** he inputs the item details and proceeds  
**Then** the full-screen Hesitation screen opens displaying:
  - Item name and price in both GHS and XOF
  - The cost computed in Budget Days in giant Plum font (e.g. "23 days of your budget")
  - Basis label ("based on your planned daily budget" or "real average")
  - Concrete reframing text (e.g. "That's three weeks of food. Do you really need them?")
  - M. Pognon avatar card with speech bubble: "I'm not stopping you. But think."
  - Two thumb-accessible decision buttons: `I'll think about it` (filled Plum) and `Yes, buy` (secondary outline).

### Story 2.3: Purchase Decision Handling ("Yes, buy" vs "I'll think about it")

As Jonas,  
I want my decision on the Hesitation screen to execute cleanly,  
So that resisting delays the purchase safely while buying adds zero additional guilt or friction.

**Acceptance Criteria:**

**Given** Jonas is on the Hesitation screen  
**When** he chooses `Yes, buy`  
**Then** a new record is created in `expenses` with the purchase details  
**And** a record is created in `purchases` with status `'bought'`  
**And** the Home screen opens immediately with remaining budget decreased, without any guilt dialogs  
**When** he instead chooses `I'll think about it`  
**Then** a record is saved to `purchases` with status `'pending'` and timestamp `decidedAt`  
**And** a sync event is enqueued to schedule the 24h cooling-off reminder  
**And** Jonas is returned to Home with his budget untouched.

### Story 2.4: Avoided Total Accumulation & Celebration Micro-Animation

As Jonas,  
I want to see my cumulative Avoided Total increase when I abandon a considered purchase,  
So that I feel positively rewarded with a dopamine boost for demonstrating financial discipline.

**Acceptance Criteria:**

**Given** Jonas has pending purchases  
**When** he marks a pending purchase as `abandoned` (or confirms abandonment via reminder)  
**Then** the purchase status transitions to `'abandoned'` in IndexedDB  
**And** the purchase amount is added to the Avoided Total  
**And** the Home Avoided Total card (displayed in Teal with flexing emoji `💪`) increments  
**And** a discreet celebratory confetti micro-animation plays on the Home card (respecting Android Reduce Motion settings).

### Story 2.5: Considered Purchases Status Management

As Jonas,  
I want to view and manage all my considered purchases filtered by status,  
So that I have full visibility into my pending impulse items and past resistance decisions.

**Acceptance Criteria:**

**Given** Jonas navigates to the Budget tab  
**When** he views the Considered Purchases section  
**Then** purchases are organized into filterable segments: `Pending`, `Bought`, and `Abandoned`  
**And** each pending purchase card displays its item name, price, date, and actions to either convert to `Bought` (prompts expense confirmation) or `Abandoned` (increments Avoided Total).


## Epic 3: Document Capture, OCR Extraction & Offline Sync

Jonas can photograph receipts or import mobile-money screenshots anywhere (even offline), review AI-extracted details with uncertain fields highlighted, catch duplicate transaction references, and have all media permanently backed up to Cloudflare R2.

### Story 3.1: Capture Tab UI & Offline Pending Queue

As Jonas,  
I want a dedicated Capture tab that lets me import screenshots or snap photos even without network connectivity,  
So that I can capture transactions at the moment they occur without worrying about data loss.

**Acceptance Criteria:**

**Given** Jonas opens the Capture tab  
**When** the screen renders  
**Then** a large dashed import card is prominently displayed for importing photos and mobile-payment screenshots (Tap to choose from Android gallery)  
**And** a secondary button allows taking a fresh photo via the native camera  
**And** an offline pending queue section lists any captures currently awaiting network with filename and `Queued` badge  
**When** Jonas is offline and captures a document  
**Then** the image is cached locally in IndexedDB/filesystem, a draft record is created in `captures`, and an upload task is added to `sync_queue`.

### Story 3.2: Cloudflare Worker Capture Endpoint & R2 Storage

As the system,  
I want an authenticated backend endpoint that streams captured images directly into Cloudflare R2,  
So that all media documents are securely and immutably archived in cloud object storage without leaking cloud credentials to the client.

**Acceptance Criteria:**

**Given** the mobile client sends an HTTP POST request to `/api/captures` with `multipart/form-data`  
**When** the request includes a valid `Authorization: Bearer <APP_SECRET_TOKEN>` header  
**Then** the Cloudflare Worker streams the image payload directly into Cloudflare R2 under an immutable key `captures/<UUID>.<ext>`  
**And** an immutable capture record is inserted into Cloudflare D1 with the R2 key and timestamp  
**And** if the Bearer token is missing or invalid, HTTP 401 Unauthorized is returned immediately.

### Story 3.3: AI Vision Extraction Pipeline (gpt-4o-mini)

As Jonas,  
I want the Cloudflare Worker to extract transaction metadata from my captures using OpenAI vision,  
So that I don't have to manually type in amounts, merchants, or reference codes.

**Acceptance Criteria:**

**Given** an image is uploaded to `/api/captures`  
**When** the Worker processes the capture stream  
**Then** the Worker calls OpenAI `gpt-4o-mini` vision API with structured JSON output instructions  
**And** the model extracts: `amount`, `currency`, `category`, `merchant`, `transactionReference`, and a boolean flag `isConfident` per field  
**And** the Worker returns the structured JSON payload to the client  
**And** token usage is tracked against the monthly ~$5 spend limit.

### Story 3.4: Preview & Validation Screen with Uncertainty Highlighting

As Jonas,  
I want to preview extracted details before committing an expense, with any doubtful fields highlighted in Amber,  
So that my ledger remains 100% accurate and under my explicit verification.

**Acceptance Criteria:**

**Given** vision extraction completes successfully  
**When** the Preview screen (Screen 5) opens  
**Then** the extracted fields (Amount, Category, Merchant, Transaction Reference) are displayed in editable form fields  
**And** any field flagged as uncertain (`isConfident: false`) is styled with an Amber border and badge (`e.g. Merchant · unsure: Mama Ama Stores?`)  
**And** nothing is written to `expenses` until Jonas explicitly taps the primary "Validate" button  
**When** extraction fails completely  
**Then** a technical error message in Red `#c0392b` is shown, the item is retained as a Draft, and manual entry fallback is offered.

### Story 3.5: Duplicate Transaction Detection & Warning

As Jonas,  
I want to be warned if a receipt's transaction reference was already logged,  
So that I never accidentally record the same mobile-money or store payment twice.

**Acceptance Criteria:**

**Given** Jonas is reviewing an extracted transaction reference on the Preview screen  
**When** the reference matches an existing record in the local `expenses` database or D1 mirror  
**Then** an Amber warning card appears with text: `"This reference already exists. You decide."`  
**And** Jonas can choose to override and save or cancel the draft.

### Story 3.6: Event-Driven Background Sync Engine

As Jonas,  
I want all my local mutations and pending captures to synchronize to the Cloudflare backend automatically when network is available,  
So that my cloud mirror in D1 and R2 stays up to date without manual intervention.

**Acceptance Criteria:**

**Given** offline captures or expenses are pending in `sync_queue`  
**When** the Capacitor Network listener detects an active internet connection  
**Then** the sync engine flushes pending items FIFO to `/api/sync`  
**And** upon HTTP 200 acknowledgment from the Worker, local queue items are marked `synced`  
**And** if sync fails due to network drop, the engine retries with exponential backoff without blocking any UI interactions.


## Epic 4: M. Pognon AI Coach & Scheduled Email Notifications

Jonas has an uncompromising financial coach (M. Pognon) available for chat in the app to challenge his expenses, and receives bi-daily email digests (06:00 & 22:00 UTC), threshold alert emails (70%, 90%, 100%), and 24h pending purchase reminders without draining his monthly AI budget.

### Story 4.1: M. Pognon Chat UI with Session-Only Memory

As Jonas,  
I want to chat directly with M. Pognon from the Budget tab,  
So that I can challenge my impulse desires or ask for financial coaching on demand.

**Acceptance Criteria:**

**Given** Jonas taps "Talk to M. Pognon" under the Budget tab  
**When** the Chat screen opens (Screen 7)  
**Then** M. Pognon's official coin avatar is displayed in the header with online status  
**And** messages sent by Jonas appear right-aligned in white bubbles  
**And** replies from M. Pognon appear left-aligned in Plum bubbles `#714B67` with white text  
**And** conversation memory is strictly session-only in v1 (cleared on app close)  
**When** the device is offline  
**Then** an offline card informs Jonas: `"No connection. M. Pognon is resting until you reconnect."` and input is disabled.

### Story 4.2: Backend Chat Endpoint & Aggregated Summary Prompting

As the system,  
I want the Cloudflare Worker to serve the `/api/chat` endpoint using a pre-aggregated budget summary prompt,  
So that M. Pognon has sharp financial context while keeping token usage minimal and private.

**Acceptance Criteria:**

**Given** Jonas sends a message in chat  
**When** the client posts to `/api/chat` with Bearer token authentication  
**Then** the Worker queries D1 to assemble a concise summary: remaining monthly balance, days left, top category utilization percentages, current severity level, and last 3 considered purchases  
**And** injects this summary into a system prompt defining M. Pognon's personality (strict financial coach + teasing older brother)  
**And** calls OpenAI `gpt-4o-mini` with a low temperature for consistent, punchy advice  
**And** raw, line-by-line transaction logs are never passed to the LLM.

### Story 4.3: Monthly AI Budget Cap & Guardrail (~$5/mo)

As Jonas,  
I want the Worker to enforce an automated monthly cost limit of ~$5 on OpenAI API calls,  
So that I am guaranteed to never receive an unexpected billing surprise.

**Acceptance Criteria:**

**Given** AI calls (vision extraction and chat) consume tokens throughout the month  
**When** the cumulative monthly token cost in D1/KV reaches the $5 USD threshold  
**Then** subsequent non-critical chat calls are rejected with HTTP 429 and a message: `"M. Pognon has hit his monthly energy limit and is taking a rest."`  
**And** critical offline logging and ledger features remain 100% operational.

### Story 4.4: Deterministic Budget Threshold Escalation Alerts

As Jonas,  
I want to receive immediate email alerts when I cross predefined budget thresholds (70%, 90%, 100%), with escalating severity in tone,  
So that I am firmly notified the moment my spending drifts without suffering alert fatigue.

**Acceptance Criteria:**

**Given** a synchronized expense causes a category to cross a threshold (70% advice, 90% warning, 100% overrun)  
**When** the Worker evaluates threshold crossing logic  
**Then** at most one alert is triggered per threshold level per category per month  
**And** the alert message tone is generated based on deterministic severity (firm at 90%, uncompromising at 100%)  
**And** the alert is dispatched immediately via Resend from `kgslab.com`.

### Story 4.5: Scheduled Morning & Evening Email Recaps (06:00 & 22:00 UTC)

As Jonas,  
I want to receive scheduled email summaries at 06:00 and 22:00 Ghana time,  
So that I stay informed of my daily runway and evening tally without needing local mobile push notifications.

**Acceptance Criteria:**

**Given** Cloudflare Worker Cron Triggers fire at 06:00 UTC and 22:00 UTC  
**When** the scheduled job executes  
**Then** it compiles the current daily allowance, remaining budget, and pending purchases  
**And** checks the timestamp of the latest client sync; if data is older than 24 hours, appends a stale-data indicator  
**And** dispatches the formatted digest email via Resend to Jonas's email address.

### Story 4.6: 24h Cooling-Off Email Follow-up for Pending Purchases

As Jonas,  
I want to receive an email reminder 24 hours after I choose "I'll think about it",  
So that I revisit the purchase with a calm mind and formally decide whether to buy or abandon it.

**Acceptance Criteria:**

**Given** a purchase was marked as `pending` on the Hesitation screen  
**When** 24 hours have elapsed since the decision  
**Then** the Worker cron identifies the pending purchase  
**And** sends a reminder email with M. Pognon asking: `"24 hours have passed since you looked at [Item Name]. Still tempted or ready to add [Amount] to your Avoided Total?"`  
**And** marks the reminder as sent to avoid duplicate emails.

