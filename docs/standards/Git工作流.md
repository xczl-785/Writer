# Writer Project Git Workflow

This document outlines the Git workflow and commit message standards for the Writer project. Following these guidelines is crucial for maintaining a clean and collaborative history, especially in a trunk-based development environment.

## 1. Branching Strategy

We follow a **Trunk-Based Development** model. The `main` branch is the single source of truth and must always be deployable.

### 1.1. Branch Types

- **Main Branch**: `main` (protected, linear history).
- **Feature Branches**: Use for developing new features.
  - Format: `feat/<username>/<short-description>` or `feat/<issue-id>/<short-description>`
  - Example: `feat/alice/markdown-parser` or `feat/S1-01/file-explorer`
- **Fix Branches**: Use for bug fixes.
  - Format: `fix/<issue-id>/<short-description>`
  - Example: `fix/123/editor-crash-on-save`
- **Chore/Refactor Branches**: Use for maintenance tasks.
  - Format: `chore/<description>` or `refactor/<description>`

### 1.2. Workflow Steps

1.  **Start**: Create a new branch from latest `main`.
    ```bash
    git checkout main
    git pull origin main
    git checkout -b feat/your-feature
    ```
2.  **Develop**: Commit your changes locally.
3.  **Sync**: Frequently rebase onto `main` to resolve conflicts early.
    ```bash
    git fetch origin main
    git rebase origin/main
    ```
4.  **Review**: Push your branch and open a Pull Request (PR).
5.  **Merge**: Once approved, **Squash and Merge** into `main`.

## 2. Commit Message Convention

We strictly follow the **Conventional Commits** specification (Angular style).

### 2.1. Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### 2.2. Types

- **feat**: A new feature (correlates with MINOR in semantic versioning).
- **fix**: A bug fix (correlates with PATCH in semantic versioning).
- **docs**: Documentation only changes.
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
- **refactor**: A code change that neither fixes a bug nor adds a feature.
- **perf**: A code change that improves performance.
- **test**: Adding missing tests or correcting existing tests.
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation.
- **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm).
- **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs).

### 2.3. Rules

1.  **Subject**:
    - Use the imperative mood ("add" not "added", "change" not "changed").
    - Do not end with a period.
    - Limit to 50 characters ideally, max 72.
2.  **Body** (optional): Use if the change needs more explanation. Wrap at 72 characters.
3.  **Scope** (optional): Generally refers to the package or module affected (e.g., `editor`, `tauri`, `ui`).

### 2.4. Examples

- `feat(editor): add support for markdown tables`
- `fix(core): resolve file saving race condition`
- `docs(readme): update installation instructions`
- `chore(deps): upgrade react to v18.2.0`
- `style: format code with prettier`

## 3. Pull Request (PR) Guidelines

- **Title**: Must follow the Conventional Commits format (same as commit message).
- **Description**: Briefly explain _what_ changed and _why_. Link related issues (e.g., `Closes #123`).
- **Size**: Keep PRs small and focused. Large PRs are harder to review and merge.
- **CI Checks**: All automated checks (linting, tests, build) must pass before merging.

## 4. Merging Strategy

- **Squash and Merge**: We use "Squash and Merge" on GitHub/GitLab to maintain a linear history on the `main` branch. This combines all commits from a feature branch into a single clean commit on `main`.
- **Delete Branch**: Delete the feature branch after merging.
