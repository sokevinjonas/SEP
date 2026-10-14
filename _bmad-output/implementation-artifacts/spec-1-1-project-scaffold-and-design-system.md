---
title: 'Story 1.1: Project Scaffold & Calm Ledger Design System'
type: 'feature'
created: '2026-10-14'
status: 'in-progress'
baseline_commit: 'fbd888cb96da860da4a2a453f2b866a000328aff'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/interactive-prototype/index.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** SEP needs a cleanly scaffolded, local-first Ionic 8 / Angular 18 native mobile foundation on Android with the Calm Ledger / Odoo Enterprise design tokens, ergonomic thumb-zone action bar, and 3-tab navigation, eliminating all emojis in favor of crisp vector icons.

**Approach:** Initialize the Ionic Angular standalone project with Capacitor Android, configure design tokens (Plum `#714B67`, Action Teal `#017e84`, Amber `#ffac00`, Background `#F7F3F6`, Nunito typography) in `variables.scss`, bundle M. Pognon Option 2 mascot assets, and build the persistent bottom action bar and 3-tab shell.

## Boundaries & Constraints

**Always:**
- Use Angular standalone components (no `NgModule`).
- Enforce Odoo Enterprise color tokens: Primary Plum `#714B67`, Action Teal `#017e84`, Warning Amber `#ffac00` with dark text `#3a2a00`, Error Red `#c0392b`, Base Background `#F7F3F6`.
- Enforce ZERO emojis in all UI code and templates; use `ionicons` vector icons exclusively.
- Implement the persistent thumb-zone action bar with `I want to buy` and `+ Add` at 52dp minimum touch target height.
- Retain official Option 2 golden coin mascot in `src/assets/`.

**Never:**
- Never include emojis anywhere in UI markup.
- Never hardcode arbitrary hex colors outside the defined CSS variables.
- Never use legacy NgModule-based components.
- Never bundle external API keys into the client build.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Cold launch | App started on Android | App displays Home view with light theme (`#F7F3F6`), persistent action bar, and active 3-tab bar | Fallback to default Ionic dark/light detection overridden to light |
| Tab switching | Tap Capture or Budget tab | Navigation switches views smoothly while keeping persistent thumb bar pinned | Retain active tab state in Angular router |
| Responsive scaling | Large font scale set in Android accessibility | Text and buttons scale with Nunito without clipping or breaking touch targets | Flexible flexbox layouts with min-height 52dp |

</frozen-after-approval>

## Code Map

- `package.json` -- Project dependencies (@ionic/angular, @capacitor/android, ionicons)
- `capacitor.config.ts` -- Capacitor native Android configuration (appId: `com.kgslab.sep`, appName: `SEP`)
- `src/theme/variables.scss` -- Odoo Enterprise color tokens, Nunito font declarations, light theme defaults
- `src/global.scss` -- Global styling rules, zero-emoji typography rules, thumb-zone layout utilities
- `src/app/app.component.ts` -- Standalone root component rendering ion-app and the main layout shell
- `src/app/app.routes.ts` -- Angular standalone routes (`home`, `capture`, `budget`)
- `src/app/shared/components/action-bar/action-bar.component.ts` -- Persistent thumb-zone bar (`I want to buy` + `+ Add`)
- `src/app/shared/components/bottom-nav/bottom-nav.component.ts` -- 3-tab navigation bar (Home, Capture, Budget)
- `src/assets/images/` -- Official M. Pognon Option 2 mascot asset

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` -- Initialize project and install dependencies (`@ionic/angular`, `@angular/core` ^18, `@capacitor/core`, `@capacitor/android`, `ionicons`, `idb`)
- [ ] `capacitor.config.ts` -- Create Capacitor Android configuration with app name "Student Savings (SEP)"
- [ ] `src/theme/variables.scss` -- Define Odoo Enterprise color palette, custom properties, and Nunito font
- [ ] `src/assets/` -- Copy official M. Pognon coin mascot image into assets
- [ ] `src/app/shared/components/action-bar/` -- Build standalone persistent action bar component with 52dp touch targets
- [ ] `src/app/shared/components/bottom-nav/` -- Build standalone 3-tab navigation bar with Ionicons
- [ ] `src/app/features/home/` -- Scaffold standalone Home component with placeholder breathing balance
- [ ] `src/app/app.component.ts` -- Wire root layout with router-outlet and persistent bottom shell

**Acceptance Criteria:**
- Given a fresh Android device or browser preview with the SEP application, when Jonas launches the application, then the app displays the light theme with `#F7F3F6` background, Nunito font, and Odoo palette (`#714B67`, `#017e84`).
- Given the application view, when inspecting interactive elements, then the persistent action bar (`I want to buy` and `+ Add`) is visible in the lower thumb zone with 52dp height, and zero emojis are present in the markup.
- Given the navigation bar, when tapping Home, Capture, or Budget, then the corresponding route activates cleanly.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

The persistent action bar is positioned directly above the 3-tab navigation bar using CSS fixed/absolute positioning in the bottom system zone. Touch targets follow Material/Android 48-52dp minimum guidelines with Nunito font font-weight 800 for instant legibility in high-glare outdoor campus conditions.
