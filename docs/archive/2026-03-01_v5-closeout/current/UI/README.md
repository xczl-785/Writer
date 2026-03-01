# UI 团队工作记录 (README)

**设计代理**: Artistry (UI/UX)
**状态**: ✅ V5 阶段资产均已产出并移交完毕。

## 目录索引
该目录下存放了供 **Project Owner** 与 **Dev Team** 使用的视觉规范和交互边界：

1. [`UI_UX规范.md`](./UI_UX规范.md) - 定义跨平台的 Neutral Modern 准则体系、鼠标交互时长。
2. [`组件规范.md`](./组件规范.md) - 对应 Tailwind CSS 的色板、描边厚度和圆角字典。
3. [`prototypes/`](./prototypes/) - 提供了核心 4 大界面的高保真 HTML 组件以供研发直接拷贝。

## 移交说明

请 **Oracle (前端架构师)** 在下一阶段设计 `src/ui/` 组件划分时，直接映射 [`组件规范.md`](./组件规范.md) 里的变量；
请 **Deep (前端工程师)** 在开发诸如状态栏 `<StatusBar />` 或右键 `<ContextMenu />` 组件时，直接复制提取 `prototypes/*.html` 内标注的类名即可高度还原无打断体验。
