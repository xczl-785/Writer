# Writer Project Coding Standards

This document outlines the coding standards for the Writer project, encompassing both the Frontend (React + TypeScript) and Backend (Rust + Tauri) components. Adherence to these standards ensures code consistency, maintainability, and quality across the team.

## 1. General Principles

- **Clarity over Cleverness**: Write code that is easy to understand and debug.
- **Consistency**: Follow the established patterns and style guides.
- **Documentation**:
  - **Code Comments**: Must be in **English**. Explain _why_, not _what_.
  - **Documentation Files**: Can be in **English** or **Chinese** (bilingual preferred for key docs).
- **File Naming**:
  - React Components: `PascalCase.tsx` (e.g., `EditorView.tsx`)
  - Other TS/JS files: `camelCase.ts` or `kebab-case.ts` (consistent within module)
  - Rust files: `snake_case.rs` (e.g., `markdown_parser.rs`)
  - Assets: `snake_case` or `kebab-case`

## 2. Frontend (React + TypeScript)

### 2.1. TypeScript Configuration

- **Strict Mode**: `strict: true` is mandatory in `tsconfig.json`.
- **No Implicit Any**: `noImplicitAny: true` must be enabled.
- **Null Checks**: `strictNullChecks: true` must be enabled.
- **Types**: Avoid `any` whenever possible. Use `unknown` if the type is truly uncertain, and narrow it down. define strict interfaces/types for all props and state.

### 2.2. Components

- **Functional Components**: Use functional components with Hooks. Class components are avoided unless absolutely necessary (e.g., Error Boundaries).
- **Hooks**:
  - Follow the [Rules of Hooks](https://reactjs.org/docs/hooks-rules.html).
  - Custom hooks should start with `use`.
- **State Management**:
  - Local state: `useState`, `useReducer`.
  - Global state: **Zustand** (as per Tech Stack). Keep stores small and focused.

### 2.3. Styling

- **Approach**: **CSS Modules** or **Tailwind CSS** (depending on specific module configuration).
- **Modularity**: Avoid global CSS. Scoped styles only.
- **Naming**: Use semantic class names if using CSS Modules.

### 2.4. Code Style & Linting

- **ESLint**: Mandatory. No production build should pass with linting errors.
- **Prettier**: Mandatory for code formatting.
- **Naming Conventions**:
  - Components: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Interfaces/Types: `PascalCase` (e.g., `EditorProps`)

## 3. Backend (Rust + Tauri)

### 3.1. Formatting & Linting

- **rustfmt**: Mandatory. All code must be formatted using standard `rustfmt`.
- **Clippy**: Mandatory. CI should fail on clippy warnings (`deny(warnings)` recommended for CI, `warn` for dev).
  - Address all clippy suggestions. If a suppression is needed, document _why_.

### 3.2. Idiomatic Rust

- **Error Handling**:
  - Use `Result<T, E>` for recoverable errors.
  - Use `Option<T>` for optional values.
  - Avoid `unwrap()` or `expect()` in production code. Use `?` operator or explicit handling (e.g., `unwrap_or`, `match`).
  - Create custom Error types (using `thiserror` is recommended) for library/module errors.
- **Ownership & Borrowing**: Minimize cloning (`.clone()`) unless necessary. Use references where possible.
- **Async**: Use `tokio` (via Tauri) properly. Avoid blocking the async runtime.

### 3.3. Tauri Commands

- **Command Naming**: `snake_case` function names.
- **Arguments**: Use `tauri::command` macros. Ensure arguments are strongly typed.
- **Return Values**: Always return `Result<T, String>` (or a custom serializable error type) to handle failures gracefully in the frontend.

## 4. Testing

- **Unit Tests**:
  - Rust: Place unit tests in a `tests` module within the same file or in `tests/` directory.
  - Frontend: Use Vitest/Jest for logic-heavy hooks and utilities.
- **Integration Tests**: Test critical flows (e.g., File Save/Load).

## 5. References

- [React Docs](https://react.dev/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Tauri Guides](https://tauri.app/v1/guides/)
