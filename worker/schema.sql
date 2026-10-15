-- Cloudflare D1 SQLite Database Schema for Student Expense Tracker (SEP)

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  categoryId TEXT NOT NULL,
  categoryName TEXT NOT NULL,
  merchant TEXT NOT NULL,
  note TEXT,
  date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  transactionRef TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(categoryId);
CREATE INDEX IF NOT EXISTS idx_expenses_ref ON expenses(transactionRef);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  allocatedGhs REAL NOT NULL DEFAULT 0,
  spentGhs REAL NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  itemName TEXT NOT NULL,
  amountGhs REAL NOT NULL,
  categoryId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'bought', 'abandoned'
  createdAt TEXT NOT NULL,
  coolingOffExpiresAt TEXT NOT NULL,
  reminderSent INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  r2Key TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileSizeKb INTEGER NOT NULL,
  mimeType TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threshold_alerts (
  id TEXT PRIMARY KEY,
  monthKey TEXT NOT NULL,
  categoryId TEXT NOT NULL,
  threshold INTEGER NOT NULL, -- 70, 90, 100
  alertSentAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_threshold_unique ON threshold_alerts(monthKey, categoryId, threshold);

CREATE TABLE IF NOT EXISTS token_usage (
  monthKey TEXT PRIMARY KEY,
  tokensUsed INTEGER NOT NULL DEFAULT 0,
  estimatedCostUsd REAL NOT NULL DEFAULT 0.0,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  campus TEXT,
  primaryCurrency TEXT NOT NULL DEFAULT 'GHS',
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id TEXT PRIMARY KEY,
  monthYear TEXT NOT NULL,
  totalBudgetGhs REAL NOT NULL,
  plannedDailyBudgetGhs REAL NOT NULL,
  exchangeRateXof REAL NOT NULL DEFAULT 42.0
);
