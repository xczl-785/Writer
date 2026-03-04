# Writer 编辑区重构架构设计（非功能性）

**日期**: 2026-03-05  
**范围**: `src/ui/editor` 为核心，联动 `src/app`、`src/ui/statusbar`、`src/state`、`src/services`

---

## 1. 背景与问题定义

当前编辑区已具备完整功能，但结构上存在以下坏味道：

1. `Editor.tsx` 职责过重：布局、交互、菜单桥接、持久化、副作用混在同一组件。
2. 垂直布局控制点分散：`header/statusbar/ProseMirror padding/typewriter anchor` 分别定义，缺少统一契约。
3. 交互桥接逻辑分散：native menu、context menu、clipboard、paste、autosave 的绑定关系不清晰。
4. 部分测试依赖源码字符串断言，行为契约保护不足。

这导致两个直接结果：

1. UI 间距改动经常“改了不生效”或“局部生效、整体失真”。
2. 打字机 45% 锚点稳定性问题难以系统修复。

---

## 2. 重构边界与原则

### 2.1 硬约束

1. **非功能性变更**：不新增产品能力，不改用户可见功能定义。
2. **阶段可编译**：每个阶段都必须可通过类型检查与核心测试。
3. **阶段可兼容**：旧行为通过适配层保持一致，不做一次性切换。
4. **小步推进**：每个阶段可独立回滚、可独立合并。

### 2.2 出界项（本轮不做）

1. 不新增全新编辑功能。
2. 不做 UI 视觉风格重设计。
3. 不重写 TipTap 业务模型。

---

## 3. 终态架构目标

### 3.1 目标分层

1. `EditorOrchestrator`（编排层）
- 仅做依赖装配与渲染组合，不承载业务规则。

2. `EditorLayoutSystem`（布局系统）
- 统一定义编辑区垂直空间模型：header/footer/contentPadding/viewportTier/typewriterAnchorInput。

3. `EditorDomain`（领域逻辑层）
- 包含 find/replace、slash session、focus-zen gate、typewriter anchor 纯逻辑。

4. `EditorIntegration`（外部集成层）
- 封装 TipTap、menu bridge、context menu、clipboard、image paste、autosave。

5. `EditorStateFacade`（状态门面）
- 统一访问 Zustand，多 store 访问收敛到稳定接口。

6. `EditorView`（视图层）
- 纯 props 驱动组件树，副作用最小化。

7. `Contract Tests`（契约测试层）
- 从“源码字符串断言”迁移到“行为契约断言”。

### 3.2 目标目录（建议）

```text
src/ui/editor/
  core/
    EditorOrchestrator.tsx
    EditorLayoutModel.ts
    EditorStateFacade.ts
  domain/
    findReplace/
    slash/
    focusZen/
    typewriter/
  integration/
    tiptap/
    menu/
    context/
    paste/
    autosave/
  view/
    EditorView.tsx
    EditorShell.tsx
    overlays/
  contracts/
    *.contract.test.ts
```

---

## 4. 核心设计

### 4.1 统一布局契约（关键）

新增 `EditorLayoutModel`，产出唯一布局参数对象（示意）：

- `headerHeight`
- `footerHeight`
- `contentPaddingTop`
- `contentPaddingBottom`
- `contentPaddingInline`
- `maxContentWidth`
- `viewportTier`
- `typewriterAnchorRatio`

要求：CSS 与 typewriter 算法都消费同一个模型，而不是各算一套。

### 4.2 交互事件链路收敛

把以下桥接事件从组件中迁出：

1. native menu command -> editor command
2. context menu open/close/action
3. paste event -> image/file pipeline
4. onUpdate -> serialize -> autosave

组件中只保留“绑定”而不保留“规则”。

### 4.3 状态访问收敛

新增 `EditorStateFacade`：

1. 读：activeFile/currentPath/fileContent/dirty
2. 写：updateContent/setDirty/setStatus
3. Action：openFile/expandNode/copyStatus

目标是把分散的 store 访问集中，降低重构时牵一发而动全身。

### 4.4 测试升级策略

1. 保留关键 smoke test。
2. 新增 contracts 测试：
- 布局模型契约
- 命令桥接契约
- typewriter 输入输出契约
- find/replace 领域行为契约
3. 逐步淘汰“源码字符串存在性”测试。

---

## 5. 分阶段推进（通往终态）

### 阶段 A: 骨架搭建

目标：建立目标目录、接口与透传实现，不改行为。

### 阶段 B: 布局系统统一

目标：建立布局单一来源，接入编辑区 CSS 与 typewriter 输入。

### 阶段 C: Integration 抽离

目标：菜单/右键/粘贴/autosave 桥接层迁移出 `Editor.tsx`。

### 阶段 D: Domain 抽离

目标：find/replace、slash、focus-zen、typewriter 逻辑归位到 domain。

### 阶段 E: Orchestrator/View 收口

目标：`Editor.tsx` 收敛为编排层，视图层纯 props。

### 阶段 F: 测试体系迁移

目标：契约测试替代字符串测试，保证回归保护质量。

### 阶段 G: 清理与文档

目标：移除临时适配层，沉淀架构文档与维护指南。

---

## 6. 风险与缓解

1. 风险：迁移过程行为偏差。  
缓解：每阶段保留兼容适配层 + 契约测试守门。

2. 风险：布局系统切换影响视觉。  
缓解：先做“参数统一、不改参数值”。

3. 风险：模块拆分导致事件顺序变化。  
缓解：为 menu/context/paste/autosave 建立顺序测试与冒烟脚本。

---

## 7. 验收标准

1. `Editor.tsx` 仅保留编排，不含复杂业务规则。
2. 布局参数单一来源，header/footer/content/typewriter 一致消费。
3. 交互桥接逻辑集中在 integration。
4. 行为契约测试覆盖核心编辑链路。
5. 全程保持可编译、可运行、可回滚。

