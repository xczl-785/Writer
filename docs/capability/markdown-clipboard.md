# markdown-clipboard

## Quick Read

- **id**: `markdown-clipboard`
- **name**: Markdown Clipboard
- **summary**: Parse pasted plain text as Markdown by default, provide Writer-owned pure-paste bypass, and serialize copied selections back to Markdown text.
- **scope**: Editor clipboard parser/serializer wiring, Writer-owned paste intent lifecycle, application-driven paste fallback rules, menu/context/shortcut pure-paste entry points, and regression boundaries with image paste.
- **entry_points**:
  - `EditorImpl -> editorProps.clipboardTextParser`
  - `EditorImpl -> editorProps.clipboardTextSerializer`
  - `createMarkdownClipboardTextParser`
  - `createMarkdownClipboardTextSerializer`
  - `PasteIntentController`
  - `menu.edit.paste_plain`
  - `context menu -> paste-plain`
  - `Cmd/Ctrl+Shift+V`
- **shared_with**: none
- **check_on_change**:
  - normal plain-text paste still parses Markdown
  - pure paste still inserts raw text
  - pure-paste intent is consumed once and does not leak to the next paste
  - application-driven normal paste still prefers native paste before falling back to explicit text insertion
  - image paste is still handled by the image path
  - menu, context menu, and shortcut stay aligned
- **last_verified**: 2026-03-28

---

## Capability Summary

Writer uses ProseMirror clipboard hooks for plain-text clipboard conversion. Normal text paste is parsed through the shared `markdownManager`, while pure-paste flows are controlled by Writer itself through a one-shot paste intent boundary instead of relying only on ProseMirror's internal `plain` flag.

For application-driven paste entry points such as the custom editor context menu and explicit plain-paste commands, Writer now prefers native paste when possible and falls back to explicit clipboard text reading when the host runtime denies `document.execCommand('paste')`. HTML-rich paste priority still remains with the editor's default clipboard handling when native paste succeeds, and image clipboard items remain handled by the image-paste path before text parsing is involved.

---

## Entries

| Entry                                                                | Trigger                                      | Evidence                                                                                                                                        | Notes                              |
| -------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `EditorImpl.editorProps.clipboardTextParser`                         | text paste reaches ProseMirror parser branch | `src/domains/editor/core/EditorImpl.tsx`                                                                                                        | main parse entry                   |
| `EditorImpl.editorProps.clipboardTextSerializer`                     | text copy/cut requests plain text            | `src/domains/editor/core/EditorImpl.tsx`                                                                                                        | main serialize entry               |
| `createMarkdownClipboardTextParser`                                  | plain-text paste conversion                  | `src/domains/editor/integration/markdownClipboard.ts`                                                                                           | consumes Writer-owned intent first |
| `createMarkdownClipboardTextSerializer`                              | selection to Markdown text                   | `src/domains/editor/integration/markdownClipboard.ts`                                                                                           | uses shared markdown manager       |
| `setNextPasteIntent / consumeNextPasteIntent / clearNextPasteIntent` | pure-paste intent lifecycle                  | `src/domains/editor/integration/pasteIntentController.ts`                                                                                       | one-shot boundary                  |
| `executePasteCommand`                                                | menu/context paste bridge                    | `src/domains/editor/integration/pasteCommandBridge.ts`                                                                                          | shared paste execution helper      |
| `readClipboardText`                                                  | desktop/web clipboard text fallback          | `src/services/runtime/ClipboardTextReader.ts`, `src-tauri/src/lib.rs`                                                                           | Tauri command first on desktop     |
| `menu.edit.paste_plain`                                              | edit menu plain paste                        | `src/app/commands/editCommands.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/ui/chrome/menuSchema.ts`, `src-tauri/src/menu.rs` | command and native menu route      |
| `context menu -> paste-plain`                                        | editor context menu plain paste              | `src/shared/components/ContextMenu/editorMenu.tsx`, `src/domains/editor/handlers/contextMenuHandler.ts`                                         | context path                       |
| `Cmd/Ctrl+Shift+V`                                                   | keyboard pure paste                          | `src/domains/editor/extensions/keydownHandler.ts`                                                                                               | arms one-shot plain intent         |

---

## Current Rules

### CR-001: Writer wires Markdown clipboard conversion through official editor clipboard hooks

The editor uses `clipboardTextParser` and `clipboardTextSerializer` for text conversion rather than custom low-level DOM text parsing.

**Evidence**: `src/domains/editor/core/EditorImpl.tsx`, `src/domains/editor/integration/markdownClipboard.ts`

### CR-002: Normal plain-text paste parses Markdown into structured content

When neither ProseMirror `plain` nor Writer-owned pure-paste intent requests bypass, the parser calls `markdownManager.parse(text)` and converts the result into a schema-backed `Slice`.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`, `src/services/markdown/MarkdownService.ts`

### CR-003: Writer owns pure-paste intent explicitly

Pure-paste behavior is not inferred only from ProseMirror internals. Writer sets next-paste intent through a dedicated controller and the parser consumes that intent once.

**Evidence**: `src/domains/editor/integration/pasteIntentController.ts`, `src/domains/editor/integration/markdownClipboard.ts`

### CR-004: Pure paste bypasses Markdown parsing and inserts raw text

If ProseMirror passes `plain === true` or Writer-owned intent resolves to `plain`, the parser creates paragraph-based raw-text content instead of running Markdown structure conversion.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`

### CR-005: Pure-paste intent is one-shot and must not leak

After parser consumption, the next-paste intent resets to `default`. Paste-command failure paths also reset pending plain intent before reporting permission errors.

**Evidence**: `src/domains/editor/integration/pasteIntentController.ts`, `src/domains/editor/integration/pasteCommandBridge.ts`

### CR-006: Application-driven normal paste prefers native paste and falls back to explicit text insertion

When Writer itself initiates a paste action from menu or context-menu handlers, it tries the host native paste path first. If the runtime denies that path, Writer reads clipboard text explicitly and inserts it through the same Markdown/plain-text conversion rules.

**Evidence**: `src/domains/editor/integration/pasteCommandBridge.ts`, `src/services/runtime/ClipboardTextReader.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/domains/editor/handlers/contextMenuHandler.ts`

### CR-007: Oversized or parse-failing input falls back to raw text

If input exceeds the parse threshold or Markdown parsing throws, Writer falls back to raw-text paragraph insertion.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`

### CR-008: Copied selections serialize back to Markdown text

Selected slice content is wrapped as a `doc` payload and serialized through the shared `markdownManager`.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`, `src/services/markdown/MarkdownService.ts`

### CR-009: Menu, context menu, and shortcut all align on Writer-owned pure-paste behavior

The edit menu plain-paste item, context menu plain-paste item, and `Cmd/Ctrl+Shift+V` all resolve to Writer-owned pure-paste behavior. Keyboard paste still arms one-shot intent for the browser/native paste event, while application-driven plain paste reads text explicitly and inserts it as raw text.

**Evidence**: `src/app/commands/editCommands.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/domains/editor/handlers/contextMenuHandler.ts`, `src/domains/editor/extensions/keydownHandler.ts`, `src/domains/editor/integration/pasteCommandBridge.ts`

### CR-010: Image paste stays outside this capability's conversion path

Clipboard image items are still handled by the image-paste hook, which prevents default only for image items and leaves text conversion behavior unchanged.

**Evidence**: `src/domains/editor/hooks/useImagePaste.ts`, `src/domains/editor/integration/pasteBridge.ts`

---

## Impact Surface

| Area                     | What to check                                                       | Evidence                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor wiring            | parser/serializer still mounted correctly                           | `src/domains/editor/core/EditorImpl.tsx`                                                                                                                                                                                                                                                              |
| Paste intent lifecycle   | one-shot consume and clear-on-failure behavior                      | `src/domains/editor/integration/pasteIntentController.ts`, `src/domains/editor/integration/pasteCommandBridge.ts`                                                                                                                                                                                     |
| Clipboard text fallback  | desktop/web explicit text read path for app-driven paste            | `src/services/runtime/ClipboardTextReader.ts`, `src-tauri/src/lib.rs`                                                                                                                                                                                                                                 |
| Markdown parser behavior | normal paste, pure paste, oversize fallback, parse-failure fallback | `src/domains/editor/integration/markdownClipboard.ts`                                                                                                                                                                                                                                                 |
| Keyboard entry           | shortcut sets plain intent only for `Cmd/Ctrl+Shift+V`              | `src/domains/editor/extensions/keydownHandler.ts`                                                                                                                                                                                                                                                     |
| Edit menu path           | menu command id and native menu item stay aligned                   | `src/app/commands/editCommands.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/ui/chrome/menuSchema.ts`, `src-tauri/src/menu.rs`                                                                                                                                                       |
| Context menu path        | plain-paste item exists and uses shared paste bridge                | `src/shared/components/ContextMenu/editorMenu.tsx`, `src/domains/editor/handlers/contextMenuHandler.ts`                                                                                                                                                                                               |
| Image paste              | image clipboard items still bypass text parsing                     | `src/domains/editor/hooks/useImagePaste.ts`, `src/domains/editor/integration/pasteBridge.ts`                                                                                                                                                                                                          |
| Behavior tests           | parser, command, context, and shortcut contracts remain covered     | `src/domains/editor/integration/markdownClipboard.test.ts`, `src/domains/editor/integration/pasteIntentController.test.ts`, `src/domains/editor/handlers/menuCommandHandler.test.ts`, `src/domains/editor/handlers/contextMenuHandler.test.ts`, `src/domains/editor/core/EditorTableControls.test.ts` |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- Current pure-paste cleanup is one-shot plus command-failure reset. If future product scope requires blur/timeout cleanup independent of parser consumption, that should extend `PasteIntentController` rather than spreading more state across handlers.
- Application-driven normal paste falls back to text-only insertion when host native paste is unavailable. That is intentional for reliability, but it means rich HTML fidelity still depends on native paste succeeding.

---

## Known Consumers

| Consumer                   | Usage                                            | Evidence                                                  |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `EditorImpl`               | mounts clipboard parser and serializer           | `src/domains/editor/core/EditorImpl.tsx`                  |
| `markdownClipboard.ts`     | text clipboard parse/serialize core              | `src/domains/editor/integration/markdownClipboard.ts`     |
| `pasteIntentController.ts` | owns next-paste intent state                     | `src/domains/editor/integration/pasteIntentController.ts` |
| `pasteCommandBridge.ts`    | shared paste execution for menu/context actions  | `src/domains/editor/integration/pasteCommandBridge.ts`    |
| `ClipboardTextReader`      | desktop/web clipboard text read fallback         | `src/services/runtime/ClipboardTextReader.ts`             |
| `MarkdownService`          | shared `markdownManager` parse/serialize support | `src/services/markdown/MarkdownService.ts`                |

---

## Archive Pointer

- None. This remains the current capability document.
