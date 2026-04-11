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
  - application-driven normal paste still prefers native paste before falling back to explicit clipboard payload insertion
  - image paste is still handled by the image path
  - VSCode markdown paste is intercepted and routed through text/plain parser
  - indentation retry activates only for sole-codeBlock degeneration and preserves genuine code blocks
  - menu, context menu, and shortcut stay aligned
  - editor schema remains a superset of the MarkdownService schema (CR-018)
- **last_verified**: 2026-04-11

---

## Capability Summary

Writer uses ProseMirror clipboard hooks for plain-text clipboard conversion. Normal text paste is parsed through the shared `markdownManager`, while pure-paste flows are controlled by Writer itself through a one-shot paste intent boundary instead of relying only on ProseMirror's internal `plain` flag.

For application-driven paste entry points such as the custom editor context menu and explicit plain-paste commands, Writer now prefers native paste when possible and falls back to explicit clipboard payload reading when the host runtime denies `document.execCommand('paste')`. In that fallback path, normal paste prefers HTML payload and only falls back to plain text when HTML is unavailable. Image clipboard items still remain handled by the image-paste path before text parsing is involved.

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
| `readClipboardPayload`                                               | desktop/web clipboard payload fallback       | `src/services/runtime/ClipboardTextReader.ts`, `src-tauri/src/lib.rs`                                                                           | returns HTML/text when available   |
| `menu.edit.paste_plain`                                              | edit menu plain paste                        | `src/app/commands/editCommands.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/ui/chrome/menuSchema.ts`, `src-tauri/src/menu.rs` | command and native menu route      |
| `context menu -> paste-plain`                                        | editor context menu plain paste              | `src/shared/components/ContextMenu/editorMenu.tsx`, `src/domains/editor/handlers/contextMenuHandler.ts`                                         | context path                       |
| `Cmd/Ctrl+Shift+V`                                                   | keyboard pure paste                          | `src/domains/editor/extensions/keydownHandler.ts`                                                                                               | arms one-shot plain intent         |
| `handleVSCodeMarkdownPaste`                                           | VSCode markdown paste interception           | `src/domains/editor/hooks/pasteHandler.ts`                                                                                                      | discards HTML, routes to text/plain |

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

### CR-006: Application-driven normal paste prefers native paste and falls back to explicit payload insertion

When Writer itself initiates a paste action from menu or context-menu handlers, it tries the host native paste path first. If the runtime denies that path, Writer reads clipboard payload explicitly. Normal paste prefers HTML insertion and only falls back to plain text insertion when HTML is unavailable.

**Evidence**: `src/domains/editor/integration/pasteCommandBridge.ts`, `src/services/runtime/ClipboardTextReader.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/domains/editor/handlers/contextMenuHandler.ts`

### CR-007: Oversized, parse-failing, or schema-mismatched input falls back to raw text

If input exceeds the parse threshold, Markdown parsing throws, **or the parsed JSON contains node/mark types unknown to the editor schema**, Writer falls back to raw-text paragraph insertion rather than silently dropping the paste. The third clause is defense in depth for CR-018: if the invariant is ever violated, the user still gets their text instead of a no-op key press or an empty editor after a file load.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts` — `tryMarkdownParse` guards the parse step, `tryNodeFromJSON` guards the schema resolution step, and the file-load path in `src/domains/editor/core/EditorImpl.tsx` wraps `editor.commands.setContent` in an inner try/catch that falls back to a single plain paragraph containing the raw markdown source.

### CR-008: Copied selections serialize back to Markdown text

Selected slice content is wrapped as a `doc` payload and serialized through the shared `markdownManager`.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`, `src/services/markdown/MarkdownService.ts`

### CR-009: Menu, context menu, and shortcut all align on Writer-owned pure-paste behavior

The edit menu plain-paste item, context menu plain-paste item, and `Cmd/Ctrl+Shift+V` all resolve to Writer-owned pure-paste behavior. Keyboard paste still arms one-shot intent for the browser/native paste event, while application-driven plain paste reads text explicitly and inserts it as raw text.

**Evidence**: `src/app/commands/editCommands.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/domains/editor/handlers/contextMenuHandler.ts`, `src/domains/editor/extensions/keydownHandler.ts`, `src/domains/editor/integration/pasteCommandBridge.ts`

### CR-011: VSCode markdown paste discards HTML and routes through text/plain

When a paste event carries `vscode-editor-data` with `mode: "markdown"`, the paste handler intercepts the event before ProseMirror processes the HTML. VSCode's HTML payload is a code-editor rendering (monospace, pre-styled divs) that ProseMirror would misinterpret as a code block. The handler discards the HTML, reads `text/plain`, and routes it through the Markdown clipboard parser.

**Evidence**: `src/domains/editor/hooks/pasteHandler.ts`

### CR-012: Sole-codeBlock degeneration triggers normalization retry

When Markdown parsing produces a doc containing exactly one `codeBlock` child, the parser checks for removable common indentation. If stripping common indent and re-parsing yields a structurally richer result (more nodes or different node types), the retried result is used. Otherwise the original parse stands. This is a secondary defense for non-VSCode sources that provide uniformly indented `text/plain`.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`, `src/domains/editor/integration/textNormalization.ts`

### CR-010: Image paste stays outside this capability's conversion path

Clipboard image items are still handled by the image-paste hook, which prevents default only for image items and leaves text conversion behavior unchanged.

**Evidence**: `src/domains/editor/hooks/useImagePaste.ts`, `src/domains/editor/integration/pasteBridge.ts`

### CR-018: Editor schema must be a superset of MarkdownService schema

Every mark type and node type registered in `MarkdownService`'s `markdownExtensions` list MUST also be registered in the editor's `createEditorSchemaExtensions` list. Violating this invariant corrupts the round-trip: `markdownManager.parse(text)` can produce JSON that `editor.state.schema.nodeFromJSON` cannot resolve, causing `Ctrl+V`, file loads, and right-click paste to fail silently.

**Rationale**: The clipboard text parser and the file-load path both take the shape `markdown → JSON → editor doc`. If the midpoint JSON carries a type unknown to the editor schema, ProseMirror throws from deep inside `nodeFromJSON`. In the paste path the throw is swallowed by the DOM event handler after `event.preventDefault()` has already fired, so the user sees "the Ctrl+V key did nothing". In the file-load path the user sees an empty editor with a silent status bar error. The schema-mismatch bug caused by the missing `Highlight` extension (2026-04-11) was a direct violation of this invariant.

**Enforcement**: `src/domains/editor/__tests__/schemaConsistency.test.ts` enumerates both schemas with `getSchema(...)` and asserts the subset relationship at the mark and node level. CI runs this test on every commit.

**Evidence**: `src/domains/editor/core/editorExtensions.ts`, `src/services/markdown/MarkdownService.ts` (`markdownExtensions`), `src/domains/editor/__tests__/schemaConsistency.test.ts`

---

## Impact Surface

| Area                       | What to check                                                       | Evidence                                                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor wiring              | parser/serializer still mounted correctly                           | `src/domains/editor/core/EditorImpl.tsx`                                                                                                                                                                                                                                                              |
| Paste intent lifecycle     | one-shot consume and clear-on-failure behavior                      | `src/domains/editor/integration/pasteIntentController.ts`, `src/domains/editor/integration/pasteCommandBridge.ts`                                                                                                                                                                                     |
| Clipboard payload fallback | desktop/web explicit HTML/text read path for app-driven paste       | `src/services/runtime/ClipboardTextReader.ts`, `src-tauri/src/lib.rs`                                                                                                                                                                                                                                 |
| Markdown parser behavior   | normal paste, pure paste, oversize fallback, parse-failure fallback | `src/domains/editor/integration/markdownClipboard.ts`                                                                                                                                                                                                                                                 |
| Keyboard entry             | shortcut sets plain intent only for `Cmd/Ctrl+Shift+V`              | `src/domains/editor/extensions/keydownHandler.ts`                                                                                                                                                                                                                                                     |
| Edit menu path             | menu command id and native menu item stay aligned                   | `src/app/commands/editCommands.ts`, `src/domains/editor/handlers/menuCommandHandler.ts`, `src/ui/chrome/menuSchema.ts`, `src-tauri/src/menu.rs`                                                                                                                                                       |
| Context menu path          | plain-paste item exists and uses shared paste bridge                | `src/shared/components/ContextMenu/editorMenu.tsx`, `src/domains/editor/handlers/contextMenuHandler.ts`                                                                                                                                                                                               |
| Image paste                | image clipboard items still bypass text parsing                     | `src/domains/editor/hooks/useImagePaste.ts`, `src/domains/editor/integration/pasteBridge.ts`                                                                                                                                                                                                          |
| VSCode paste interception  | markdown pastes from VSCode bypass HTML and use text/plain          | `src/domains/editor/hooks/pasteHandler.ts`                                                                                                                                                                                                                                                            |
| Text normalization         | indentation retry for sole-codeBlock degeneration                   | `src/domains/editor/integration/textNormalization.ts`                                                                                                                                                                                                                                                 |
| Behavior tests             | parser, command, context, and shortcut contracts remain covered     | `src/domains/editor/integration/markdownClipboard.test.ts`, `src/domains/editor/integration/pasteIntentController.test.ts`, `src/domains/editor/handlers/menuCommandHandler.test.ts`, `src/domains/editor/handlers/contextMenuHandler.test.ts`, `src/domains/editor/core/EditorTableControls.test.ts` |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- Current pure-paste cleanup is intentionally limited to one-shot consumption plus command-failure reset. `blur / timeout cleanup` has been deferred as a follow-up state-hygiene improvement and should extend `PasteIntentController` rather than spreading more state across handlers.
- Application-driven normal paste now preserves HTML when HTML payload is available through the fallback reader. Remaining fidelity gaps mainly concern clipboard payload types outside HTML/text, such as images or editor-specific formats.

---

## Known Consumers

| Consumer                   | Usage                                            | Evidence                                                  |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `EditorImpl`               | mounts clipboard parser and serializer           | `src/domains/editor/core/EditorImpl.tsx`                  |
| `markdownClipboard.ts`     | text clipboard parse/serialize core              | `src/domains/editor/integration/markdownClipboard.ts`     |
| `pasteIntentController.ts` | owns next-paste intent state                     | `src/domains/editor/integration/pasteIntentController.ts` |
| `pasteCommandBridge.ts`    | shared paste execution for menu/context actions  | `src/domains/editor/integration/pasteCommandBridge.ts`    |
| `ClipboardTextReader`      | desktop/web clipboard HTML/text read fallback    | `src/services/runtime/ClipboardTextReader.ts`             |
| `MarkdownService`          | shared `markdownManager` parse/serialize support | `src/services/markdown/MarkdownService.ts`                |

---

## Archive Pointer

- None. This remains the current capability document.
