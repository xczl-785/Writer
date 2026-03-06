# REQ-EDITOR-TOP-GAP 顶部间距需求

## 1. 目标

规范编辑区正文第一行与顶部 UI（Header / 面包屑 / 查找面板）的垂直关系，保证不同视口档位与模式下视觉节奏稳定。

## 2. 需求来源

1. `docs/current/交互/方案/UI设计详细交付文档.md` §1.1, §2.1
2. `docs/current/交互/方案/尺寸清单.md` §2
3. `docs/current/交互/V5交互测试用例与需求映射.md` R-01, R-02, TC-A04, TC-A05
4. `docs/archive/2026-03-06_v5-test-leftovers-closeout/V5交互测试遗留清单.md` G-04（与底部留白同组回归）

## 3. 范围

1. 编辑器正文区域（`.ProseMirror`）顶部留白。
2. Min / Default / Airy 三档位。
3. Zen / Focus Zen / 查找面板显示场景。

## 4. 规则

1. `Min (W <= 640)`：正文顶部留白为 `32px`。
2. `Default/Airy (W > 640)`：正文顶部留白为 `64px`。
3. Focus Zen 不改变基准顶部留白数值，仅影响 Header 可见性。
4. 查找面板显示时，正文可见起点必须下移，避免首行与查找面板重叠。

## 5. 验收标准

1. `TC-A04`：Min 档观测顶部约 `32px`。
2. `TC-A05`：Default/Airy 档观测顶部约 `64px`。
3. 打开查找面板后，首行可见内容不被面板遮挡。
4. 跨档位频繁拖拽（`TC-A07`）后，顶部间距不出现跳变错乱。

## 6. 非目标

1. 不定义 Header 高度与按钮布局。
2. 不定义 Slash Menu 定位逻辑。
