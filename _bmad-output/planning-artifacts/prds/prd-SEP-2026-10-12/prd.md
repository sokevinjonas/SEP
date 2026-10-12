---
title: Student Savings
status: final
created: 2026-10-12
updated: 2026-10-12
---

# PRD: Student Savings
*Project codename: SEP.*

## 0. Document Purpose
Single-user hobby project PRD for the builder (Jonas). Written from `sep-party-mode-recap.md`. Vocabulary is anchored in the Glossary; FRs are nested under features and numbered globally; inferred points carry `[ASSUMPTION]` tags and are indexed in §9. Technical choices (stack, storage, design tokens) live in `addendum.md`.

## 1. Vision
Student Savings is a personal Android finance assistant for a student living on a tight budget in Ghana. It makes expense tracking nearly effortless (3 taps, or a photo of a receipt) and, more importantly, adds friction at the moment of temptation: before a purchase, it shows what that purchase costs in days of budget and asks "do you really need it?".

An AI assistant acts as an on-demand account manager. It reaches Jonas by email (no push), and its tone escalates with overruns, up to "uncompromising". Thresholds are deterministic; the AI only phrases messages.

It matters because the goal is behavioral: fewer impulse buys, and visible reward (the avoided total) for resisting them.

## 2. Target User

### 2.1 Jobs To Be Done
- **Functional:** record every expense with minimal effort, in XOF or GHS.
- **Emotional:** feel in control of money; get rewarded for resisting a purchase.
- **Contextual:** works offline; reaches me by email even when the app is closed.
- This is for me as the builder; I am the only user.

### 2.2 Non-Users (v1)
Anyone other than Jonas: no accounts, no sharing, no iOS or web users.

### 2.3 Key User Journeys
- **UJ-1. Jonas logs a coffee in three taps.** Jonas, between classes, opens the app on Home, taps add, enters amount and category, saves. Home shows the new remaining budget.
- **UJ-2. Jonas almost buys sneakers.** Jonas taps "I want to buy", enters the price. The Hesitation screen shows the price in days of budget and both XOF and GHS amounts, and asks "do you really need it?". He picks "I'll think about it" (Purchase becomes *pending*) and receives a reminder email 24h later. He abandons it; the Avoided Total on Home grows. **Edge case:** he picks "Yes, buy" and the Purchase becomes an expense without further friction.
- **UJ-3. Jonas captures a receipt in a market without network.** Jonas photographs a receipt offline; it is queued. When network returns, the Capture is uploaded, extraction runs, and a Preview opens with uncertain fields highlighted. He corrects one and validates. **Edge case:** the transaction reference already exists, so a duplicate warning is shown.
- **UJ-4. Jonas drifts over budget.** Jonas passes 90% of a Category budget. An email alert arrives, firmer than the 70% advice. After an overrun, tone rises again. He opens the chatbot to challenge his next purchase.

## 3. Glossary
- **Expense** — a recorded spend (amount, currency, Category, date); may be a draft.
- **Capture** — a receipt photo or mobile-payment screenshot, stored permanently.
- **Preview** — screen showing extracted data for review before an Expense is saved.
- **Purchase** — an intended buy evaluated via "I want to buy"; status *pending*, *bought* or *abandoned*.
- **Avoided Total** — cumulative amount of *abandoned* Purchases.
- **Budget Days** — Purchase price divided by a daily spend figure (planned daily budget early in the month, real average once enough data exists).
- **Threshold** — deterministic budget percentage that triggers advice, warning or overrun alert.
- **Severity** — tone level of assistant messages, escalating with overruns.
- **Recap** — scheduled email (06:00, 22:00 Ghana time).
- **Assistant** — the AI persona (chatbot and email voice).

## 4. Features

### 4.1 Expense Logging & Budget
**Description:** Fast manual logging and a Home overview. Realizes UJ-1.

#### FR-1: Log an expense
Jonas can log an Expense in at most 3 taps from the first screen. Realizes UJ-1.

**Consequences (testable):**
- From Home, saving an Expense takes at most 3 taps.
- Remaining budget on Home updates immediately, offline included.

#### FR-2: Budget Days
Jonas sees Budget Days with a label showing its basis (planned daily budget or real average). Realizes UJ-2.

**Consequences (testable):**
- Early in the month the planned daily budget is used; after 7 days of data, the real average.
- The label always names which basis is in use.

#### FR-3: Currencies
Jonas enters the XOF/GHS rate manually; no external rate API is called.

**Consequences (testable):**
- The Hesitation screen displays both XOF and GHS amounts.

#### FR-4: Categories and export
Jonas can manage Categories and export his data.

**Consequences (testable):**
- [ASSUMPTION: export is a CSV file of all Expenses.]

### 4.2 Purchase Resistance
**Description:** The "I want to buy" flow that adds friction before spending. Realizes UJ-2.

#### FR-5: "I want to buy" action
Jonas can start a Purchase; the app shows its cost in Budget Days and asks "do you really need it?". Realizes UJ-2.

**Consequences (testable):**
- Options: "Yes, buy" (immediate, no further friction) and "I'll think about it".

#### FR-6: Purchase status
Each Purchase is *pending*, *bought* or *abandoned*, and Jonas can see his Purchases by status.

**Consequences (testable):**
- "Yes, buy" creates an Expense and sets *bought*.

#### FR-7: Avoided Total
Home shows the Avoided Total beneath the remaining budget.

**Consequences (testable):**
- Abandoning a Purchase increases the Avoided Total by its amount.

#### FR-8: Pending reminder
Jonas receives an email 24h after choosing "I'll think about it". Realizes UJ-2.

### 4.3 Document Capture
**Description:** AI extraction from receipts and screenshots. Realizes UJ-3.

#### FR-9: Capture a document
Jonas can photograph a receipt or import a mobile-payment screenshot; the AI extracts amount, currency, Category, merchant and transaction reference. Realizes UJ-3.

**Consequences (testable):**
- Every Capture is stored permanently and never deleted.

#### FR-10: Preview before saving
Jonas reviews and edits extracted data in the Preview; uncertain fields are highlighted. Realizes UJ-3.

**Consequences (testable):**
- Nothing is saved until he validates.
- On extraction failure the Expense stays a draft.

#### FR-11: Duplicate detection
Jonas is warned when a transaction reference already exists. Realizes UJ-3.

#### FR-12: Offline capture
Captures are queued locally and uploaded when network returns. Realizes UJ-3.

**Consequences (testable):**
- A Capture taken offline appears in a pending queue and uploads automatically on reconnect.

### 4.4 Assistant & Notifications
**Description:** Chatbot plus email channel with escalating Severity. Realizes UJ-4.

#### FR-13: Chatbot
Jonas can chat with the Assistant (spending questions, advice, challenging a Purchase). Realizes UJ-4.

**Consequences (testable):**
- Context is budget summaries, never raw history by default.
- Conversation memory is session-only in v1.
- AI usage is capped at about 5 USD/month using a cost-effective model; the Worker cuts AI calls automatically at the cap, and the app degrades gracefully.
- When offline the chatbot says so clearly.

#### FR-14: Escalating alerts
Assistant tone and urgency rise with overruns, up to "uncompromising"; Thresholds are deterministic code and the LLM only phrases the message. Realizes UJ-4.

**Consequences (testable):**
- At most one alert per Threshold crossing.
- Thresholds: 70% advice, 90% warning, 100% overrun alert.

#### FR-15: Email Recaps and alerts
Jonas receives a Recap at 06:00 and 22:00 (Ghana time) plus immediate Threshold alerts. There is no local push.

**Consequences (testable):**
- Emails show a stale-data timestamp when the latest sync is old.
- Emails and AI features degrade gracefully when offline or on failure.

**Feature-specific NFRs:**
- API keys never ship in the app; the app uses a single bearer token (no accounts).

## 5. Non-Goals (Explicit)
- No multi-user, accounts, sharing, iOS or web version.
- No live exchange-rate API, no local push notifications, no dark theme.
- No automatic deletion of Captures.

## 6. MVP Scope

### 6.1 In Scope
FR-1 to FR-15, Android only, English UI, offline-first.

### 6.2 Out of Scope for MVP
- AI Settings screen until the OpenAI gateway works.
- Persisted chatbot memory (deferred to post-v1).

## 7. Success Metrics
**Primary**
- **SM-1**: I log expenses in the app for 3 months and do not abandon it. Validates FR-1, FR-9.

**Secondary**
- **SM-2**: Avoided Total is non-zero each month. Validates FR-5, FR-7.

**Counter-metrics (do not optimize)**
- **SM-C1**: Number of alerts sent. More alerts must not become the goal; it counterbalances SM-1 and risks alert fatigue (FR-14).

## 8. Open Questions
1. Home screen layout and final tab contents.
2. Creating the OpenAI key and picking the exact model.

## 9. Assumptions Index
- §4.1 FR-4 — export is CSV.
