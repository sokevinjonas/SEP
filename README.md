# Student Savings (SEP) 🎓💰

> **An anti-impulse personal finance coach and 100% offline-first ledger tailored for university students.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Angular](https://img.shields.io/badge/Angular-18-DD0031.svg?logo=angular)](https://angular.dev)
[![Ionic Framework](https://img.shields.io/badge/Ionic-8-3880FF.svg?logo=ionic)](https://ionicframework.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF.svg?logo=capacitor)](https://capacitorjs.com)
[![Offline First](https://img.shields.io/badge/Offline-First-017e84.svg)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## 🌟 Overview

University life comes with erratic allowances, mobile money transactions, and constant peer temptation. **Student Savings (SEP)** was built from the ground up to protect student allowances through:

1. **Anti-Impulse Friction:** Confronting impulse buys with tangible cost in *Budget Days* ("That's 2 weeks of cafeteria food!").
2. **Breathing Balance:** Real-time remaining daily burn rate and envelope status that works seamlessly offline.
3. **Dual Currency Engine:** Live and manual exchange rate conversions between Ghana Cedis (**GHS**) and West African CFA Francs (**XOF**).
4. **Instant MoMo & Receipt Capture:** OCR vision extraction + fast clipboard parsing for Mobile Money (MTN MoMo, Telecel Cash) SMS confirmations.
5. **M. Pognon Proactive Coach:** An intelligent mascot and financial coach who warns you deterministically before you blow your budget.
6. **Cycle Rollovers & Savings Vault:** Celebrate month-end surpluses and roll them over or lock them safely into a personal Student Savings Vault.

---

## 🎯 Key Features

### 🛡️ 1. Anti-Impulse Engine & Considered Purchases
* **"I want to buy" Friction Modal:** Before making an unplanned purchase, pause and see its real cost in days of budget.
* **Dual Choice:** Choose *"Yes, buy"* to log it, or *"I'll think about it"* to pause it in your considered wishlist for 48 hours.
* **Trophy of Avoided Expenses:** When you decide to abandon an impulse item, celebrate your willpower! The avoided money accumulates directly into your **Anti-Impulse Trophy**.

### 🫁 2. Breathing Balance & Flexible Budgeting
* **Fixed Ceiling Mode:** Define your monthly allowance (e.g. 600 GHS) and divide into envelopes (Food, Transport, Books, Outings).
* **AI Discovery Mode:** Not sure how much you spend? Track freely for your first cycle while M. Pognon analyzes your velocity to recommend an optimal target ceiling.
* **Top-up Allowance (+):** Easily log stipends, family support, or job earnings that increase your breathing room.
* **Month-End Rollover:** When your cycle resets (e.g. Day 1, 15, or 25), review your leftover balance and either roll it over or deposit it in your **Student Savings Vault**.

### 📸 3. Receipts & Mobile Money (MoMo) Extraction
* **Vision OCR:** Take a photo or upload receipts to automatically extract amount, merchant, and transaction IDs.
* **Paste MoMo SMS:** Tap *"Paste MoMo SMS"* to instantly parse MTN MoMo or Telecel Cash SMS alerts directly from your clipboard without uploading an image.
* **Offline Pending Queue:** Captures taken without network connectivity are safely stored in IndexedDB and sync automatically when online.
* **Duplicate Detection:** Prevents accidental double-logging by warning if a transaction reference already exists.

### ✏️ 4. Full Ledger & Expense Management
* **Instant 3-Tap Quick Log:** Fast bottom-anchored numeric keypad for logging trotro fares and cafeteria meals in seconds.
* **Complete Editing:** Update amount, currency, category, merchant, date, or note anytime.
* **Search & Time Filters:** Filter by Today, Yesterday, This Month, or by Category envelope.

---

## 🏗️ Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │                    Student Savings                      │
   │               (Ionic 8 + Angular 18)                    │
   └───────────────────────────┬─────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   ┌───────────────────┐                 ┌───────────────────┐
   │ IndexedDB (idb)   │                 │ Node / Express    │
   │ Local Client Truth│ ◄- Sync Queue -►│ Backend Service   │
   └───────────────────┘                 └─────────┬─────────┘
                                                   │
                                      ┌────────────┴────────────┐
                                      ▼                         ▼
                              ┌───────────────┐         ┌───────────────┐
                              │ GPT-4o-mini   │         │ Resend Email  │
                              │ Vision & Chat │         │ Notifications │
                              └───────────────┘         └───────────────┘
```

* **Frontend:** Ionic Framework 8, Angular 18 (Standalone Components, Signals, RxJS), SCSS (Odoo Plum & Teal design system).
* **Mobile Runtime:** Capacitor 6 (Android native ready).
* **Client Database:** IndexedDB via `idb` abstraction with reactive Facades.
* **Backend:** Node.js, Express, TypeScript, Multer, Resend SDK, OpenAI API.
* **Deployment Ready:** Web (Vite/Angular static bundle), Netlify Serverless Functions, or Android APK.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js:** v18.0.0 or higher
* **npm:** v9.0.0 or higher

### 1. Clone the repository
```bash
git clone https://github.com/your-username/student-savings.git
cd student-savings
```

### 2. Setup Frontend Application
```bash
# Install frontend dependencies
npm install

# Start local Ionic/Angular development server
npm start
# or
npx ng serve
```
The app will be available at `http://localhost:4200/`.

### 3. Setup Backend Service
```bash
cd backend

# Install backend dependencies
npm install

# Copy environment template
cp .env.example .env

# Start backend server
npm run dev
```
The backend API will run at `http://localhost:3000/`.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend listening port | `3000` |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |
| `JWT_SECRET` | Secret key for JWT sessions | `student_savings_jwt_secret_key_2026` |
| `APP_SECRET_TOKEN` | Bearer token for client sync & captures | `sep_secret_bearer_token_2026` |
| `OPENAI_API_KEY` | *(Optional)* OpenAI key for Vision OCR & M. Pognon chat | `""` |
| `RESEND_API_KEY` | *(Optional)* Resend key for OTP and email digests | `""` |
| `RESEND_FROM_EMAIL` | Sender address for emails | `coach@mail-omnelyo.kgslab.com` |

---

## 📱 Building for Android (Capacitor)

```bash
# Build production web assets
npm run build

# Sync assets to Capacitor Android project
npx cap sync android

# Open project in Android Studio
npx cap open android
```

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!
Please check out our [CONTRIBUTING.md](CONTRIBUTING.md) guide before submitting pull requests.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
Feel free to use, modify, and distribute it for personal or educational purposes.
