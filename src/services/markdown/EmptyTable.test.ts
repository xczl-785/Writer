import { describe, it } from 'vitest';
import { MarkdownService } from './MarkdownService';

describe('MarkdownService empty table test', () => {
  it('should parse an empty markdown table', async () => {
    const mdEmptyStr = `
| | |
|---|---|
| | |
`;
    const parsed = await MarkdownService.parse(mdEmptyStr);
    console.log(JSON.stringify(parsed, null, 2));
  });
});
