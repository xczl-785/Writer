# GitHub Release Workflow

## Overview

Writer uses a tag-driven GitHub Actions workflow:

1. Update the app version in `package.json` and `src-tauri/tauri.conf.json`
2. Create and push a tag in the form `vX.Y.Z`
3. GitHub Actions validates the version, builds installers, and publishes a GitHub Release
4. Tauri updater assets are uploaded with the release for in-app updates

The workflow file is [.github/workflows/release.yml](/e:/Project/Writer/.github/workflows/release.yml).

## Required Secrets

Configure these repository secrets in GitHub:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Without them, desktop installers may still build, but updater metadata/signatures will not be usable for in-app updates.

## Local Release Commands

Update versions:

```bash
pnpm version:update
```

Create a local tag from the current version:

```bash
pnpm release:tag
```

Create and push the tag in one step:

```bash
pnpm release:push
```

## Workflow Behavior

When a tag like `v0.3.12` is pushed:

- the workflow checks that `package.json` and `src-tauri/tauri.conf.json` match the tag version
- `pnpm lint`, `pnpm test`, and `pnpm build` run before packaging
- installers are built for:
  - Windows x64
  - Linux x64
  - macOS arm64
  - macOS x64
- a GitHub Release is published automatically
- updater assets, including `latest.json`, are attached to the release

You can also run the workflow manually in GitHub Actions, but it requires an existing `release_tag` input such as `v0.3.12`.

## Updater Endpoint

The desktop app checks:

`https://github.com/xczl-785/Writer/releases/latest/download/latest.json`

That endpoint must stay aligned with the repository used by the release workflow.
