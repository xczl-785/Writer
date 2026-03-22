# GitHub 开源迁移任务看板

本项目正从内部 Gitea 迁移至 GitHub 开源。本看板用于跟踪迁移过程中的各项任务。

## 优先级 1：基础配置与推送 (Done)

- [x] 1. 配置 GitHub 远程仓库 (Remote)
- [x] 2. 确认并执行代码及提交记录推送

## 优先级 2：开源合规与内容清理 (Done)

- [x] 1. 评估历史提交记录隐私风险 -> **决定：保留历史，仅清理当前树**
- [x] 2. 清理/重构 `docs/` 目录 -> **已物理抽离至外层文件夹并从 Git 移除**
- [x] 3. 移除根目录下的 `当前Bug统计.md` 和 `菜单项遗留.md`

## 优先级 3：开源门面建设 (In Progress)

- [x] 1. 重新编写对外发布的 `README.md` (包含项目截图、特性列表、多端下载指引、开发指南)
- [x] 2. 增加英文版 `README-en.md` (可选但推荐)
- [ ] 3. 制定贡献指南 `CONTRIBUTING.md`
- [ ] 4. 配置 GitHub Issue / PR 模板 (`.github/ISSUE_TEMPLATE/` 等)

## 优先级 4：日后开发链路与文档管理重构 (AI Agent 工作流)

- [x] 1. 建立双仓联动机制：将 `Writer-Docs-Internal` 初始化为独立的内部 Gitea 仓库
- [x] 2. 在工程根目录建立 `.agent-workspace` 或编写 `AI-INSTRUCTIONS.md`，显式指导 AI Agent 如何在跨越 `Writer/` 和 `Writer-Docs-Internal/` 两个目录时进行文档拉取、阅读与更新
- [x] 3. 梳理双重推送策略：代码推 GitHub（开源分支），同时推 Gitea（作为备份），文档只推 Gitea

## 优先级 5：GitHub 远程仓库基础设施建设

- [ ] 1. **About/Topics 设置**：优化仓库主页侧边栏，增加标签以便开发者搜索
- [ ] 2. **分支保护规则 (Branch Protection)**：锁定 main 分支，防止意外的 Force Push，保护开源核心资产
- [ ] 3. **Labels 体系建立**：规范化 Issue 标签（如 `bug`, `enhancement`, `good first issue`）以便外部贡献者认领任务
- [ ] 4. **Discussions 开启**：为非 bug 类的用户提问、功能讨论提供专门的论坛版块
- [ ] 5. **GitHub Actions / Releases**：配置自动化构建流水线，为普通用户提供编译好的 .exe 或跨平台安装包
- [ ] 6. **Dependabot 开启**：自动检测依赖漏洞并提供升级 PR
