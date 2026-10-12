# Google Stitch Prompt — Student Savings (SEP)

Paste this prompt directly into [Google Stitch](https://stitch.withgoogle.com) to generate the full interactive high-fidelity prototype and mockups.

---

### Project & Brand Overview
Create a complete, high-fidelity, interactive mobile application prototype for **Student Savings (SEP)**, a personal financial discipline & budget resistance assistant designed for a student living in Ghana (operating with dual currencies: Ghanaian Cedi **GHS** and West African CFA Franc **XOF**).

- **Platform Target:** Native Android Mobile (Capacitor). Single-handed thumb-zone layout optimization.
- **Theme & Atmosphere:** Light theme only. Calm, reassuring, uncluttered ("Calm Ledger" aesthetic) with playful moments (breathing balance indicator, discreet celebratory micro-animations when impulse purchases are abandoned).
- **Core AI Persona & App Icon:** **M. Pognon** — Official logo is a playful, stylish golden coin character winking with a distinguished monocle on a chain, handlebar moustache, and a jaunty plum-colored bowler hat (#714B67). His personality is a mix of a strict financial coach and a teasing older brother (direct, humorous, sharp, questioning purchases without ever being toxic).
- **UI Language:** English exclusively.

---

### Visual Design Tokens & Palette (Strict)
- **Primary / Brand Identity:** Plum `#714B67` (used for identity, main numbers, headers, secondary button borders, key highlights)
- **Action / Reward:** Teal `#017e84` (used for interactive action buttons, progress bars, Avoided Total savings milestones)
- **Warning / Budget Alerts:** Warm Amber `#ffac00` with Dark Ink text `#3a2a00` (used for 70%, 90%, and budget overrun indicators. **Never use red for budget overruns** to prevent user anxiety/shame)
- **Error (Real Failures only):** Red `#c0392b` (strictly reserved for network drops, camera/OCR parsing failures)
- **Background & Surfaces:**
  - Base Background: Soft tinted off-white `#F7F3F6`
  - Cards & Raised Surfaces: Pure White `#FFFFFF` with subtle plum shadow (`box-shadow: 0 2px 10px rgba(113, 75, 103, 0.08)`)
  - Ink Primary (Text): `#2B1F28`
  - Ink Secondary (Subtitles, Meta): `#6B5966`
  - Hairline Borders: `#EADFE7`
- **Typography:**
  - Family: **Nunito** (soft, rounded, friendly, modern sans-serif)
  - Display / Giant figures: 46px–56px Bold
  - Screen Titles: 22px Bold
  - Body: 16px Regular/Semi-bold
  - Captions/Meta: 12px Semi-bold
- **Shapes & Border Radii:**
  - Standard Cards: 20px
  - Buttons: 20px pill/rounded rectangle (height 52px for thumb touch target)
  - Warning/Status Badges: 9999px (full pill)
  - Chat & Coach Bubbles: 24px with one distinctive square anchor corner

---

### Navigation Architecture
- **Bottom Navigation Bar (Always visible on root screens):**
  1. **Home** (Dashboard & Quick Action trigger)
  2. **Capture** (Receipt & Mobile-Money screenshot scanner/importer)
  3. **Budget** (Envelopes, category limits, history, purchase status & M. Pognon shortcut)
- **Top Bar (Home):**
  - Left: Hamburger menu icon `☰` opening the **Side Drawer**
  - Center: Current Month indicator (e.g., "May 2026")
  - Right: Quick Currency indicator (GHS / XOF rate switch)
- **Side Drawer (Settings & Utilities):**
  - Currencies & Manual Exchange Rate (XOF/GHS)
  - Categories Manager
  - Data Export (CSV)
  - AI Gateway & Budget Settings
  - About Jonas / Student Savings

---

### Complete Screen-by-Screen Specifications

#### Screen 1: Home (Dashboard & Action Hub)
- **Top Zone:** Month label, hamburger drawer icon.
- **Hero Card (Remaining Budget):**
  - "Remaining this month" caption.
  - Giant balance in Plum: **GHS 412**
  - Secondary currency conversion & metric: `≈ XOF 17,300 · 14 Budget Days (planned)`
  - Progress bar in Teal showing percentage consumed.
- **Reward Card (Avoided Total):**
  - "Avoided so far" label.
  - Bold amount in Teal: **GHS 180 💪** (represents money saved by resisting impulse buys).
- **Proactive Budget Alert Pill:**
  - Amber badge: `Food 78%` with message: *"Advice threshold passed at 70%. Watch the next street coffee."*
- **Persistent Bottom Action Bar (Thumb Zone):**
  - Left button: **"I want to buy"** (White with Plum border — triggers Screen 3).
  - Right button: **"+ Add"** (Solid Teal filled — triggers Screen 2).
  - Located directly above the 3-tab navigation bar.

#### Screen 2: Add Expense (3-Tap Fast Logging)
- Bottom-sheet or modal view designed for high-speed logging between classes.
- Large numeric keypad and instant amount input (default currency: GHS, toggleable to XOF).
- Grid of quick-select category chips: Food 🍲, Transport 🚌, Books & School 📚, Social ☕, Utilities 💡.
- Single primary button: **"Save Expense"** (Teal, full width). Total flow must be executable in ≤ 3 taps from Home.

#### Screen 3: Hesitation / Impulse Friction ("I Want to Buy")
- Triggered when Jonas is about to make an unplanned discretionary purchase.
- **Header:** Entered item name and price: `Sneakers · GHS 320 (≈ XOF 13,400)`.
- **Cost in Time / Life:**
  - Massive Plum figure: **23 days**
  - Subtitle: *"of your monthly budget · based on your planned daily allowance"*.
- **Confrontational Reality Check:**
  - Bold statement: *"That's three weeks of food. Do you really need them?"*
- **M. Pognon Intervention:**
  - Mascot avatar card (monocle, moustache) with Plum speech bubble:
    *"I'm not going to stop you. But you're walking on thin ice with Food this month."*
- **Dual Decision Buttons (Thumb Zone):**
  - **"I'll think about it"** (Dominant Plum button — marks purchase as *pending*, triggers 24h cooling-off reminder).
  - **"Yes, buy"** (Secondary neutral button — converts instantly to an expense with no additional guilt-tripping).

#### Screen 4: Capture & OCR Inbox
- Primary action: Giant dashed card for **"Import Receipt or Screenshot"** (Photos, MoMo SMS/app screenshots from MTN/Vodafone).
- Secondary option: **"📷 Take Photo with Camera"**.
- **Offline Sync Queue Card:**
  - Shows pending uploads captured without network: e.g., *"Market receipt · Queued for network (Cloudflare R2)"*.

#### Screen 5: Preview & Validation (Post-Extraction)
- Displays AI-extracted fields before anything is committed to the ledger:
  - Amount: `GHS 24.50`
  - Merchant: Highlighted with an Amber badge (`Merchant · unsure: Mama Ama Stores?`) allowing easy editing.
  - Category: Dropdown pre-filled (`Food`).
  - Transaction Reference: `TX-88213`.
- **Duplicate Detection Warning:** If transaction reference exists, show amber alert banner: *"This transaction reference was already recorded. Avoid double logging."*
- Action buttons: "Edit details" (Secondary) and "Validate & Save" (Primary Teal).

#### Screen 6: Budget & Categories Breakdown
- Daily allowance monitor: **"Left per day: GHS 29.4"**.
- Category Envelope list with progress bars:
  - Food: 78% (Amber progress bar, warning indicator)
  - Transport: 40% (Teal progress bar, healthy)
  - School Supplies: 25% (Teal)
- **Considered Purchases List:**
  - Segmented list showing: *Pending* (e.g. Sneakers), *Bought*, and *Abandoned* (e.g. Headphones GHS 120 — counts towards Avoided Total).
- Card banner: **"Chat with M. Pognon"** with mascot portrait.

#### Screen 7: Chat with M. Pognon (Financial Coach)
- Clean messaging interface with conversation history.
- Top bar: M. Pognon avatar (monocle, moustache) with online status indicator.
- Message bubbles:
  - User: *"Can I buy a new phone case? It's GHS 40."*
  - M. Pognon (Plum bubble): *"Food is at 78% and month ends in 12 days. GHS 40 is 1.4 Budget Days. Your phone works fine without glitter."*
- Bottom bar: Input field + Plum send button. Offline banner appears if disconnected: *"No connection. M. Pognon is resting until you reconnect."*

#### Screen 8: Side Drawer & Settings
- **Currency Settings:** Manual entry for exchange rate (e.g., `1 GHS = 42 XOF`). No live API.
- **Category Manager:** Add, edit, adjust limits.
- **Data Export:** Export all records to `.csv` button.
- **AI & Sync Status:** Single bearer token sync, last Cloudflare sync timestamp.

---

### Deliverable Expectation for Stitch
Generate clean, interconnected Android screens with consistent spacing, high visual polish, complete Nunito typography, and exact hex color fidelity. Every screen must respect the bottom thumb zone for one-handed operation.
