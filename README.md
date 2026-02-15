# Writer 项目导航

## 项目定位
- **风格**：Typora (所见即所得、流畅) + Obsidian (本地文件管理)
- **核心原则**：无打断写作主流程优先

## 🚀 快速入口
- **任务看板**：[docs/current/任务看板.md](docs/current/任务看板.md) (当前进度: Step F)
- **工程蓝图**：[docs/frozen/ENGINEERING_BLUEPRINT.md](docs/frozen/ENGINEERING_BLUEPRINT.md)
- **评审记录**：[docs/archive/ENGINEERING_BLUEPRINT_REVIEW.md](docs/archive/ENGINEERING_BLUEPRINT_REVIEW.md)

## 📚 文档索引 (Docs)

### 00. 冻结基线 (Frozen)
> 不应随意变更的约束文档
- [产品需求 (PRD)](docs/frozen/PRD_V1.md)
- [技术基线 (Tech)](docs/frozen/TECH_BASELINE.md)
- [设计基线 (Design)](docs/frozen/DESIGN_BASELINE.md)
- [范围冻结 (Scope)](docs/frozen/SCOPE_FREEZE_V1.md)
- [工程蓝图 (Blueprint)](docs/frozen/ENGINEERING_BLUEPRINT.md)

### 01. 活跃文档 (Current)
> 当前开发阶段工作文档
- [任务看板](docs/current/任务看板.md)
- [Sprint 1 任务拆分](docs/current/Sprint1任务拆分.md)
- [V1 完成标准](docs/current/V1完成标准.md)
- [V1 全阶段路线图](docs/current/V1全阶段路线图.md)
- [V1 后续需求池](docs/current/V1后续需求池.md)
- [QA 验收清单 V1](docs/current/QA_CHECKLIST_V1.md)

### 02. 归档历史 (Archive)
> 过程资产与历史记录
- [docs/archive/](docs/archive/)

---

## 🛠️ 工程结构

```
.
├── src/            # [前端] React + TipTap 源码 (待初始化)
├── src-tauri/      # [后端] Rust 宿主代码 (待初始化)
├── tests/          # [测试] E2E 与集成测试
├── spike/          # [验证] 关键技术验证 (Roundtrip)
└── docs/           # [文档] 唯一权威文档源
    ├── frozen/     # 基线
    ├── current/    # 活跃
    └── archive/    # 历史
```

## ⚠️ 注意
冻结文档 (`docs/frozen/`) 可能含历史绝对路径引用，请以当前目录结构为准。
