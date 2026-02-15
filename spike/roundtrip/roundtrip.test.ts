/**
 * Roundtrip Spike test scaffold.
 * Replace parse/serialize stubs with actual MarkdownService implementation.
 */

import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

const manager = new MarkdownManager({
  extensions: [StarterKit, Image],
});

type Case = { name: string; input: string; mustContain: string[] };

const cases: Case[] = [
  {
    name: 'headings',
    input: '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n',
    mustContain: [
      '# H1',
      '## H2',
      '### H3',
      '#### H4',
      '##### H5',
      '###### H6',
    ],
  },
  {
    name: 'nested lists',
    input: '- a\n  - b\n1. one\n2. two\n',
    mustContain: ['- a', '- b', '1. one', '2. two'],
  },
  {
    name: 'fenced code',
    input: '```ts\nconst x: number = 1\n```\n',
    mustContain: ['```ts', 'const x: number = 1', '```'],
  },
  {
    name: 'image ref',
    input: '![alt](assets/20260214-120000-abcd.png)\n',
    mustContain: ['![alt](assets/20260214-120000-abcd.png)'],
  },
];

async function parse(md: string): Promise<unknown> {
  return manager.parse(md);
}

async function serialize(doc: unknown): Promise<string> {
  return manager.serialize(doc);
}

function assertContains(output: string, expected: string[]): void {
  for (const token of expected) {
    if (!output.includes(token)) {
      throw new Error(`Missing token: ${token}`);
    }
  }
}

async function main() {
  for (const c of cases) {
    const doc = await parse(c.input);
    const out = await serialize(doc);
    assertContains(out, c.mustContain);
    console.log(`PASS: ${c.name}`);
  }
}

main().catch((e) => {
  console.error(`FAIL: ${e.message}`);
  process.exit(1);
});
