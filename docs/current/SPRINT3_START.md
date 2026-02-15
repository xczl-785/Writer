# Sprint 3 启动入口（图片与可靠性闭环）

## 1. 阶段目标

- 阶段名称：Sprint 3
- 目标：补齐图片粘贴落盘与数据可靠性链路，确保异常情况下不丢数据、错误可见。
- 对齐依据：`docs/current/V1全阶段路线图.md`、`docs/current/V1完成标准.md`。

## 2. 本阶段范围（仅做）

1. 图片粘贴与 assets 落盘（FR-05）
2. 自动保存三策略完整化（800ms 防抖 + 失焦 + 关闭前强制保存）
3. D-009 原子写入验证（失败不破坏原文件）
4. 保存失败可见反馈闭环（不可静默失败）

## 3. 本阶段不做

1. 拖拽上传图片
2. 云端图床/外链上传
3. 搜索、标签页、多工作区
4. 表格可视化编辑

## 4. 进入 Sprint 3 前置清单（Gate）

- [ ] `docs/current/Sprint3任务拆分.md` 已冻结
- [ ] `docs/current/Sprint3图片与资源规范.md` 已冻结
- [ ] `docs/current/QA_CHECKLIST_SPRINT3.md` 已冻结
- [ ] 跨平台测试口径确认（macOS + Windows）
- [ ] 证据落盘路径确认：`docs/archive/evidence/<date>/`

## 5. 待确认项（未冻结）

1. 图片命名冲突策略：`cover.png` 重复时是否追加序号。
2. 图片格式白名单：是否允许 `gif/webp/svg`（建议 V1 只开 `png/jpg/jpeg/webp`）。
3. 单图大小上限：建议 10MB。
4. Markdown 引用路径口径：统一使用相对路径（相对当前 md 文件目录）。
5. 关闭前强制保存失败时的交互：阻止退出还是二次确认放弃保存。

## 6. 本阶段产出文档

- `docs/current/Sprint3任务拆分.md`
- `docs/current/Sprint3图片与资源规范.md`
- `docs/current/QA_CHECKLIST_SPRINT3.md`
- 阶段收尾后归档到 `docs/archive/<date>_sprint3-closeout/`
