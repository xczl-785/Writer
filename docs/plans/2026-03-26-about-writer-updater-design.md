# About Writer Updater Design

**Date:** 2026-03-26
**Status:** Approved

## Goal

Add a polished "Check for Updates" flow inside the existing **About Writer** panel. The flow should check for a newer release, present release metadata in-app, and allow the user to download and install the update with platform-aware behavior.

## Context

Writer already exposes `Help > About Writer` and renders an in-app About panel. The project is a Tauri 2 + React desktop application with a GitHub Releases workflow, but it does not yet include Tauri's updater plugin, updater permissions, or updater release artifacts.

The requested product behavior is:

- Entry remains inside **About Writer**
- Primary action is **Check for Updates**
- On update found, show in-app update details and allow one-click install
- GitHub Releases remains the source of truth for release payloads
- Asset selection should respect the current operating system

## Options Considered

### Option 1: Tauri official updater plugin

Use `@tauri-apps/plugin-updater` in the frontend and `tauri-plugin-updater` in Rust. Publish updater artifacts (`latest.json` plus signatures) to GitHub Releases and point the app to a stable `latest/download/latest.json` endpoint.

Pros:

- Uses the official Tauri 2 update path
- Handles platform matching, signature verification, download, and install flow
- Minimizes custom native logic and cross-platform drift

Cons:

- Requires release workflow changes
- Requires signing configuration for updater artifacts

### Option 2: Custom GitHub Releases API integration

Call the GitHub Releases API, select an asset manually by platform, download it, and launch platform-specific installers ourselves.

Pros:

- Can work directly from current GitHub release assets

Cons:

- Reimplements matching, validation, installation, and restart behavior
- Higher security and maintenance risk
- Much more cross-platform edge-case handling

### Option 3: Release-page redirect

Check for a release and then open the GitHub Releases page for manual download.

Pros:

- Lowest implementation cost

Cons:

- Does not satisfy the requested one-click install flow

## Decision

Choose **Option 1**.

This keeps the product interaction clean while delegating the hard platform-specific and security-sensitive parts to the official updater implementation.

## UX Design

The About panel will gain a new update card below build information and positioning content.

States:

- Idle: show current version and a primary `Check for Updates` button
- Checking: disable actions, show inline progress copy
- Up to date: show a calm confirmation state
- Update available: show target version, published date, release notes summary, and a primary `Update Now` button
- Downloading/installing: show a progress bar and percentage, with status copy that changes from checking to downloading to installing
- Failure: show a readable error message and a secondary `Open Release Page` fallback

Interaction style:

- Keep the existing About panel visual language
- Avoid introducing a second modal for the default path
- Prefer inline progress and outcome messaging inside the About panel

## Architecture

Frontend:

- Add an updater service module that wraps Tauri updater calls behind a small interface
- Add a release metadata fetch helper for GitHub release details used for UI copy
- Extend `AboutWriterPanel` with local state for update lifecycle and progress

Tauri:

- Register the updater plugin in Rust
- Add updater permissions to the default capability
- Configure the updater endpoint in `src-tauri/tauri.conf.json`

Release pipeline:

- Update GitHub Actions release workflow so release builds publish updater artifacts suitable for Tauri's updater

## Error Handling

- If the updater plugin is unavailable, show a friendly error and offer the release page
- If checking fails due to network or invalid response, keep the panel usable and expose retry
- If release notes metadata fetch fails but updater check succeeds, continue with install capability and fall back to minimal version copy

## Testing Strategy

- Unit-test the updater service by mocking Tauri updater APIs
- Component-test About panel state transitions for checking, update available, install trigger, and failure fallback
- Add static/config coverage for Rust plugin registration, permissions, updater config, and release workflow changes

## Development Readiness Report

**Overall Status:** READY

| Stage                              | Status | Risk   | Findings                                                                                  |
| ---------------------------------- | ------ | ------ | ----------------------------------------------------------------------------------------- |
| 1. Requirement-Scenario Validation | PASS   | LOW    | Requested behavior is clear enough to implement                                           |
| 2. Integration Point Analysis      | PASS   | MEDIUM | About panel, Tauri config, permissions, and release workflow all change together          |
| 3. Architecture Health             | PASS   | LOW    | Existing About panel is isolated and easy to extend                                       |
| 4. Data Change Impact              | PASS   | LOW    | No schema or persisted data changes required                                              |
| 5. API Compatibility               | PASS   | LOW    | No public API break expected                                                              |
| 6. Test Coverage                   | ISSUES | MEDIUM | Existing About tests are mostly source-string assertions; behavior coverage must be added |
| 7. Dependency Impact               | PASS   | MEDIUM | New official updater dependency required in JS and Rust                                   |
| 8. Non-Functional Requirements     | PASS   | MEDIUM | Network and signing failures need clear fallback messaging                                |
| 9. Regression Impact               | PASS   | MEDIUM | About dialog layout and Help menu behavior must remain intact                             |
| 10. Rollback Strategy              | PASS   | LOW    | Feature can be reverted by removing updater integration without data migration            |

## Risks To Watch

- Release workflow must generate updater artifacts correctly or the in-app flow will fail at runtime
- Windows install mode should favor a user-friendly passive flow
- About panel expansion must not degrade existing layout on narrow viewports
