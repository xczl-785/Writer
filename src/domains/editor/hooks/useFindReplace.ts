import type { Editor as TiptapEditor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FIND_MATCH_LIMIT } from '../core/constants';
import {
  collectFindTextMatches,
  getActiveFindMatchIndex,
  emitTypewriterForceFree,
} from '../domain';

type UseFindReplaceArgs = {
  editor: TiptapEditor | null;
  editorRevision: number;
  setTransientStatus: (message: string) => void;
};

export function useFindReplace({
  editor,
  editorRevision,
  setTransientStatus,
}: UseFindReplaceArgs) {
  const [isFindPanelOpen, setIsFindPanelOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [activeFindMatchIndex, setActiveFindMatchIndex] = useState(-1);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const findMatches = useMemo(() => {
    void editorRevision;
    if (!editor || !isFindPanelOpen || !findQuery) return [];
    return collectFindTextMatches(editor, findQuery);
  }, [editor, editorRevision, findQuery, isFindPanelOpen]);

  const openFindPanel = useCallback((mode: 'find' | 'replace') => {
    setIsFindPanelOpen(true);
    setIsReplaceMode(mode === 'replace');
  }, []);

  const closeFindPanel = useCallback(() => {
    setIsFindPanelOpen(false);
    setIsReplaceMode(false);
    editor?.commands.focus();
  }, [editor]);

  useEffect(() => {
    if (!isFindPanelOpen) return;
    const timeout = setTimeout(() => {
      const target = isReplaceMode
        ? replaceInputRef.current
        : findInputRef.current;
      target?.focus();
      target?.select();
    }, 0);
    return () => clearTimeout(timeout);
  }, [isFindPanelOpen, isReplaceMode]);

  const goToFindMatchIndex = useCallback(
    (index: number) => {
      if (!editor) return;
      const match = findMatches[index];
      if (!match) return;
      emitTypewriterForceFree('find-navigation');
      editor
        .chain()
        .focus()
        .setTextSelection({ from: match.from, to: match.to })
        .run();
      setActiveFindMatchIndex(index);
    },
    [editor, findMatches],
  );

  const focusFindInputWithHint = useCallback(() => {
    setTransientStatus('Enter text to find');
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, [setTransientStatus]);

  const goToNextFindMatch = useCallback(() => {
    if (!findQuery) {
      focusFindInputWithHint();
      return;
    }
    if (!findMatches.length) {
      setTransientStatus('No matches');
      return;
    }
    const nextIndex =
      activeFindMatchIndex < 0
        ? 0
        : (activeFindMatchIndex + 1) % findMatches.length;
    goToFindMatchIndex(nextIndex);
  }, [
    activeFindMatchIndex,
    findMatches.length,
    findQuery,
    focusFindInputWithHint,
    goToFindMatchIndex,
    setTransientStatus,
  ]);

  const goToPrevFindMatch = useCallback(() => {
    if (!findQuery) {
      focusFindInputWithHint();
      return;
    }
    if (!findMatches.length) {
      setTransientStatus('No matches');
      return;
    }
    const nextIndex =
      activeFindMatchIndex < 0
        ? findMatches.length - 1
        : (activeFindMatchIndex - 1 + findMatches.length) % findMatches.length;
    goToFindMatchIndex(nextIndex);
  }, [
    activeFindMatchIndex,
    findMatches.length,
    findQuery,
    focusFindInputWithHint,
    goToFindMatchIndex,
    setTransientStatus,
  ]);

  const replaceOneActiveMatch = useCallback(() => {
    if (!editor) return;
    if (!findQuery) {
      focusFindInputWithHint();
      return;
    }
    if (!findMatches.length) {
      setTransientStatus('No matches');
      return;
    }

    const index = activeFindMatchIndex < 0 ? 0 : activeFindMatchIndex;
    const match = findMatches[index];
    if (!match) return;

    editor
      .chain()
      .focus()
      .insertContentAt({ from: match.from, to: match.to }, replaceQuery)
      .run();

    const nextMatches = collectFindTextMatches(editor, findQuery);
    if (nextMatches.length === 0) {
      setActiveFindMatchIndex(-1);
      return;
    }

    const nextIndex = Math.min(index, nextMatches.length - 1);
    const nextMatch = nextMatches[nextIndex];
    emitTypewriterForceFree('find-navigation');
    editor
      .chain()
      .focus()
      .setTextSelection({ from: nextMatch.from, to: nextMatch.to })
      .run();
    setActiveFindMatchIndex(nextIndex);
  }, [
    activeFindMatchIndex,
    editor,
    findMatches,
    findQuery,
    focusFindInputWithHint,
    replaceQuery,
    setTransientStatus,
  ]);

  const replaceAllActiveMatches = useCallback(() => {
    if (!editor) return;
    if (!findQuery) {
      focusFindInputWithHint();
      return;
    }

    const matchesToReplace = collectFindTextMatches(editor, findQuery);
    if (matchesToReplace.length === 0) {
      setTransientStatus('No matches');
      return;
    }

    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        for (let i = matchesToReplace.length - 1; i >= 0; i--) {
          const match = matchesToReplace[i];
          tr.insertText(replaceQuery, match.from, match.to);
        }
        if (dispatch) dispatch(tr);
        return true;
      })
      .run();

    const nextMatches = collectFindTextMatches(editor, findQuery);
    setActiveFindMatchIndex(
      getActiveFindMatchIndex(
        nextMatches,
        editor.state.selection.from,
        editor.state.selection.to,
      ),
    );

    const replacedCount = matchesToReplace.length;
    setTransientStatus(
      replacedCount === 1
        ? 'Replaced 1 match'
        : `Replaced ${replacedCount} matches`,
    );
  }, [
    editor,
    findQuery,
    focusFindInputWithHint,
    replaceQuery,
    setTransientStatus,
  ]);

  const findCountText = useMemo(() => {
    if (!findQuery) return 'Enter find query';
    if (findMatches.length >= FIND_MATCH_LIMIT) {
      return `> ${FIND_MATCH_LIMIT - 1} matches`;
    }
    return findMatches.length === 1
      ? '1 match'
      : `${findMatches.length} matches`;
  }, [findMatches.length, findQuery]);

  const findProgressText = useMemo(() => {
    if (!findMatches.length) return '';
    return `${Math.max(0, activeFindMatchIndex + 1)}/${findMatches.length}`;
  }, [activeFindMatchIndex, findMatches.length]);

  return {
    isFindPanelOpen,
    isReplaceMode,
    findQuery,
    replaceQuery,
    findMatches,
    findCountText,
    findProgressText,
    findInputRef,
    replaceInputRef,
    openFindPanel,
    closeFindPanel,
    setFindQuery,
    setReplaceQuery,
    goToPrevFindMatch,
    goToNextFindMatch,
    replaceOneActiveMatch,
    replaceAllActiveMatches,
  };
}
