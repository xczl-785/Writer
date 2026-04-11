# markdown-clipboard

## Quick Read

- **id**: `markdown-clipboard`
- **name**: Markdown Clipboard
- **summary**: Parse pasted plain text as Markdown by default, provide Writer-owned pure-paste bypass, and smart-serialize copied selections (plain text by default, Markdown only when selection contains structural nodes).
- **scope**: Editor clipboard parser/serializer/HTML-serializer wiring, Writer-owned paste intent lifecycle, application-driven paste fallback rules, smart copy structural-node whitelist, explicit Copy-as-Markdown / Copy-as-Plain commands, menu/context/shortcut entry points for both paste and copy variants, and regression boundaries with image paste.
- **entry_points**:
  - `EditorImpl -> editorProps.clipboardTextParser`
  - `EditorImpl -> editorProps.clipboardTextSerializer`
  - `EditorImpl -> editorProps.clipboardSerializer` (HTML)
  - `createMarkdownClipboardTextParser`
  - `createSmartClipboardTextSerializer`
  - `serializeSliceAsMarkdown` / `serializeSliceAsPlainText` (explicit commands)
  - `PasteIntentController`
  - `menu.edit.paste_plain`
  - `menu.edit.copy_markdown`
  - `menu.edit.copy_plain`
  - `context menu -> paste-plain`
  - `context menu -> copy-as-markdown`
  - `context menu -> copy-as-plain`
  - `Cmd/Ctrl+Shift+V` (paste plain)
  - `Cmd/Ctrl+Shift+C` (copy as Markdown)
  - `Cmd/Ctrl+Shift+Alt+C` (copy as plain text)
- **shared_with**: i18n (new menu labels), command-system (new commands)
- **check_on_change**:
  - normal plain-text paste still parses Markdown
  - pure paste still inserts raw text
  - pure-paste intent is consumed once and does not leak to the next paste
  - application-driven normal paste still prefers native paste before falling back to explicit clipboard payload insertion
  - image paste is still handled by the image path
  - VSCode markdown paste is intercepted and routed through text/plain parser
  - indentation retry activates only for sole-codeBlock degeneration and preserves genuine code blocks
  - default Ctrl+C on an inline selection inside formatted text produces plain text (no markdown syntax)
  - default Ctrl+C on a selection containing a list / code block / table / blockquote / horizontal rule / inline code produces Markdown source
  - default Ctrl+C writes both text/plain and text/html; explicit Copy-as-Plain writes only text/plain
  - Copy as Markdown / Copy as Plain Text commands align across shortcut, menu, and context menu
  - Mod-Alt-c stays bound to insert-code-block and is not reused
  - menu, context menu, and shortcut stay aligned
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
| `createSmartClipboardTextSerializer`                                 | text/plain copy routing                      | `src/domains/editor/integration/smartClipboardSerializer.ts:126`                                                                                | whitelist-driven plain vs markdown |
| `executeCopyAsMarkdown` / `executeCopyAsPlainText`                   | explicit copy commands                       | `src/domains/editor/integration/copyCommandBridge.ts:95`, `:109`                                                                                | bypass smart router deterministically |
| `editor.view.setProps({ clipboardSerializer })`                      | text/html copy channel                       | `src/domains/editor/core/EditorImpl.tsx:388-398`                                                                                                | DOMSerializer-backed rich channel  |
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

### CR-007: Oversized or parse-failing input falls back to raw text

If input exceeds the parse threshold or Markdown parsing throws, Writer falls back to raw-text paragraph insertion.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`

### CR-008: Default copy uses structural-aware smart serialization

When the user invokes the default copy action (`Ctrl/Cmd+C`, system-level cut, drag-to-copy), Writer writes multiple MIME formats to the clipboard simultaneously:

- `text/plain`: determined by a deterministic **structural node whitelist** check against the selected slice
  - If the selection contains **no** whitelisted structural nodes → plain-text projection (visible text only, inline marks stripped, block boundaries rendered as `\n\n`)
  - If the selection contains **any** whitelisted structural node → Markdown source via shared `markdownManager.serialize`
- `text/html`: ProseMirror default DOM serializer output (for rich-text targets)

The whitelist is intentionally narrow and fully enumerated so the rule is explainable in one sentence: *"Ctrl+C gives you plain text; it only keeps Markdown syntax when the selection contains structural elements that would lose information without it."*

**Rationale**: `text/plain` is the OS-universal fallback consumed by every target (Notepad, Slack, terminals, search boxes). Filling it unconditionally with Markdown syntax produces broken UX in the vast majority of copy destinations. At the same time, silently stripping structure when the user genuinely selected a list/code block/table would be a worse data-loss failure. The whitelist resolves both concerns deterministically.

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts`, `src/services/markdown/MarkdownService.ts`, regression test `src/domains/editor/integration/markdownClipboard.test.ts`

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

---

### CR-013: Structural node whitelist (single source of truth)

The smart copy serializer determines its output format by checking whether the selected slice contains **any** node whose type name matches the following whitelist. The whitelist is the single source of truth for "this content cannot be losslessly expressed as plain text":

| Node type           | Rationale                                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| `bulletList`        | List structure carries semantic hierarchy                                 |
| `orderedList`       | List structure carries numbering semantics                                |
| `taskList`          | Task checkbox state is semantic, not visual                               |
| `listItem` / `taskItem` | Implied by list ancestors; safety net                                 |
| `codeBlock`         | Code fences and language identifiers are part of the content              |
| `code` (inline mark) | Inline code backticks are semantic; users select them intentionally      |
| `table` / `tableRow` / `tableCell` / `tableHeader` | Grid structure cannot be flattened losslessly |
| `blockquote`        | Quotation attribution is semantic                                         |
| `horizontalRule`    | A divider is content, not styling                                         |

Nodes **not** on the whitelist (and therefore safe to project to plain text):

- `paragraph`, `heading` (headings strip the `#` prefix — the visible text is what the user selected)
- `hardBreak` (renders as `\n`)
- Inline marks: `bold`, `italic`, `strike`, `underline`, `link`, `highlight`, etc.

**Rationale**: Headings are explicitly **not** on the whitelist — selecting the visible text of a heading should give the user that text, not `# text`. If a user wants the Markdown source of a heading, they invoke the explicit "Copy as Markdown" entry (CR-015).

**Evidence**: `src/domains/editor/integration/smartClipboardSerializer.ts:20-45` — `STRUCTURAL_NODE_TYPES` / `STRUCTURAL_MARK_TYPES` constants; `src/domains/editor/integration/smartClipboardSerializer.ts:47-72` — `containsStructuralNode(slice)` predicate. Regression test: `src/domains/editor/integration/smartClipboardSerializer.test.ts`.

---

### CR-014: HTML clipboard serializer is wired for rich-text targets

Writer configures `editorProps.clipboardSerializer` (the DOM serializer) in addition to `clipboardTextSerializer` (the text serializer), so that rich-text paste targets (browsers, Word, Gmail, etc.) receive proper HTML instead of falling back to plain text. The HTML serializer uses ProseMirror's default DOM serializer derived from the editor schema.

**Rationale**: Historically Writer only wired `clipboardTextSerializer`, leaving HTML to ProseMirror defaults. With the new plain-text-biased `text/plain` behavior (CR-008), a properly populated `text/html` channel becomes load-bearing — it is the format that rich targets consume to preserve formatting.

**Evidence**: `src/domains/editor/core/EditorImpl.tsx:388-398` — post-mount `useEffect` attaches `DOMSerializer.fromSchema(editor.schema)` via `editor.view.setProps({ clipboardSerializer })`. Regression test: `src/domains/editor/core/EditorClipboardContracts.test.ts`.

---

### CR-015: Explicit "Copy as Markdown" command forces Markdown source output

`Copy as Markdown` is a first-class command exposed via three entry points:

- **Keyboard**: `Cmd/Ctrl+Shift+C`
- **Edit menu**: `复制为 Markdown` / `Copy as Markdown`
- **Editor context menu**: `复制为 Markdown` / `Copy as Markdown`

When invoked, it bypasses the smart serializer (CR-008) and writes Markdown source via `markdownManager.serialize` into `text/plain`, regardless of selection shape. `text/html` still carries the HTML version per CR-014.

**Rationale**: Deterministic escape hatch for users who specifically need Markdown source (e.g., pasting into another Markdown editor, documentation, or a chat where they want raw syntax).

**Evidence**: `src/domains/editor/integration/copyCommandBridge.ts:95-107` (command core), `src/app/commands/editCommands.ts` (`menu.edit.copy_markdown`), `src/domains/editor/handlers/menuCommandHandler.ts` (`edit.copy_markdown` case), `src/domains/editor/handlers/contextMenuHandler.ts` (`onCopyAsMarkdown` binding), `src/domains/editor/extensions/keydownHandler.ts` (Mod-Shift-c branch), `src/ui/chrome/menuSchema.ts` (`menu.edit.copy_markdown` entry), `src-tauri/src/menu.rs` (native menu item). Regression test: `src/domains/editor/integration/copyCommandBridge.test.ts`.

---

### CR-016: Explicit "Copy as Plain Text" command forces plain-text output

`Copy as Plain Text` is the reverse fallback to CR-015, exposed via three entry points:

- **Keyboard**: `Cmd/Ctrl+Shift+Alt+C`
- **Edit menu**: `复制为纯文本` / `Copy as Plain Text`
- **Editor context menu**: `复制为纯文本` / `Copy as Plain Text`

When invoked, it bypasses the smart serializer and writes the plain-text projection of the selection into `text/plain`, regardless of whether the selection contains whitelisted structural nodes. `text/html` is **omitted** (not written) in this path, so that rich-text targets also consume plain text.

**Rationale**: Covers the scenario where the user intentionally wants to strip all formatting (e.g., copying a code snippet out of a fenced block for a non-code target, extracting text from a quoted block for citation). Without this entry, users selecting a code block have no way to get "just the code without the fences" besides manual post-edit.

**Evidence**: `src/domains/editor/integration/copyCommandBridge.ts:109-118` (command core; `text/html` is deliberately NOT written — only `text/plain`), `src/app/commands/editCommands.ts` (`menu.edit.copy_plain`), `src/domains/editor/handlers/menuCommandHandler.ts` (`edit.copy_plain` case), `src/domains/editor/handlers/contextMenuHandler.ts` (`onCopyAsPlainText` binding), `src/domains/editor/extensions/keydownHandler.ts` (Mod-Shift-Alt-c branch), `src/ui/chrome/menuSchema.ts` (`menu.edit.copy_plain` entry), `src-tauri/src/menu.rs` (native menu item). Regression test: `src/domains/editor/integration/copyCommandBridge.test.ts` (`writes only text/plain and not text/html`).

---

### CR-017: Keyboard shortcut registry

| Shortcut                  | Action              | Entry point                                               |
| ------------------------- | ------------------- | --------------------------------------------------------- |
| `Cmd/Ctrl+C`              | Smart copy (CR-008) | Native browser copy event → ProseMirror clipboard hooks   |
| `Cmd/Ctrl+Shift+C`        | Copy as Markdown    | `src/domains/editor/extensions/keydownHandler.ts`         |
| `Cmd/Ctrl+Shift+Alt+C`    | Copy as Plain Text  | `src/domains/editor/extensions/keydownHandler.ts`         |
| `Cmd/Ctrl+V`              | Smart paste         | Existing paste pipeline (unchanged)                       |
| `Cmd/Ctrl+Shift+V`        | Paste as Plain Text | Existing (CR-009, unchanged)                              |

**Conflict audit**:

- `Mod-Alt-c` is reserved for **insert code block** (`src/domains/editor/core/constants.ts:156`) and must not be used for copy-related actions
- `Mod-Shift-c` was previously unused; now claimed by Copy as Markdown
- `Mod-Shift-Alt-c` was previously unused; now claimed by Copy as Plain Text

**Evidence**: `src/domains/editor/extensions/keydownHandler.ts`, `src/domains/editor/core/constants.ts:156`

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
