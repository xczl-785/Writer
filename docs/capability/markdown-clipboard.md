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
  - editor schema remains a superset of the MarkdownService schema (CR-018)
  - Ctrl+A inside a codeBlock first selects the block's content; second press escalates to whole document
  - Selection wholly inside a single blockquote / list item / table cell copies plain text (no `>`, `-`, `|` syntax)
  - Selection that drag-wraps exactly one structural block (e.g. a whole code block including its boundaries) copies plain text, not Markdown with fences
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
| `createSmartClipboardTextSerializer`                                 | text/plain copy routing                      | `src/domains/editor/integration/smartClipboardSerializer.ts`                                                                                    | Detector A + Detector B + legacy fallback (CR-013) |
| `isSliceJustOneStructuralBlock` / `isSelectionWhollyInsideStructuralBlock` | CR-013 Detectors A and B               | `src/domains/editor/integration/smartClipboardSerializer.ts`                                                                                    | single-block exception predicates   |
| `CodeBlockSelectAll` extension                                       | Ctrl+A inside a codeBlock                    | `src/domains/editor/extensions/codeBlockSelectAll.ts`                                                                                           | CR-019: first press selects block content, second press escalates |
| `executeCopyAsMarkdown` / `executeCopyAsPlainText`                   | explicit copy commands                       | `src/domains/editor/integration/copyCommandBridge.ts`                                                                                           | bypass smart router deterministically |
| `editor.view.setProps({ clipboardSerializer })`                      | text/html copy channel                       | `src/domains/editor/core/EditorImpl.tsx`                                                                                                        | DOMSerializer-backed rich channel  |
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

### CR-018: Editor schema must be a superset of MarkdownService schema

Every mark type and node type registered in `MarkdownService`'s `markdownExtensions` list MUST also be registered in the editor's `createEditorSchemaExtensions` list. Violating this invariant corrupts the round-trip: `markdownManager.parse(text)` can produce JSON that `editor.state.schema.nodeFromJSON` cannot resolve, causing `Ctrl+V`, file loads, and right-click paste to fail silently.

**Rationale**: The clipboard text parser and the file-load path both take the shape `markdown → JSON → editor doc`. If the midpoint JSON carries a type unknown to the editor schema, ProseMirror throws from deep inside `nodeFromJSON`. In the paste path the throw is swallowed by the DOM event handler after `event.preventDefault()` has already fired, so the user sees "the Ctrl+V key did nothing". In the file-load path the user sees an empty editor with a silent status bar error. The schema-mismatch bug caused by the missing `Highlight` extension (2026-04-11) was a direct violation of this invariant.

**Enforcement**: `src/domains/editor/__tests__/schemaConsistency.test.ts` enumerates both schemas with `getSchema(...)` and asserts the subset relationship at the mark and node level. CI runs this test on every commit.

**Evidence**: `src/domains/editor/core/editorExtensions.ts`, `src/services/markdown/MarkdownService.ts` (`markdownExtensions`), `src/domains/editor/__tests__/schemaConsistency.test.ts`

---

### CR-013: Structural node whitelist + single-block-scoped plain-text exception

The smart copy serializer decides between Markdown source and plain text by asking **whether the selection crosses a structural boundary**, not merely whether it contains a structural node. The rule can be stated in one sentence:

> _Ctrl+C emits plain text. It only emits Markdown when the selection crosses or wraps a structural block boundary._

Concretely, the serializer applies the following checks in order:

1. **Detector A — slice wraps exactly one structural block**: If `slice.openStart === 0 && slice.openEnd === 0 && slice.content.childCount === 1` and the single child's type is in the structural whitelist, the selection is a drag-select that happened to include the whole block and its boundaries. Output: plain text projection of that block.
2. **Detector B — selection is wholly inside one structural block**: If the selection endpoints' shared ancestor chain (walked from `$from.sharedDepth($to.pos)` upward) contains any node whose type is in the structural whitelist, the selection lives inside that structural block. Output: plain text projection of the slice. Detector B is stateless and runs against the live editor selection via a closure injected into the serializer factory.
3. **Legacy fallback — slice contains a structural node reachable via `descendants`**: If neither Detector A nor Detector B fires, fall back to the original check. If this returns true the selection genuinely crosses block boundaries (e.g. spans a paragraph followed by a list) and the structural syntax is needed to express it. Output: Markdown source.
4. **Default**: Plain text projection.

**Cross-sibling semantics (Option X)**: Detector B walks ALL ancestor depths from `sharedDepth` down to 1, not just the direct parent. This means selections that cross sibling `listItem`s inside the same `bulletList`, or sibling `tableCell`s inside the same `table`, or two paragraphs inside the same `blockquote`, all count as "wholly inside one structural block" and route to plain text. The mental model is _"as long as you are still inside one structural container, the container's syntax is redundant with the text you already selected"_. If a user wants the Markdown syntax for such a selection, they invoke the explicit Copy as Markdown command (CR-015).

**Structural node whitelist** (single source of truth for Detectors A / B and the legacy fallback):

| Node type                                          | Rationale                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `bulletList` / `orderedList` / `taskList`          | List structure carries semantic hierarchy and numbering / check state |
| `listItem` / `taskItem`                            | Direct parent of inline content inside lists; Detector B anchor       |
| `codeBlock`                                        | Code fences and language identifiers are part of the content          |
| `blockquote`                                       | Quotation structure is semantic                                       |
| `horizontalRule`                                   | Divider is content, not styling                                       |
| `table` / `tableRow` / `tableCell` / `tableHeader` | Grid structure cannot be flattened losslessly across blocks           |

**Structural mark whitelist** (checked separately in the legacy fallback — marks have no ancestor semantics):

| Mark type | Rationale                                                          |
| --------- | ------------------------------------------------------------------ |
| `code`    | Inline code backticks are semantic; users select them to keep them |

**Nodes intentionally NOT on the whitelist** (plain-text-safe):

- `paragraph`, `heading` — the visible text is what the user selected; if they want `#` they use Copy as Markdown (CR-015)
- `hardBreak` — renders as `\n`
- All visual-only inline marks: `bold`, `italic`, `strike`, `underline`, `link`, `highlight`, etc.

**Rationale for the single-block exception**: When a user's selection is confined to one structural block (or one structural container, per Option X), the block's structural syntax (fences, `>`, `-`, `|`) carries no information beyond what the plain text already conveys — the user knows they are inside that block and does not need the markup. Crossing a boundary is the only signal that the structure itself is part of what the user is copying.

This rule is intentionally more aggressive than Typora's (which only special-cases `codeBlock` via `Ctrl+A`) and Obsidian's (which has no such handling at all). See `Writer-Docs-Internal/plans/FIX-CODE-BLOCK-COPY.md` §2 for the comparative study.

**Evidence**: `src/domains/editor/integration/smartClipboardSerializer.ts` — `STRUCTURAL_NODE_TYPES` / `STRUCTURAL_MARK_TYPES` constants, `isSliceJustOneStructuralBlock`, `isSelectionWhollyInsideStructuralBlock`, `containsStructuralNode` predicates, and their composition in `createSmartClipboardTextSerializer(getEditorState)`. Regression coverage in `src/domains/editor/integration/smartClipboardSerializer.test.ts` "single-block refinement (CR-013 revision)" block (T1–T12).

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
| `Cmd/Ctrl+A` (in codeBlock) | Select block content (CR-019) | `src/domains/editor/extensions/codeBlockSelectAll.ts` |
| `Cmd/Ctrl+V`              | Smart paste         | Existing paste pipeline (unchanged)                       |
| `Cmd/Ctrl+Shift+V`        | Paste as Plain Text | Existing (CR-009, unchanged)                              |

**Conflict audit**:

- `Mod-Alt-c` is reserved for **insert code block** (`src/domains/editor/core/constants.ts:156`) and must not be used for copy-related actions
- `Mod-Shift-c` was previously unused; now claimed by Copy as Markdown
- `Mod-Shift-Alt-c` was previously unused; now claimed by Copy as Plain Text
- `Mod-a` is normally handled by ProseMirror's default `selectAll` command; `CodeBlockSelectAll` intercepts it ONLY when the cursor is inside a `codeBlock`, and even then declines (returns `false`) when the selection already matches the block content, which lets the default escalate to whole-document selection. No conflict with the default behavior outside code blocks.

**Known limitation (Windows)**: `Ctrl+Shift+C` did not reliably trigger Copy as Markdown on Windows in release builds during the 2026-04-11 regression pass. The menu entries and context menu entries work correctly, but the keyboard path does not deliver the keydown event to the editor handler. Root cause not yet located — tracked as `current/跟踪/遗留问题.md` #13. Users on Windows should use the Edit menu or editor context menu until that is resolved.

**Evidence**: `src/domains/editor/extensions/keydownHandler.ts`, `src/domains/editor/extensions/codeBlockSelectAll.ts`, `src/domains/editor/core/constants.ts:156`

---

### CR-019: Ctrl+A inside a code block first selects the block's content

When the editor focus is inside a `codeBlock` node and the user invokes the `Mod-a` (Select All) keyboard shortcut, Writer intercepts the command and sets the selection to the code block's content range (`$from.start()` to `$from.end()`) instead of the document-wide selection produced by Tiptap's default behavior.

**Escape hatch**: If the current selection already covers exactly the code block's content range (i.e. `selection.from === $from.start() && selection.to === $from.end()`), Writer declines to handle the shortcut and returns `false`, allowing ProseMirror's default `selectAll` command to fire and escalate the selection to the whole document. This gives users a natural "second press = whole doc" gesture **without** introducing any cross-keypress state tracking — the decision is computed solely from the current selection shape at call time.

**Non-goals**:

- This rule applies **only** to `codeBlock`. Ctrl+A in paragraph / heading / blockquote / list / table / root position keeps Tiptap's default (select whole document). Extending this rule to other block types would violate user muscle memory built from every other editor.
- This is **not** a generalized "smart select" feature. It exists because users copying code overwhelmingly want "the code in this fence", and Ctrl+A is the most natural gesture for that intent.

**Interaction with CR-013**: After the Ctrl+A override fires, the selection is a `TextSelection` with `$from.parent === $to.parent === codeBlock`. CR-013's Detector B immediately recognizes this as "wholly inside one structural block" and routes the subsequent copy to plain text projection. The two rules compose cleanly — CR-019 fixes the selection shape, CR-013 handles the serialization.

**Evidence**: `src/domains/editor/extensions/codeBlockSelectAll.ts`, `src/domains/editor/extensions/index.ts` (export), `src/domains/editor/core/EditorImpl.tsx` (registration in the `extensions` memo next to the other shortcut-only extensions), and regression `src/domains/editor/extensions/codeBlockSelectAll.test.ts` (T13–T16).

---

## Impact Surface

| Area                       | What to check                                                       | Evidence                                                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor wiring              | parser/serializer still mounted correctly                           | `src/domains/editor/core/EditorImpl.tsx`                                                                                                                                                                                                                                                              |
| Paste intent lifecycle     | one-shot consume and clear-on-failure behavior                      | `src/domains/editor/integration/pasteIntentController.ts`, `src/domains/editor/integration/pasteCommandBridge.ts`                                                                                                                                                                                     |
| Clipboard payload fallback | desktop/web explicit HTML/text read path for app-driven paste       | `src/services/runtime/ClipboardTextReader.ts`, `src-tauri/src/lib.rs`                                                                                                                                                                                                                                 |
| Markdown parser behavior   | normal paste, pure paste, oversize fallback, parse-failure fallback | `src/domains/editor/integration/markdownClipboard.ts`                                                                                                                                                                                                                                                 |
| Smart copy router          | Detector A / B / legacy fallback ordering and cross-sibling (Option X) semantics | `src/domains/editor/integration/smartClipboardSerializer.ts`, `src/domains/editor/integration/smartClipboardSerializer.test.ts` (single-block refinement)                                                                                                                                         |
| Ctrl+A in codeBlock        | CR-019 single-level override + escape hatch via returning false     | `src/domains/editor/extensions/codeBlockSelectAll.ts`, `src/domains/editor/extensions/codeBlockSelectAll.test.ts`                                                                                                                                                                                    |
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
- **Windows `Ctrl+Shift+C` delivery** (2026-04-11): the CR-015 shortcut does not reliably trigger on Windows in release builds. Menu and context-menu paths work, only the keyboard path fails. Root cause not located — no Tiptap extension binds `Mod-Shift-c`, and the path from browser keydown to `createEditorKeyDownHandler` is opaque. Tracked as `current/跟踪/遗留问题.md` #13. Users should use the Edit menu / right-click menu until resolved.

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
