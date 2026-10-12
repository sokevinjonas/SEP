# SEP — Addendum (technical and design depth)

Source: `sep-party-mode-recap.md`. For architecture and UX workflows.

## Platform and stack
- Android only, Capacitor (native), solo use. All code and UI in English.
- IndexedDB is the source of truth; Cloudflare holds a copy.
- Cloudflare Worker with Cron Triggers. OpenAI and Resend keys server-side only. Single secret bearer token, no accounts.
- Captures in R2 (never deleted). Budget summary in KV/D1.
- Email via Resend from the verified `kgslab.com` domain.
- LLM only phrases messages; thresholds are deterministic code.

## Design
- Art direction from Odoo Enterprise: plum `#714B67` primary, teal `#017e84` action/secondary, light theme only.
- Amber `#ffac00` (dark text) for budget warnings; red only for real errors.
- Mockups in Google Stitch.

## Navigation
- 3 bottom tabs (Home, Capture, Budget) + side menu: Currencies, Categories, Export, AI Settings (once the OpenAI gateway works).

## Notification schedule
- Recaps at 06:00 and 22:00 (Ghana = UTC) via Cron Triggers.
- Max one alert per threshold crossing.
