# Menu Extensions Spike

## 目标

验证 TipTap 编辑器的右键菜单与选区浮动菜单扩展能力。

## 验证范围

### 1. Context Menu (右键菜单)

- ProseMirror Plugin 拦截 `contextmenu` 事件
- 根据点击位置/选区状态显示不同菜单项
- 菜单项动态注册机制
- 键盘导航支持

### 2. Bubble Menu (选区浮动菜单)

- `@tiptap/extension-bubble-menu` 集成
- 选中文本时自动显示
- 定位逻辑 (上方/下方自适应)
- 与 Context Menu 的互斥逻辑

## 技术方案

### 方案 A: TipTap 原生 BubbleMenu 扩展

```typescript
import { BubbleMenu } from '@tiptap/extension-bubble-menu';

const bubbleMenuExtension = BubbleMenu.configure({
  element: document.querySelector('#bubble-menu'),
  tippyOptions: {
    duration: 150,
    placement: 'top',
  },
});
```

### 方案 B: 自定义 Plugin + React Portal

```typescript
import { Plugin } from 'prosemirror-state';

const contextMenuPlugin = new Plugin({
  props: {
    handleDOMEvents: {
      contextmenu: (view, event) => {
        event.preventDefault();
        // 显示自定义菜单
        showContextMenu(event.clientX, event.clientY);
        return true;
      },
    },
  },
});
```

## 验证用例

| 用例               | 输入           | 预期结果                   |
| ------------------ | -------------- | -------------------------- |
| 选中文本后松开鼠标 | 选中文本       | Bubble Menu 在选区上方显示 |
| 选中文本后右键     | 右键点击选区   | 显示格式化菜单             |
| 空白区域右键       | 右键点击空白   | 显示插入菜单               |
| 代码块内右键       | 右键点击代码块 | 显示代码块专用菜单         |
| 表格单元格右键     | 右键点击表格   | 显示表格操作菜单           |

## 运行方式

```bash
cd spike/menu-extensions
npm install
npm run dev
```

## 判定规则

- ✅ 菜单可正常渲染并响应点击
- ✅ 根据上下文正确显示不同菜单项
- ✅ 与现有编辑器代码无冲突
- ❌ 任一核心功能不可用判定为不通过

## 输出产物

1. `spike/menu-extensions/src/` — 验证代码
2. `spike/menu-extensions/SPIKE_REPORT.md` — 验证报告
3. 推荐的技术方案决策
