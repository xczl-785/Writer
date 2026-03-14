export type HeaderVisibilityInput = {
  isFocusZen: boolean;
  isHeaderAwake: boolean;
};

export type HeaderVisibilityPolicy = {
  chromeVisible: boolean;
  editorHeaderVisible: boolean;
};

export function getHeaderVisibilityPolicy({
  isFocusZen,
  isHeaderAwake,
}: HeaderVisibilityInput): HeaderVisibilityPolicy {
  const visible = !isFocusZen || isHeaderAwake;

  return {
    chromeVisible: visible,
    editorHeaderVisible: visible,
  };
}

export function isChromeHeaderVisible(input: HeaderVisibilityInput): boolean {
  return getHeaderVisibilityPolicy(input).chromeVisible;
}

export function isEditorHeaderVisible(input: HeaderVisibilityInput): boolean {
  return getHeaderVisibilityPolicy(input).editorHeaderVisible;
}
