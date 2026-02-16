# Image Paste Implementation Learnings

## Backend Implementation

### `save_image` Command

- **Atomic-ish Write**: We use a temporary file strategy for saving images. The data is first written to a `.tmp` file and then renamed to the final destination. This approach minimizes the risk of file corruption during write operations.
- **Unique Filename Logic**: To avoid overwriting existing assets, we implemented a recursive filename generator. It checks for existence and appends a numeric suffix (e.g., `image_1.png`) until a unique path is found.
- **Relative Path Calculation**: The backend calculates the relative path between the markdown document and the image storage location. This ensures that image links remain valid even if the project root is moved, maintaining document portability.

## Frontend Strategy

### `useImagePaste` Hook

- **Event Handling**: We encapsulated image paste logic within a custom `useImagePaste` hook. This hook listens for paste events on the editor instance and filters for image blobs.
- **Workflow**: When an image is detected, the hook invokes the backend `save_image` command and waits for the relative path. Once received, it inserts the appropriate markdown syntax into the TipTap editor.

## Markdown Service

- **Extension Requirement**: The `MarkdownService` relies on file extensions to identify image nodes. It's essential that the backend preserves or assigns correct extensions (like `.png` or `.jpg`) during the save process to ensure the editor renders them correctly.

## Autosave Strategies

### 3-Strategy Co-existence

We use three layers to keep data safe without slowing things down:

- **Debounced Save**: This kicks in after you stop typing for a second. It handles most saves while you're working.
- **Blur Save**: This runs the moment the editor loses focus. It catches changes if you switch windows or click elsewhere.
- **BeforeUnload Save**: This is the final safety net. It triggers if you try to close the app or refresh.

### TipTap Integration

- **`onBlur` Hook**: We put the blur strategy right into the TipTap setup. By watching the `blur` event, we can save immediately so nothing gets lost when you move away.

### Safe Exit with `beforeunload`

- **Window Listener**: We added a global `beforeunload` listener. It calls `flush` on the `AutosaveService` to make sure any waiting changes get saved before the app shuts down.

### Robust `flush` Handling

- **`AutosaveService`**: The service has a `flush` method. It stops any waiting timers and runs the save command right away. This makes sure your last changes are always kept, even if you exit suddenly.

## Atomic Write Verification

### Mechanism

- **Temp File + Rename**: We implement atomic writes by first writing data to a temporary file (e.g., `filename.tmp`) and then using `std::fs::rename` to move it to the final destination. This ensures that the target file is either fully updated or remains unchanged if the write fails.

### Integration Test Strategy

- **Failure Simulation**: To verify atomicity, we simulate write failures by creating a directory with the same name as the target file or by restricting write permissions.
- **Integrity Check**: The tests confirm that if the rename operation fails, the original file (if it existed) is untouched and no corrupted partial data is left behind.

## Error Feedback

### `StatusStore` for Critical Errors

- **Visibility**: We use `StatusStore` to surface critical errors (like file system failures) to the UI. This is preferred over simple `console.log` calls, which are invisible to users, or blocking `alert` calls, which disrupt the writing flow.
- **Non-blocking**: By updating a global status state, we provide immediate feedback without interrupting the user's creative process.

### Feedback Loop Implementation

- **`useImagePaste` Hook**: The hook catches errors during the image saving process and pushes them to the `StatusStore`.
- **`Sidebar` Integration**: The `Sidebar` component (or a dedicated status bar) subscribes to the `StatusStore` to display these messages, ensuring the user is aware of any background failures.
