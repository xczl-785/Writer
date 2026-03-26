# about-updater

## Quick Read

- **id**: `about-updater`
- **name**: About Updater
- **summary**: Adds in-app update checking and install initiation to the About Writer panel using Tauri's official updater and GitHub Releases updater artifacts.
- **scope**: Includes the About panel update card, updater status rendering, Tauri updater plugin/config wiring, and GitHub release artifact expectations; excludes full release-note browsing and external documentation pages.
- **entry_points**:
  - `AboutWriterPanel`
  - `aboutUpdater`
- **check_on_change**:
  - Help > About Writer still opens normally from the native/custom menu.
  - The About panel still renders current version, platform, and icon correctly.
  - `Check for Updates` handles no-update, update-available, downloading, installing, and failure states.
  - Failure state still offers a release-page fallback.
  - Tauri updater endpoint still points at `releases/latest/download/latest.json`.
  - Release workflow still uses updater signing secrets and publishes updater artifacts.
- **last_verified**: 2026-03-26

---

## Capability Summary

This capability places a first-class update card inside the existing About Writer panel. The card checks for updates through Tauri's official updater plugin and presents a compact in-app flow: check, inspect the target version, start download/install, and fall back to the GitHub Releases page when updater checks fail.

The runtime updater path depends on two repository-level contracts. First, desktop builds must register the updater plugin and expose updater permissions plus endpoint configuration. Second, the GitHub release workflow must publish updater artifacts, including `latest.json`, signed with the private key that matches the public key committed to `src-tauri/tauri.conf.json`.

---

## Current Rules

### CR-001: About Writer remains the update entry

The default user-facing entry for manual update checks must remain inside the About Writer panel rather than a separate settings or splash-screen surface.

**Evidence**: `src/ui/components/About/AboutWriterPanel.tsx`

---

### CR-002: Update checks use the official Tauri updater path

Frontend update checks and install initiation must go through `@tauri-apps/plugin-updater` rather than direct GitHub asset download logic.

**Evidence**: `src/ui/components/About/aboutUpdater.ts`

---

### CR-003: GitHub Releases is the updater source of truth

Updater configuration must resolve through the stable GitHub endpoint `releases/latest/download/latest.json`, and release builds must continue generating updater artifacts for that endpoint.

**Evidence**: `src-tauri/tauri.conf.json`, `.github/workflows/release.yml`

---

### CR-004: Release-page fallback must stay available

If update checks or installation fail, the About panel must continue to offer a direct GitHub Releases fallback so the user can still update manually.

**Evidence**: `src/ui/components/About/AboutWriterPanel.tsx`, `src/ui/components/About/aboutUpdater.ts`

---

## Impact Surface

| Area                     | What to check                                                                    | Evidence                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| About UI                 | Update card layout, button states, progress, and fallback action remain usable   | `src/ui/components/About/AboutWriterPanel.tsx`, `src/app/App.css`                             |
| Localization             | New update strings stay present in zh-CN and en-US                               | `src/shared/i18n/messages.ts`                                                                 |
| Frontend updater service | Tauri updater calls and progress translation still match UI expectations         | `src/ui/components/About/aboutUpdater.ts`                                                     |
| Tauri runtime            | Updater plugin registration and permission wiring remain intact                  | `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`                                 |
| Release pipeline         | Signed updater artifacts are still published for GitHub latest-download endpoint | `.github/workflows/release.yml`, `build/README.md`                                            |
| Tests                    | About updater behavior and static integration checks remain green                | `src/ui/components/About/AboutWriterPanel.update.test.ts`, `src/app/AppAboutBehavior.test.ts` |
