# Error Handling UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modify the prototype to demonstrate 3 levels of error handling: Silent Info, Transient Warning (Toast), and Critical Banner.

**Architecture:** Add a mock "Debug Panel" to trigger the three different error states. Update the HTML/CSS to include the necessary DOM elements (Toast, Banner) and CSS animations.

**Tech Stack:** HTML, Tailwind CSS, JavaScript

---

### Task 1: Add Debug Control Panel

**Files:**
- Modify: `E:\Project\Writer\docs\current\原型图\prototype_v6_windows_error_ui.html`

**Step 1: Write the implementation**
Add a floating debug panel in the bottom right corner with buttons to trigger the 3 error levels.

**Step 2: Commit**

### Task 2: Implement Level 1 (Silent Info / Status Bar)

**Files:**
- Modify: `E:\Project\Writer\docs\current\原型图\prototype_v6_windows_error_ui.html`

**Step 1: Write the implementation**
Add JavaScript logic to the Level 1 trigger button. It should change the color of `#status-indicator` to orange/red, change `#status-text` to "保存失败", and add a tooltip/title. Set a timeout to revert it.

**Step 2: Commit**

### Task 3: Implement Level 2 (Top-Center Toast)

**Files:**
- Modify: `E:\Project\Writer\docs\current\原型图\prototype_v6_windows_error_ui.html`

**Step 1: Write the implementation**
Add the HTML structure for the Toast at the top of the `<body>`. Add CSS animations for slide down/up. Add JavaScript logic to show/hide the toast with a 3-second timeout.

**Step 2: Commit**

### Task 4: Implement Level 3 (Critical Inline Banner)

**Files:**
- Modify: `E:\Project\Writer\docs\current\原型图\prototype_v6_windows_error_ui.html`

**Step 1: Write the implementation**
Add the HTML structure for the Banner inside `#editor-view`, just below the `<header>`. Add JavaScript logic to toggle its visibility. It should not auto-hide; it requires explicit dismissal.

**Step 2: Commit**
