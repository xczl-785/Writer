# 🤖 AI Agent Development Instructions (Writer Project)

## 1. Project Architecture & Dual-Repo Workflow
This project adopts a **Dual-Repo (双仓联动)** architecture to separate open-source code from internal product management. 

As an AI Agent working on this project, you must understand your current workspace context:
- 💻 **Codebase (`Writer/`)**: The current directory. This is the open-source Tauri + React application. It is synced to both GitHub and internal Gitea.
- 📁 **Internal Docs (`Writer-Docs-Internal/`)**: Located at `../Writer-Docs-Internal/`. This is a private repository containing PRDs, UI/UX designs, bug tracking, and product roadmaps.

## 2. Hard Rules for AI Agents
1. **NO INTERNAL DOCS IN CODEBASE**: NEVER create, modify, or store product tracking boards, bug statistics, or sprint planning markdown files inside the `Writer/` directory.
2. **CROSS-DIRECTORY NAVIGATION**: When the user asks you to "check the PRD", "update the tracking board", or "record a leftover bug", you MUST use your file system tools to navigate to the `../Writer-Docs-Internal/` directory.
3. **SEPARATE COMMITS**: 
   - If you modify application code, commit your changes in the `Writer/` directory.
   - If you modify internal documents or tracking boards, you MUST change your working directory to `../Writer-Docs-Internal/` to execute the `git commit` command.
4. **VERIFY BEFORE ASSERTING**: Always use tools like `read`, `glob`, or `bash` to check the actual state of code or documents before making assumptions.

## 3. Tech Stack & Conventions
- **Frontend**: React 19, TypeScript, TipTap, Zustand, TailwindCSS v4.
- **Backend**: Rust, Tauri v2.
- **Style**: Adhere strictly to existing Clean Code principles, formatting, and naming conventions found in the repository.

## 4. Work Flow Example
- User: "Fix the bug where the focus mode button crashes, and update the tracking board."
- Agent Action 1: Search and fix the code in `Writer/src/...`
- Agent Action 2: Run tests / build in `Writer/` to verify.
- Agent Action 3: Commit the code fix in `Writer/`.
- Agent Action 4: Read `../Writer-Docs-Internal/当前Bug统计.md` (or similar tracking file).
- Agent Action 5: Edit the tracking file to mark the bug as resolved.
- Agent Action 6: Change directory to `../Writer-Docs-Internal/` and commit the document update.
