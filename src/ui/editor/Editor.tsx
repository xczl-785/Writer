import { useEffect, useState } from 'react';
import {
  useEditor,
  EditorContent,
  Editor as TiptapEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEditorStore } from '../../state/slices/editorSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { MarkdownService } from '../../services/markdown/MarkdownService';
import './Editor.css';

export const Editor = () => {
  const { activeFile } = useWorkspaceStore();
  const { fileStates, updateFileContent, setDirty } = useEditorStore();

  // Local state to track if content is loading to avoid race conditions
  const [isLoading, setIsLoading] = useState(false);

  const content = activeFile ? fileStates[activeFile]?.content || '' : '';

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
      ],
      content: '', // Initial content empty, loaded via useEffect
      editorProps: {
        attributes: {
          class: 'editor-content h-full focus:outline-none',
        },
        handleKeyDown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault();
            console.log('Save triggered via Cmd+S');
            // In the future, this would call a saveFile action
            return true;
          }
          return false;
        },
      },
      onUpdate: async ({ editor }: { editor: TiptapEditor }) => {
        // If we are loading content, don't update the store
        if (isLoading) return;
        if (!activeFile) return;

        const json = editor.getJSON();
        try {
          const markdown = await MarkdownService.serialize(json);
          updateFileContent(activeFile, markdown);
          setDirty(activeFile, true);
        } catch (error) {
          console.error('Failed to serialize editor content:', error);
        }
      },
    },
    [activeFile],
  ); // Re-create editor when activeFile changes

  useEffect(() => {
    if (!editor || !activeFile) return;

    let isMounted = true;

    const loadContent = async () => {
      setIsLoading(true);
      try {
        const json = await MarkdownService.parse(content);
        if (isMounted) {
          editor.commands.setContent(json, { emitUpdate: false });
          // @ts-expect-error - clearHistory might not be typed in StarterKit's SingleCommands
          editor.commands.clearHistory();
        }
      } catch (error) {
        console.error('Failed to parse markdown', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [activeFile, editor]);
  // removed content from deps to avoid loop.
  // It only loads initial content when activeFile changes (and editor is recreated).

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No file open
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-container h-full w-full flex flex-col">
      <EditorContent editor={editor} className="flex-grow overflow-auto p-4" />
    </div>
  );
};
