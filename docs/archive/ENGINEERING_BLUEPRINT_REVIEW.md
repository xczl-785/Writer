# Engineering Blueprint 严格评审报告

## 1. 评审结论：⚠️ 有条件通过

Blueprint 整体可用，模块划分合理、数据流清晰、与上游冻结约束一致性良好。但存在 **2 个阻断级问题** 和若干中等问题，必须在进入 Step E 前修正。

---

## 2. 高优先级问题清单

### P0-1｜D-007 Roundtrip Spike **未执行**，仅有"计划"
| 维度 | 内容 |
|---|---|
| **风险说明** | Blueprint §9.1 只定义了 Spike 的目标和通过标准，但 **没有可执行的 Spike 脚本/用例/报告产物**。`find_by_name *spike*` 在整个仓库中结果为 0 文件，`src/` 目录不存在。DECISIONS_LOG D-007 明确写道"未通过不得进入 Step E"。 |
| **影响范围** | **Step D→E 门禁直接不通过**。若 TipTap roundtrip 有不可接受的语义丢失，后续所有编辑器相关任务都要推翻。 |
| **修正建议** | ① 创建 `spike/roundtrip/` 目录，内含最小 TipTap + `markdown-it`/`prosemirror-markdown` 脚本；② 定义 4 组断言用例（标题 H1-H6、有序/无序列表嵌套、围栏代码块含语言标识、`![alt](path)` 图片引用）；③ 在进入 Step E 前运行并把结果写入 `docs/archive/SPIKE_ROUNDTRIP_REPORT.md`。预估 2-4 小时。 |

### P0-2｜Markdown 序列化/反序列化方案 **完全缺失**
| 维度 | 内容 |
|---|---|
| **风险说明** | Blueprint 定义了 `FsService.readFile → string` 和 `editor.load(content)`，但 **完全没有提到 Markdown ↔ ProseMirror JSON 的转换层**（用什么库？remark-parse？prosemirror-markdown？unified？）。这是编辑器核心管道，不能留到 Step E 再决策。 |
| **影响范围** | `editor` 模块、`autosave`（content 参数到底是 MD 字符串还是 JSON？）、Roundtrip Spike 本身。 |
| **修正建议** | 在 Blueprint §5 新增 `MarkdownService` 接口，至少定义 `parse(md: string): EditorJSON` 和 `serialize(doc: EditorJSON): string`，并在 Spike 中验证选型。 |

### P1-1｜`autosave.schedule` 的 `content` 类型语义不明
| 维度 | 内容 |
|---|---|
| **风险说明** | `AutosaveService.schedule(path, content: string)` 中 content 是原始 Markdown 还是编辑器 JSON？若是 JSON，则 autosave 需依赖序列化层；若是 MD，则序列化时机在 editor 内完成。Blueprint 未指定此边界。 |
| **影响范围** | `editor ↔ autosave` 职责分界、异常处理粒度。 |
| **修正建议** | 明确约定：**autosave 接收的始终是已序列化的 Markdown 字符串**，序列化由 `editor`（或 MarkdownService）在调用 `schedule` 前完成。在 Blueprint 中一句话注明即可。 |

### P1-2｜文件切换时的"脏数据"处理路径未定义
| 维度 | 内容 |
|---|---|
| **风险说明** | §6.2 "选择文件"流程直接走 `readFile → editor.load`，未提及当前文档若有未保存变更应如何处理（强制 flush？丢弃？）。结合 PRD FR-06 "关闭再打开修改仍存在"的验收标准，这是必须在 Blueprint 层面定义的边界行为。 |
| **影响范围** | `filetree.select → autosave.flush → editor.load` 链路。 |
| **修正建议** | 在 §6.2 第 1 步和第 2 步之间插入：`if (dirty) autosave.flush(currentPath, currentContent)`，明确先保存再切换。 |

### P1-3｜"关闭前强制保存"的 Tauri 生命周期 Hook 未指定
| 维度 | 内容 |
|---|---|
| **风险说明** | §3.6 autosave 职责写了"关闭前强制保存"，但 Tauri 2 的窗口关闭 hook 是 `tauri::WindowEvent::CloseRequested`（Rust 侧）结合前端 `beforeunload`，行为差异可能导致保存不可靠。Blueprint 未指定用哪个 hook、是否允许阻塞关闭。 |
| **影响范围** | 数据安全（核心约束）。 |
| **修正建议** | 在 §6.3 或 §3.6 补充一句："关闭前保存通过 Tauri `WindowCloseRequested` 事件 + 前端 `beforeunload` 双保险实现，任一触发即 `flush`，阻塞关闭直到写入完成或超时（≤ 3s）"。 |

### P2-1｜`FsService.deleteFile` 仅支持文件，缺少 `deleteDir`
| 维度 | 内容 |
|---|---|
| **风险说明** | V1 虽然 PRD 只说"文件删除"，但如果用户在文件树新建了子目录（文件会在子目录下），删除空目录的需求隐含存在。当前接口缺少 `deleteDir`。 |
| **影响范围** | 低，V1 可能不触发，但接口定义层应预留。 |
| **修正建议** | 将 `deleteFile` 改名为 `deletePath` 或者在不改动 V1 实现的前提下在接口注释中标注 "V1 仅实现文件删除"。 |

### P2-2｜`ImageService` 缺少文件名碰撞重试与失败事件
| 维度 | 内容 |
|---|---|
| **风险说明** | PRODUCT_CONSTRAINTS §5.2 明确提到"文件名碰撞时自动重试生成新后缀"、"失败时给出可见错误提示"。Blueprint §5.3 `ImageService` 接口太简单，没有体现重试和失败通知机制。 |
| **影响范围** | 图片粘贴可靠性。 |
| **修正建议** | `saveClipboardImage` 返回类型可不变，但在 Blueprint 注释中补充：①内部自动重试 ≤3 次；②失败抛出含类型的异常，由 editor 捕获并派发 `IMAGE_PASTE_FAILED` 事件。 |

---

## 3. 架构边界检查

### 3.1 模块职责清晰度：✅ 良好
- 9 个模块职责单一，命名与内容基本一致。
- `services/` 三个子模块（fs/autosave/images）是正确的分层。
- `state` 采用 Zustand slice 模式，职责收敛。

### 3.2 跨层耦合风险：⚠️ 中等

| 风险点 | 说明 |
|---|---|
| `editor → services/autosave` 直接依赖 | 可接受，但需注意 editor 不应直接调用 `FsService`，应通过 autosave 间接写；Blueprint 未明文禁止。建议加一条规则。 |
| `ui → state`（只读 + 事件分发） | "事件分发" 含义模糊：如果 UI 直接调用 `filetree.select()` 这种命令式操作，它到底走 state action 还是直接调用 service？建议统一为 "UI 通过 state action 间接调用 service"。 |

### 3.3 接口支撑力：✅ 基本够

V1 Must 12 全部能映射到现有模块 and 接口。后续扩展（搜索、导出）只需新增 `services/search`、`services/export`，不侵入现有模块。`DocumentFeature` 注册机制为代码块、图片等能力提供了内部扩展点。

唯一缺口是 **Markdown 序列化层**（见 P0-2），补上即可。

---

## 4. 门禁检查

### D-007 Roundtrip Spike

| 检查项 | 状态 |
|---|---|
| 目标定义 | ✅ 已定义（语义保持） |
| 覆盖范围 | ✅ 四类（标题/列表/代码块/图片引用） |
| 通用标准 | ✅ 语义一致，允许空白微差异 |
| 失败处理 | ✅ 进入备选内核评估 |
| **可执行性** | ❌ **不可执行**——没有脚本、没有用例文件、没有执行报告模板 |

**最小补充项：**
1. 创建 `spike/roundtrip/roundtrip.test.ts`，包含 ≥4 组 `.md → TipTap Doc → .md` 断言用例
2. 创建 `spike/roundtrip/README.md`，说明运行方式
3. 创建 `docs/archive/SPIKE_ROUNDTRIP_REPORT.md`（模板），包含：执行日期、结果（通过/未通过）、差异截图/文本

### D-009 原子写入

| 检查项 | 状态 |
|---|---|
| 流程定义 | ✅ temp → flush → rename |
| 失败要求 | ✅ 不破坏原文件 |
| 可执行性 | ⚠️ 基本可执行，但未指定 temp 文件命名约定（建议 `{target}.tmp.{random}`，避免幽灵文件残留） |

**最小补充项：**
1. 在 Blueprint §9 D-009 中补充 temp 文件命名规则
2. 补充清理策略：启动时扫描并清理残留 `.tmp.*` 文件（可选，标注为 "建议但不阻塞 Step E"）

---

## 5. 是否允许进入 Step E

### 结论：❌ 当前不允许，需完成以下 3 个阻断项后方可进入

| # | 阻断项 | 预估工时 | 产物 |
|---|---|---|---|
| 1 | **执行 D-007 Roundtrip Spike** 并产出报告 | 2-4h | `spike/roundtrip/` + `SPIKE_ROUNDTRIP_REPORT.md` |
| 2 | **补充 MarkdownService 接口定义** 到 Blueprint §5 | 0.5h | Blueprint 更新 |
| 3 | **补充文件切换脏数据处理 + autosave content 类型约定** | 0.5h | Blueprint §6.2 / §5.2 更新 |

### 进入 Step E 条件：
1. 上述 3 项全部完成
2. Roundtrip Spike 报告结论为 **通过**
3. Blueprint 更新版经一次快速复审确认无新增阻断项

---

## 6. 最小改动建议

以下是 **必须改的最小变更列表**（按优先级排序），不涉及大改重构：

| # | 改动位置 | 改动内容 |
|---|---|---|
| 1 | Blueprint §5 新增 §5.4 | 新增 `MarkdownService` 接口：`parse(md) → EditorJSON`、`serialize(doc) → string` |
| 2 | Blueprint §5.2 | 在 `AutosaveService.schedule` 注释中明确：`content` 参数为已序列化的 Markdown 字符串 |
| 3 | Blueprint §6.2 | 在步骤 1-2 之间插入：`if (dirty) await autosave.flush(currentPath, currentContent)` |
| 4 | Blueprint §6.3 | 末尾补充关闭前保存的 Tauri hook 说明（`WindowCloseRequested` + `beforeunload` 双保险） |
| 5 | Blueprint §9.1 | D-007 补充"可执行产物清单"：spike 脚本路径 + 报告模板路径 |
| 6 | Blueprint §9.2 | D-009 补充 temp 文件命名规则 `{target}.tmp.{random}` |
| 7 | 新建 `spike/roundtrip/` | 可执行 Spike 脚本 + README + 报告模板 |

---

**总结：Blueprint 质量在 80 分水平，模块设计与约束对齐做得好，但核心管道（Markdown 序列化）缺失和 Spike 未执行是硬伤。修完上面 7 项（预估半天工作量）即可安全进入 Step E。**
