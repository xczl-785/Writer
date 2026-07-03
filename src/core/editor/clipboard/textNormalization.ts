/**
 * Computes the common leading whitespace shared by all non-empty lines,
 * then strips that prefix from every line.
 *
 * Only strips when all non-empty lines share the same whitespace character
 * type (all spaces or all tabs). Mixed leading whitespace is left untouched.
 */
export function stripCommonIndent(text: string): string {
  const lines = text.split('\n');
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);

  if (nonEmptyLines.length === 0) return text;

  const leadingWs = (line: string): string => {
    const match = line.match(/^(\s+)/);
    return match ? match[1] : '';
  };

  const firstWs = leadingWs(nonEmptyLines[0]);
  if (firstWs.length === 0) return text;

  const wsChar = firstWs[0];
  if (wsChar !== ' ' && wsChar !== '\t') return text;
  if (!firstWs.split('').every((c) => c === wsChar)) return text;

  let minLen = firstWs.length;
  for (const line of nonEmptyLines) {
    const ws = leadingWs(line);
    if (!ws.split('').every((c) => c === wsChar)) return text;
    minLen = Math.min(minLen, ws.length);
    if (minLen === 0) return text;
  }

  return lines
    .map((line) => (line.trim().length === 0 ? line : line.slice(minLen)))
    .join('\n');
}

type ParsedJSON = Record<string, unknown> | null;

/**
 * Returns true when the parse result is a doc containing exactly one
 * codeBlock child — the signature of indented-text misclassification.
 */
export function isSoleDegenerateCodeBlock(json: ParsedJSON): boolean {
  if (!json || typeof json !== 'object') return false;
  const content = json.content;
  if (!Array.isArray(content) || content.length !== 1) return false;
  return content[0]?.type === 'codeBlock';
}

/**
 * Returns true when the retried parse result is structurally richer
 * than the original sole-codeBlock result — more nodes or a different
 * first node type.
 */
export function isRicherParse(
  original: Record<string, unknown>,
  retry: Record<string, unknown>,
): boolean {
  const retryContent = retry.content;
  if (!Array.isArray(retryContent) || retryContent.length === 0) return false;

  const origContent = original.content as Array<Record<string, unknown>>;

  if (retryContent.length > origContent.length) return true;
  if (retryContent[0]?.type !== 'codeBlock') return true;

  return false;
}
