# Writer 项目导航

## 项目定位

- 风格：Typora（沉浸编辑）+ Obsidian（本地文件管理）
- 核心原则：无打断写作主流程优先

## 快速入口

- 活跃跟踪：[docs/current/跟踪/全流程需求跟踪台账.md](docs/current/跟踪/全流程需求跟踪台账.md)
- 需求遗留：[docs/current/跟踪/遗留问题.md](docs/current/跟踪/遗留问题.md)
- 全局资产索引：[docs/全局资产/README.md](docs/全局资产/README.md)
- V5 归档总览：[docs/archive/2026-03-01_v5-closeout/README.md](docs/archive/2026-03-01_v5-closeout/README.md)

## 文档结构

```text
docs/
├── current/      # 当前协作与跟踪
├── 全局资产/      # 长期生效资料（产品/治理/工程）
├── archive/      # 历史归档
├── frozen/       # 历史兼容入口（已迁移）
├── standards/    # 历史兼容入口（已迁移）
└── 参考资料/      # 外部参考文档
```

## 目录说明

- `docs/current/`：当前执行文档，仅保留活跃跟踪内容。
- `docs/全局资产/`：跨版本长期生效的基线与规范。
- `docs/archive/`：版本闭环、评审与证据归档。
- `docs/参考资料/`：参考手册与外部知识，不作为约束基线。

## 工程结构

```text
.
├── src/            # 前端（React + TipTap）
├── src-tauri/      # 后端（Rust + Tauri）
├── docs/           # 文档主目录
├── scripts/        # 脚本工具
└── tests/          # 测试（如存在）
```
