# Sprint 3 图片与资源规范（冻结草案）

## 1. 目标

定义图片粘贴（FR-05）在 V1 的统一行为，避免平台差异与路径混乱。

## 2. 支持范围

### 2.1 输入来源

1. 编辑器内直接粘贴截图/图片（Cmd/Ctrl + V）
2. 粘贴板中含图片二进制数据

### 2.2 文件格式白名单

- `image/png`
- `image/jpeg`
- `image/webp`

不支持：`svg/gif/tiff/heic`（V1 不做）

### 2.3 大小限制

- 单图上限：10MB
- 超限行为：拒绝落盘 + 状态栏显示明确错误

## 3. 落盘规则

### 3.1 存储目录

- 统一存储到：`<workspace>/assets/`
- 可选分层：`assets/YYYY-MM/`（V1 默认不开分层，直接 `assets/`）

### 3.2 文件命名

- 基础名：`image-YYYYMMDD-HHmmss`
- 后缀：按 mime 映射（png/jpg/webp）
- 重名冲突：追加 `-1`, `-2`...

### 3.3 原子写要求

- 图片写入同样走安全写策略（临时文件 + rename）
- 写入失败不得留下损坏半文件

## 4. Markdown 引用规则

### 4.1 引用格式

- 使用标准 markdown：`![alt](relative/path)`

### 4.2 路径口径

- 统一使用相对路径（相对当前编辑文件所在目录）
- 示例：当前文件在 `notes/a.md`，图片在 `assets/img.png`，则插入 `../assets/img.png`

### 4.3 文本插入位置

- 插入到当前光标位置
- 若当前行为空，直接插入图片行

## 5. 错误反馈规范

1. 不支持格式：`Unsupported image format`
2. 超过大小：`Image is too large (max 10MB)`
3. 落盘失败：`Failed to save image`
4. 路径计算失败：`Failed to insert image reference`

所有错误必须在状态栏可见，不允许静默失败。

## 6. 跨平台约束

1. 路径统一使用 `/` 写入 markdown
2. 磁盘路径计算允许平台分隔符，但输出 markdown 必须规范化
3. Windows 文件锁冲突需给出可见错误

## 7. 非目标（Sprint 3 不做）

1. 拖拽上传
2. 图片压缩/转码
3. EXIF 处理
4. 远程上传
