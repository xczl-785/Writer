# Markdown 语法完全指南

> 调研日期：2026年2月27日
> 数据来源：Markdown Guide、CommonMark Spec、GitHub Flavored Markdown 规范

---

## 一、概述

Markdown 是一种轻量级标记语言，由 John Gruber 于 2004 年创建。它允许人们使用易读易写的纯文本格式编写文档，然后转换为结构化的 HTML。

本文档全面梳理了 Markdown 的所有语法类型，共计 **32 种核心语法**。

---

## 二、基础语法（11 种）

> 来源：John Gruber 原始设计文档
> 兼容性：所有 Markdown 应用程序均支持

### 1. 标题（Headings）

**ATX 式**（推荐）：
```markdown
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
```

**Setext 式**（仅支持 H1 和 H2）：
```markdown
一级标题
========

二级标题
--------
```

### 2. 粗体（Bold）

```markdown
**bold text**
__bold text__
```

### 3. 斜体（Italic）

```markdown
*italicized text*
_italicized text_
```

**粗体+斜体组合**：
```markdown
***bold and italic***
**_bold and italic_**
```

### 4. 引用块（Blockquote）

```markdown
> blockquote
> 
> 第二段引用
>
> > 嵌套引用
```

### 5. 有序列表（Ordered List）

```markdown
1. First item
2. Second item
3. Third item
   1. Indented item
```

### 6. 无序列表（Unordered List）

```markdown
- First item
- Second item
- Third item

* 或使用星号
+ 或使用加号
```

### 7. 行内代码（Code）

```markdown
`code`
```

### 8. 代码块（Code Block）

**原始方式**（缩进 4 空格或 1 Tab）：

    这是一个代码块

### 9. 分割线（Horizontal Rule）

```markdown
---

***

___
```

### 10. 链接（Link）

**行内链接**：
```markdown
[link text](https://www.example.com)
[link text](https://www.example.com "title")
```

**引用式链接**：
```markdown
[link text][ref]

[ref]: https://www.example.com
```

### 11. 图片（Image）

```markdown
![alt text](image.jpg)
![alt text](image.jpg "title")
```

**带链接的图片**：
```markdown
[![alt text](image.jpg)](https://www.example.com)
```

---

## 三、扩展语法（13 种）

> 来源：GFM、CommonMark、Markdown Extra 等
> 兼容性：部分应用程序支持

### 12. 表格（Table）

```markdown
| Syntax | Description |
| ----------- | ----------- |
| Header | Title |
| Paragraph | Text |
```

**对齐方式**：
```markdown
| Left | Center | Right |
| :--- | :---: | ---: |
| 左对齐 | 居中 | 右对齐 |
```

### 13. 围栏代码块（Fenced Code Block）

```markdown
```
{
  "firstName": "John",
  "lastName": "Smith"
}
```
```

**语法高亮**：
```markdown
```json
{
  "name": "John"
}
```
```

### 14. 脚注（Footnote）

```markdown
Here's a sentence with a footnote.[^1]

[^1]: This is the footnote.
```

### 15. 标题 ID（Heading ID）

```markdown
### My Great Heading {#custom-id}
```

**链接到标题**：
```markdown
[Heading IDs](#custom-id)
```

### 16. 定义列表（Definition List）

```markdown
First Term
: This is the definition of the first term.

Second Term
: This is one definition.
: This is another definition.
```

### 17. 删除线（Strikethrough）

```markdown
~~The world is flat.~~
```

### 18. 任务列表（Task List）

```markdown
- [x] Write the press release
- [ ] Update the website
- [ ] Contact the media
```

### 19. Emoji

**方式一：复制粘贴**
```markdown
That is so funny! 😂
```

**方式二：短代码**
```markdown
That is so funny! :joy:
```

### 20. 高亮/标记（Highlight）

```markdown
I need to highlight these ==very important words==.
```

### 21. 下标（Subscript）

```markdown
H~2~O
```

### 22. 上标（Superscript）

```markdown
X^2^
```

### 23. 自动链接（Automatic URL Linking）

```markdown
http://www.example.com

<http://www.example.com>
```

### 24. 禁用自动链接

```markdown
`http://www.example.com`
```

---

## 四、特殊语法元素（8 种）

### 25. 引用式链接定义

```markdown
[link text][ref]

[ref]: https://www.example.com "Optional Title"
```

### 26. HTML 块

```markdown
<div>
  This is a <strong>HTML block</strong>.
</div>
```

### 27. 行内 HTML

```markdown
This is <span style="color:red">red text</span> in a paragraph.
```

### 28. 硬换行

**方式一**：行末双空格
```markdown
First line  
Second line
```

**方式二**：反斜杠
```markdown
First line\
Second line
```

### 29. 软换行

```markdown
First line
Second line
```
（渲染为一个空格）

### 30. 转义字符

```markdown
\* Not italic \*
\# Not a heading
\[ Not a link \]
```

**可转义字符**：
```
\ ` * _ { } [ ] ( ) # + - . ! | 
```

### 31. 实体引用

```markdown
&amp;  → &
&lt;   → <
&gt;   → >
&quot; → "
&#123; → {
```

### 32. 表格对齐

```markdown
| 左对齐 | 居中 | 右对齐 |
| :--- | :---: | ---: |
| 内容 | 内容 | 内容 |
```

---

## 五、Markdown 变体对照表

| 变体 | 特有语法 | 主要应用场景 |
|---|---|---|
| **GFM** | 表格、任务列表、删除线、自动链接、围栏代码块 | GitHub、GitLab |
| **CommonMark** | 规范化的所有基础语法 + 围栏代码块 | 通用标准化 |
| **Markdown Extra** | 表格、定义列表、脚注、缩写 | PHP 应用 |
| **MultiMarkdown** | 脚注、表格、数学公式、交叉引用、元数据 | 学术写作 |
| **Pandoc Markdown** | 数学公式、引用、YAML 元数据 | 文档转换 |
| **Obsidian** | 双向链接 `[[note]]`、嵌入 `![[note]]`、高亮、标签 | 知识管理 |
| **R Markdown** | 代码块选项 `{r}`、YAML 头部 | 数据分析报告 |
| **Notion Markdown** | 数据库视图、Callout、Toggle | 项目管理 |

---

## 六、语法统计汇总

| 类别 | 数量 | 说明 |
|---|:---:|---|
| **基础语法** | 11 种 | 原始规范，全平台通用 |
| **扩展语法** | 13 种 | GFM 等扩展，需确认支持 |
| **特殊元素** | 8 种 | 高级用法 |
| **总计** | **32 种** | - |

---

## 七、最佳实践建议

1. **标题**：始终在 `#` 和标题名之间加空格
2. **列表**：嵌套列表使用 2-4 空格缩进
3. **链接**：优先使用引用式链接保持正文整洁
4. **代码块**：优先使用围栏代码块（更易读）
5. **换行**：段落间使用空行分隔
6. **兼容性**：不确定时测试目标平台的支持情况

---

---

## 八、文字颜色支持情况

### 1. Markdown 是否支持文字颜色？

#### ❌ 原生 Markdown：不支持

**结论明确**：原始 Markdown 规范（John Gruber 设计）**没有内置文字颜色语法**。

官方立场：
> "Markdown's syntax is intended for one purpose: to be used as a format for writing for the web. Markdown is not a replacement for HTML."
>
> —— Markdown 语法设计初衷是简化写作，而非替代 HTML

#### ✅ 变通方法：HTML 内联

由于 Markdown 支持嵌入 HTML，可以通过以下方式实现：

```markdown
<span style="color:red">红色文字</span>
<span style="color:blue">蓝色文字</span>
<span style="color:#FF5733">自定义十六进制颜色</span>
<span style="color:rgb(255,0,0)">RGB颜色</span>
```

**支持的 CSS 颜色格式**：
- 颜色名称：`red`、`blue`、`green` 等
- 十六进制：`#FF5733`、`#333` 等
- RGB：`rgb(255,0,0)`
- RGBA：`rgba(255,0,0,0.5)`

---

### 2. Markdown 编辑器颜色支持对照表

| 编辑器 | 原生颜色语法 | HTML支持 | 特殊方法 | 说明 |
|---|:---:|:---:|---|---|
| **GitHub / GFM** | ❌ | ❌ | 无 | HTML 标签被安全过滤 |
| **GitLab** | ❌ | ❌ | 无 | 同 GitHub |
| **Stack Overflow** | ❌ | ❌ | 无 | 同 GitHub |
| **Typora** | ❌ | ✅ | HTML 标签 | 支持 `<span style>` |
| **Obsidian** | ❌ | ✅ | HTML + CSS snippets | 可用插件扩展 |
| **Notion** | ✅ | ❌ | GUI 颜色选择器 | 非 Markdown 语法，导出丢失 |
| **R Markdown** | ❌ | ✅ | HTML + LaTeX | PDF 用 `\textcolor{}{}` |
| **Pandoc** | ❌ | ✅ | HTML + LaTeX | 多格式输出支持 |
| **VS Code Preview** | ❌ | ✅ | HTML 标签 | 预览支持 HTML |
| **Jupyter Notebook** | ❌ | ✅ | HTML 标签 | 支持 `<span style>` |
| **Docsify** | ❌ | ✅ | HTML 标签 | 支持 `<span style>` |
| **VuePress** | ❌ | ✅ | HTML 标签 | 支持 `<span style>` |

---

### 3. 各编辑器详细说明

#### Typora

- **无原生颜色语法**（[GitHub Issue #472](https://github.com/typora/typora-issues/issues/472) 已确认）
- 支持内联 HTML：
  ```markdown
  <span style="color:red">红色文字</span>
  ```
- 可通过自定义 CSS 主题改变全局样式
- 用户长期请求此功能，开发者尚未添加

#### Obsidian

- **无原生颜色语法**
- 支持内联 HTML：
  ```markdown
  <span style="color:#ff6b6b">彩色文字</span>
  ```
- 可通过 **CSS snippets** 自定义样式类
- 插件生态：`Highlightr` 等插件提供颜色功能

#### Notion

- **有原生颜色支持**（但不是 Markdown 语法）
- 操作方式：选中文本 → 点击工具栏颜色按钮
- 支持的颜色：默认、灰色、棕色、橙色、黄色、绿色、蓝色、紫色、粉色、红色
- ⚠️ 导出为 Markdown 时，颜色信息**会丢失**

#### R Markdown / Pandoc

**HTML 输出**：
```markdown
<span style="color:red">红色文字</span>
```

**PDF 输出（需要 LaTeX）**：
```markdown
---
output: pdf_document
---

Roses are \textcolor{red}{red}, violets are \textcolor{blue}{blue}.
```

需要在 YAML 头部添加：
```yaml
header-includes:
  - \usepackage{xcolor}
```

#### GitHub / GitLab / Stack Overflow

- **完全不支持**文字颜色
- 出于安全考虑（XSS 防护），所有 HTML 标签会被过滤移除
- 这是大多数技术文档平台的标准做法
- 即使使用 HTML 语法也会被忽略

---

### 4. 最佳实践建议

| 场景 | 推荐方案 |
|---|---|
| **本地编辑预览** | 使用 `<span style="color:颜色值">文字</span>` |
| **GitHub 文档** | 无法使用颜色，考虑用代码高亮或表格替代 |
| **Notion** | 使用 GUI 颜色功能 |
| **R Markdown PDF** | 使用 LaTeX `\textcolor{}{}` |
| **Obsidian** | HTML + CSS snippets 或插件 |

---

### 5. 总结

| 问题 | 答案 |
|---|---|
| Markdown 有原生颜色语法吗？ | ❌ 没有 |
| 能否在 Markdown 中显示颜色？ | ✅ 可以，通过 HTML 内联 |
| 所有编辑器都支持吗？ | ❌ 不，GitHub/GitLab 等会过滤 HTML |
| 哪个编辑器原生支持？ | Notion（GUI 方式，非 Markdown 语法） |
| 最通用的方法？ | `<span style="color:颜色值">文字</span>` |

---

## 参考资源

- [Markdown Guide](https://www.markdownguide.org/)
- [CommonMark Spec](https://spec.commonmark.org/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [Daring Fireball: Markdown](https://daringfireball.net/projects/markdown/)

---

*文档生成时间：2026-02-27*