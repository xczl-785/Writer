# Writer 项目导航

## 项目定位

- **风格**：Typora (所见即所得、流畅) + Obsidian (本地文件管理)
- **核心原则**：无打断写作主流程优先

## 🚀 快速入口

- **需求跟踪**：[docs/current/全流程需求跟踪台账.md](docs/current/全流程需求跟踪台账.md)
- **遗留待办**：[docs/current/V3遗留与V4待办.md](docs/current/V3遗留与V4待办.md)
- **工程蓝图**：[docs/frozen/工程蓝图.md](docs/frozen/工程蓝图.md)
- **评审记录**：[docs/archive/工程蓝图评审记录.md](docs/archive/工程蓝图评审记录.md)

## 📚 文档索引 (Docs)

### 00. 冻结基线 (Frozen)

> 不应随意变更的约束文档

- [产品需求文档 V1](docs/frozen/产品需求文档_V1.md)
- [技术基线](docs/frozen/技术基线.md)
- [设计基线](docs/frozen/设计基线.md)
- [V1 范围冻结](docs/frozen/V1范围冻结.md)
- [工程蓝图](docs/frozen/工程蓝图.md)
- [产品约束](docs/frozen/产品约束.md)
- [决策日志](docs/frozen/决策日志.md)

### 01. 活跃文档 (Current)

> 当前开发阶段工作文档

- [全流程需求跟踪台账](docs/current/全流程需求跟踪台账.md)
- [V3遗留与V4待办](docs/current/V3遗留与V4待办.md)
- [结构感知方案参考](docs/current/design-block-indicator-system.md)

### 02. 归档历史 (Archive)

> 过程资产与历史记录

- [docs/archive/](docs/archive/)

---

## 🛠️ 工程结构

```
.
├── src/            # [前端] React + TipTap 源码
├── src-tauri/      # [后端] Rust 宿主代码
├── tests/          # [测试] E2E 与集成测试
├── spike/          # [验证] 关键技术验证 (Roundtrip)
└── docs/           # [文档] 唯一权威文档源
    ├── frozen/     # 基线
    ├── current/    # 活跃
    └── archive/    # 历史
```

## ⚠️ 注意

归档历史文档可能包含历史上下文或旧路径引用；执行时以 `docs/frozen/` 与 `docs/current/` 最新内容为准。
