# SEP — Party Mode Recap & User Stories

Source: party-mode session (2026-10-12) + `docs/Cahier_des_charges_SEP_V1.docx`.
Input for `bmad-prd`. Persona: **Jonas**, sole user (student in Ghana, XOF/GHS).

## Decisions

- **Platform:** Android only, Capacitor (native). Solo use only.
- **Language:** all code and all UI content in **English**.
- **Local data:** IndexedDB is the source of truth. Cloudflare holds a copy.
- **Backend:** Cloudflare Worker (+ Cron Triggers). OpenAI and Resend keys live server-side only. Single secret bearer token, no accounts.
- **Storage:** captures (receipt photos and mobile-payment screenshots) in R2, never deleted. Budget summary in KV/D1.
- **Notifications:** email via Resend from the verified `kgslab.com` domain. No local push. Daily recap at 06:00 and 22:00 (Ghana = UTC) + immediate alerts only at thresholds. Max one alert per threshold crossing.
- **Design:** art direction from Odoo Enterprise — plum `#714B67` primary, teal `#017e84` action/secondary, light theme only. Amber `#ffac00` (dark text) for budget warnings, red only for real errors. Mockups made in Google Stitch.
- **Navigation:** 3 bottom tabs (Home, Capture, Budget) + side menu: Currencies, Categories, Export, AI Settings (once the OpenAI gateway works).
- **Severity:** escalates automatically with overruns, up to "uncompromising". Thresholds are deterministic code (e.g. 70% advice, 90% warning, overrun alert); the LLM only phrases the message.
- **Offline:** works without network. AI features and emails degrade gracefully; stale-data timestamp shown in emails.

## User Stories

### Core
- **US-1 Log an expense.** As Jonas, I want to log an expense in at most 3 taps from the first screen, so that tracking never feels like a chore.
- **US-2 Resist a purchase.** As Jonas, I want a "I want to buy" action that shows what the purchase costs in days of budget, asks "do you really need it?", and lets me think it over, so that I avoid impulse buys. Buying stays frictionless ("Yes, buy").
- **US-3 Purchase status.** As Jonas, I want each considered purchase to be *pending*, *bought* or *abandoned*, so that I can see my decisions.
- **US-4 Avoided total.** As Jonas, I want the cumulative amount of abandoned purchases on Home, under the remaining budget, so that I am rewarded for resisting.
- **US-5 Budget days.** As Jonas, I want "days of budget" computed from the planned daily budget early in the month and from real average spending once enough data exists, with a label showing the basis, so that the number is credible.

### Capture
- **US-6 Capture a document.** As Jonas, I want to photograph a receipt or import a mobile-payment screenshot, so that the AI extracts amount, currency, category, merchant and transaction reference.
- **US-7 Preview before saving.** As Jonas, I want to preview and edit the extracted data, with uncertain fields highlighted, and nothing saved until I validate. On extraction failure the expense stays a draft.
- **US-8 Duplicate detection.** As Jonas, I want a warning when a transaction reference already exists, so that I never log a payment twice.
- **US-9 Offline capture.** As Jonas, I want captures queued locally and uploaded when the network returns, so that I can capture anywhere.

### Assistant
- **US-10 Chatbot.** As Jonas, I want to chat with my finance assistant (ask about my spending, get advice, challenge a purchase), so that I have an on-demand account manager. It uses budget summaries as context, never raw history by default, and says clearly when offline.
- **US-11 Escalating alerts.** As Jonas, I want the assistant's tone and urgency to rise with overruns, so that it stays firm when I drift.
- **US-12 Email recaps and alerts.** As Jonas, I want a recap at 06:00 and 22:00 and immediate threshold alerts by email, so that I am reached without push notifications.
- **US-13 Pending purchase reminder.** As Jonas, I want an email 24h after I choose "I'll think about it", so that I revisit the decision.

### Settings
- **US-14 Currencies.** As Jonas, I want to enter the XOF/GHS rate manually (no external API) and see both amounts on the hesitation screen.
- **US-15 Categories and export.** As Jonas, I want to manage categories and export my data.

## Open Questions
- App name, Home screen layout, final tab contents.
- Creating the OpenAI key; model choice and cost cap.
- Exact thresholds and the 7-day switch for budget-days.
- Chatbot memory: session-only vs persisted.
