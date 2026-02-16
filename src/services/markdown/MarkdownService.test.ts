import { describe, it, expect } from 'vitest';
import { MarkdownService } from './MarkdownService';

describe('MarkdownService Roundtrip', () => {
  const cases = [
    {
      name: 'headings',
      input: '# H1\n\n## H2\n\n### H3',
      mustContain: ['# H1', '## H2', '### H3'],
    },
    {
      name: 'bold and italic',
      input: 'This is **bold** and this is *italic*.',
      mustContain: ['**bold**', '*italic*'],
    },
    {
      name: 'fenced code',
      input: '```ts\nconst x = 1;\n```',
      mustContain: ['```ts', 'const x = 1;', '```'],
    },
    {
      name: 'nested lists',
      input: '- item 1\n    - subitem a\n1. first\n2. second',
      mustContain: ['- item 1', '- subitem a', '1. first', '2. second'],
    },
    {
      name: 'blockquote',
      input: '> This is a blockquote.',
      mustContain: ['> This is a blockquote.'],
    },
    {
      name: 'images',
      input: '![alt text](https://example.com/image.png)',
      mustContain: ['![alt text](https://example.com/image.png)'],
    },
  ];

  it.each(cases)(
    'should maintain semantic fidelity for $name',
    async ({ input, mustContain }) => {
      const doc = await MarkdownService.parse(input);
      const output = await MarkdownService.serialize(doc);

      mustContain.forEach((token) => {
        expect(output).toContain(token);
      });
    },
  );

  it('should handle double roundtrip', async () => {
    const input =
      '# Title\n\n**Bold** and *Italic* text.\n\n```js\nconsole.log("hello");\n```';
    const doc1 = await MarkdownService.parse(input);
    const output1 = await MarkdownService.serialize(doc1);

    const doc2 = await MarkdownService.parse(output1);
    const output2 = await MarkdownService.serialize(doc2);

    expect(output1).toBe(output2);
  });
});
