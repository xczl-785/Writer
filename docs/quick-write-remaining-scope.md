# 随手写剩余功能与收尾清单

更新日期：2026-07-04

适用范围：Writer V5 随手写 App shell 收尾阶段。本文只整理剩余功能、验收项和裁决项，不作为 capability current rules 的替代。

## 当前判断

随手写的主体功能实现链路已经推进到 V5.7 并收口。当前 V5.8 的重点不应继续扩功能，而应完成验收、瘦身、必要小修复、平台确认和文档 closeout。

当前状态可概括为：

- 产品主功能基本完成。
- V5.8 仍有收尾工作未完成。
- 部分 V5.8 项不是用户功能，而是平台 QA、回归验证、文档证据或后续能力裁决。
- 不应把图片完整资产管理、完整 i18n 治理、可控 HTML-to-PDF 后端等默认塞进当前完成口径。

## 已完成的功能范围

### 独立产品壳

- 独立 QuickWrite 入口。
- 不进入 Writer workspace shell。
- 不引入 workspace、file tree、recent、tabs、草稿箱作为主流程。
- QuickWrite Tauri 配置已存在：`src-tauri/tauri.quick-write.conf.json`。

### 单文档写作主链路

- 启动即写。
- 单文档 session。
- 临时草稿自动保存。
- 临时草稿恢复。
- 打开已有 Markdown 文件。
- 保存到普通 Markdown 文件。
- file-backed 状态下保存回 sourcePath。
- pending save / save error / close protection 的主链路。

### UI、菜单与状态

- 最小 QuickWrite UI。
- 精简菜单入口。
- 草稿/文件状态提示。
- 不带 workspace 文件树和多 tab。

### 编辑体验复用

- 复用 Writer Markdown 编辑基础体验。
- 复用设置继承的必要子集。
- 复用基础格式命令。
- find/replace 已进入功能面，但 query 变化后的 active match 规则仍需 V5.8 收口。

### 多窗口与桌面能力

- 新想法通过新窗口/新实例承载。
- native menu 到 QuickWrite 的事件路由已建立。
- 系统托盘快速唤起已进入 V5.7。
- 全局快捷键新想法已进入 V5.7。

### 已规划增强

- 模板化新临时文档。
- 编辑命令面补齐。
- link/table 插入。
- HTML 导出闭环。
- 系统打印/PDF 路线。

## 剩余收尾项

### 必须完成后才能 close V5

1. 自动化回归基线
   - QuickWrite/workspace 污染静态检查。
   - QuickWrite 定向 Vitest。
   - src-tauri TypeScript 行为测试覆盖口径。
   - Rust/Tauri 行为检查。
   - `lint`、`test`、`build` 结果记录。

2. 产品主链路验收
   - 启动即写。
   - 临时草稿保存与恢复。
   - 打开已有文件。
   - 保存到。
   - 保存回 sourcePath。
   - 多窗口独立纸张。
   - 关闭保护。
   - 增强能力不打断主流程。

3. 危险编辑语义收口
   - editorState 恢复需要补强具体 selection anchor/head 与 scroll restore 证据。
   - find/replace query 变化后 active match 规则需要定稿并验证。
   - replace one 不应沿用旧 ordinal 导致误替换。

4. 打包与平台验收
   - QuickWrite Tauri productName / identifier / window / icon / updater 配置。
   - QuickWrite 不抢 `.md` / `.markdown` 文件关联。
   - Writer 文件关联不被污染。
   - native menu 在 QuickWrite 下不出现 workspace 命令。
   - 多窗口 focused event 行为。
   - 系统托盘真实平台行为。
   - 全局快捷键真实平台行为。
   - 系统打印/保存 PDF 路径与取消/失败行为。
   - PDF 版式基本验收。

5. 文档与 RouteLedger closeout
   - capability 文档回写。
   - 随手写需求/决策/版本划分文档回写。
   - V5.8 residual audit。
   - V5 父容器 closeout 证据。

## 需要裁决的边界项

这些项不应默认视为随手写当前必须交付的用户功能。

| 项目 | 当前建议 | 说明 |
| --- | --- | --- |
| HTML 导出无扩展路径自动补 `.html` | 倾向本轮小修 | 小修范围清晰，用户可见，适合 V5.8 收尾 |
| 可控 HTML-to-PDF 后端 | 倾向后续版本裁决 | 当前已有系统打印/PDF 路线；后端 PDF 涉及依赖、体积、跨平台维护 |
| 图片插入与 relative path resolver 完整支持 | 倾向后续版本 | 随手写当前核心是单文档 Markdown 写作，不应引入 workspace/file tree 资产管理语义 |
| 完整 i18n 治理 | 倾向后续治理 | 当前只需保证关键入口和状态可用；全量文案治理不应阻塞主功能 close |
| 全平台深度 QA | 可分层处理 | macOS 本机可先验；Windows/Linux 若当前不可执行，应形成明确后续 QA todo |

## 建议保留的 V5.8 执行分组

V5.8 已被拆成 5 个执行段。建议把它们当作收尾分组，不再继续无节制拆版本：

1. V5.8.1 自动回归基线与 workspace 边界确认
2. V5.8.2 产品主链路与危险编辑语义收口
3. V5.8.3 导出、内容资产与语言边界裁决
4. V5.8.4 平台打包与桌面集成 QA
5. V5.8.5 文档回写与 V5 closeout 证据收口

## 明确不应继续扩大的范围

- 不把 QuickWrite 做成第二个 Writer workspace。
- 不加入 workspace file tree。
- 不加入 recent 文件系统。
- 不加入 tab 管理。
- 不加入草稿箱产品模型。
- 不为了图片支持引入 workspace 资产管理。
- 不在 V5.8 内实现可控 HTML-to-PDF 后端。
- 不在没有真实平台证据时宣称托盘、快捷键、打印完整通过。
- 不用隐藏 smoke 或局部单测替代产品主链路验收。

## 本地拉起指令

浏览器形态：

```bash
cd /Users/zhengpanpan/Program/Writer/Writer
npm run dev:quick-write
```

桌面 Tauri 形态：

```bash
cd /Users/zhengpanpan/Program/Writer/Writer
npm run tauri:quick-write:dev
```

打包命令：

```bash
cd /Users/zhengpanpan/Program/Writer/Writer
npm run tauri:quick-write:build
```

说明：浏览器形态适合快速看 UI 和 Web 交互；桌面 Tauri 形态才覆盖 native menu、托盘、全局快捷键、系统打印等桌面能力。
