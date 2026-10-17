# Project Rules & Invariants for AI Agents (SEP)

See the master authority file: [AGENTS.md](file:///home/jonas-dev/Bureau/SEP/AGENTS.md).

## Summary of Critical Rules:
1. **ZERO EMOJIS**: Under no circumstances write emojis in code, templates, or agent responses.
2. **Languages**: English for application UI; French for reports and conversation with the user.
3. **Design System**: Odoo Calm Ledger theme (Plum `#714B67`, Teal `#017e84`, Amber `#ffac00`, Red `#c0392b` for errors only). Light theme only.
4. **Spacing**: 14px vertical space below each item and card. Comfortable padding (`14px 16px`). Section header required before item lists.
5. **SCSS Limit**: Keep SCSS files under 150-200 lines. Extract modals into dedicated modular SCSS files.
6. **Architecture**: Angular Standalone, Signals + Facades, Offline-First IndexedDB (`idb`).
7. **Discovery Mode**: Permanent guard (`discoveryCompleted: true`). Disappears permanently from settings after use.
