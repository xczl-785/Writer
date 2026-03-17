# 架构图自动生成体系

从源代码自动生成 PlantUML 架构图，帮助快速理解项目结构。

**零配置**：自动扫描 `src/` 目录，按目录结构划分模块。

---

## 快速使用

```bash
npm run uml:gen              # 全量生成
npm run uml:gen -- --module domains/file  # 只生成指定模块
```

---

## 目录结构

```
generated/
├── auto/                    # 自动生成，CI 更新
│   ├── domains/             # 领域模块
│   ├── services/            # 服务层
│   ├── state/               # 状态管理
│   ├── ui/                  # UI 组件
│   └── modules.puml         # 模块关系总图
│
└── overlay/                 # 人工标注（可选）
    └── notes/               # 设计意图说明
```

---

## 自动扫描规则

1. **模块划分**：`src/` 下的二级目录自动成为模块
   - `src/domains/file/` → `domains/file` 模块
   - `src/services/error/` → `services/error` 模块
   - `src/state/` → `state` 模块（无二级目录时用一级目录）

2. **排除文件**：自动排除测试文件和类型声明
   - `*.test.ts`、`*.test.tsx`
   - `*.d.ts`

3. **忽略关系**：自动忽略常见 React 类型
   - `React.FC`、`React.ReactNode` 等

---

## 查看图表

### 方式一：在线渲染

将 `.puml` 文件内容粘贴到 [PlantUML Online](https://www.plantuml.com/plantuml/uml)

### 方式二：IDE 插件

- VS Code: 安装 PlantUML 插件，直接预览

---

## 核心规则（AI 需要知道）

### 1. 节点标识符

格式：`{模块名}/{类名}`，例如 `domains/file/FileService`

### 2. 关系类型

- `<|--` 继承
- `<|..` 实现
- `-->` 依赖（属性类型、方法返回类型）

### 3. 更新时机

- CI 自动更新：merge 到 main 分支时
- 手动更新：`npm run uml:gen`

---

## 可选配置

如需自定义，创建 `uml-config.yaml`：

```yaml
# 排除特定文件
exclude:
  - src/legacy/.*

# 忽略的关系类型
ignore_relations:
  - SomeType

# 合并多个目录为一个模块
merge_modules:
  ui:
    - sidebar
    - chrome
    - statusbar
```

---

## FAQ

**Q: 图过时了怎么办？**
A: 运行 `npm run uml:gen` 或等待 CI 自动更新。

**Q: 某个模块没有生成？**
A: 该模块可能没有类或接口。脚本只提取类和接口。

**Q: 如何添加设计意图说明？**
A: 编辑 `overlay/notes/*.puml`，使用 PlantUML note 语法。
