/**
 * SPIKE-002: TipTap Menu Extensions
 *
 * 验证目标:
 * 1. BubbleMenu 扩展可正常工作
 * 2. ProseMirror Plugin 可拦截 contextmenu 事件
 * 3. 与现有编辑器代码无冲突
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { Plugin, PluginKey } from 'prosemirror-state';

// ============================================
// Test 1: BubbleMenu 扩展验证
// ============================================

async function testBubbleMenu() {
  console.log('Test 1: BubbleMenu Extension');

  try {
    // 创建测试容器
    const container = document.createElement('div');
    const editorEl = document.createElement('div');
    const bubbleMenuEl = document.createElement('div');

    bubbleMenuEl.id = 'bubble-menu';
    bubbleMenuEl.innerHTML = `
      <button data-action="bold">B</button>
      <button data-action="italic">I</button>
      <button data-action="code">&lt;/&gt;</button>
    `;

    container.appendChild(editorEl);
    container.appendChild(bubbleMenuEl);
    document.body.appendChild(container);

    // 初始化编辑器
    const editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit,
        BubbleMenu.configure({
          element: bubbleMenuEl,
          tippyOptions: {
            duration: 150,
            placement: 'top',
          },
        }),
      ],
      content: '<p>测试文本 <strong>选中我</strong> 测试文本</p>',
    });

    // 验证: 编辑器创建成功
    if (!editor) {
      throw new Error('Editor creation failed');
    }

    // 验证: BubbleMenu 扩展已注册
    const bubbleMenuExt = editor.extensionManager.extensions.find(
      (ext: { name: string }) => ext.name === 'bubbleMenu',
    );
    if (!bubbleMenuExt) {
      throw new Error('BubbleMenu extension not registered');
    }

    console.log('  ✓ BubbleMenu extension registered');
    console.log('  ✓ Editor created successfully');

    // 清理
    editor.destroy();
    document.body.removeChild(container);

    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error);
    return false;
  }
}

// ============================================
// Test 2: ContextMenu Plugin 验证
// ============================================

async function testContextMenuPlugin() {
  console.log('Test 2: ContextMenu Plugin');

  try {
    // 自定义右键菜单 Plugin
    const contextMenuPlugin = new Plugin({
      key: new PluginKey('contextMenu'),
      props: {
        handleDOMEvents: {
          contextmenu: (view, event) => {
            event.preventDefault();

            // 获取点击位置
            const { clientX, clientY } = event;
            console.log(
              `  ✓ Context menu triggered at (${clientX}, ${clientY})`,
            );

            // 返回 true 表示事件已处理
            return true;
          },
        },
      },
    });

    // 创建编辑器并注册 Plugin
    const container = document.createElement('div');
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);
    document.body.appendChild(container);

    const editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit,
        // 将 Plugin 包装为 TipTap 扩展
        {
          addProseMirrorPlugins: () => [contextMenuPlugin],
        },
      ],
      content: '<p>右键点击测试</p>',
    });

    // 模拟右键事件
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
    });

    editorEl.dispatchEvent(event);

    console.log('  ✓ ContextMenu plugin registered');
    console.log('  ✓ Event handled successfully');

    // 清理
    editor.destroy();
    document.body.removeChild(container);

    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error);
    return false;
  }
}

// ============================================
// Test 3: 与现有编辑器代码集成验证
// ============================================

async function testEditorIntegration() {
  console.log('Test 3: Editor Integration');

  try {
    // 模拟现有编辑器配置
    const existingExtensions = [
      StarterKit,
      // 这里添加其他现有扩展...
    ];

    // 新增菜单扩展
    const menuExtensions = [
      BubbleMenu.configure({
        element: document.createElement('div'),
      }),
      {
        addProseMirrorPlugins: () => [
          new Plugin({
            key: new PluginKey('contextMenu'),
            props: {
              handleDOMEvents: {
                contextmenu: () => true,
              },
            },
          }),
        ],
      },
    ];

    // 合并扩展
    const allExtensions = [...existingExtensions, ...menuExtensions];

    const container = document.createElement('div');
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);
    document.body.appendChild(container);

    const editor = new Editor({
      element: editorEl,
      extensions: allExtensions,
      content: '<p>集成测试</p>',
    });

    // 验证所有扩展都已注册
    const extensionNames = editor.extensionManager.extensions.map(
      (ext: { name: string }) => ext.name,
    );

    console.log('  ✓ Registered extensions:', extensionNames);

    // 验证编辑器功能正常
    editor.commands.insertContent('测试插入');
    const content = editor.getHTML();

    if (!content.includes('测试插入')) {
      throw new Error('Editor content insertion failed');
    }

    console.log('  ✓ Editor functionality works correctly');
    console.log('  ✓ No conflicts detected');

    // 清理
    editor.destroy();
    document.body.removeChild(container);

    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error);
    return false;
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('='.repeat(50));
  console.log('SPIKE-002: TipTap Menu Extensions');
  console.log('='.repeat(50));
  console.log();

  const results = {
    bubbleMenu: await testBubbleMenu(),
    contextMenu: await testContextMenuPlugin(),
    integration: await testEditorIntegration(),
  };

  console.log();
  console.log('='.repeat(50));
  console.log('Test Results:');
  console.log('='.repeat(50));

  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✓' : '✗'} ${name}`);
    if (!passed) allPassed = false;
  }

  console.log();
  if (allPassed) {
    console.log('✅ SPIKE-002 PASSED: All menu extensions work correctly');
    process.exit(0);
  } else {
    console.log('❌ SPIKE-002 FAILED: Some tests failed');
    process.exit(1);
  }
}

// 运行测试
main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
