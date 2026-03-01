import { describe, expect, it } from 'vitest';
import { buildBreadcrumb, truncateBreadcrumb } from './useBreadcrumb';

describe('useBreadcrumb', () => {
  it('builds breadcrumb items from workspace and active file', () => {
    const items = buildBreadcrumb('/workspace', '/workspace/docs/current/a.md');
    expect(items.map((item) => item.name)).toEqual([
      'workspace',
      'docs',
      'current',
      'a.md',
    ]);
    expect(items.at(-1)?.type).toBe('file');
  });

  it('truncates long breadcrumb paths', () => {
    const items = buildBreadcrumb(
      '/workspace',
      '/workspace/docs/current/specs/v5/a.md',
    );
    const segments = truncateBreadcrumb(items, 4);
    expect(segments.map((segment) => segment.type)).toEqual([
      'item',
      'ellipsis',
      'item',
      'item',
    ]);
    expect(segments[2].item?.name).toBe('v5');
    expect(segments[3].item?.name).toBe('a.md');
  });

  it('builds breadcrumb items from windows style paths', () => {
    const items = buildBreadcrumb(
      'E:\\Project\\Producer_Workstation\\项目余烬',
      'E:\\Project\\Producer_Workstation\\项目余烬\\快速对齐.md',
    );
    expect(items.map((item) => item.name)).toEqual(['项目余烬', '快速对齐.md']);
    expect(items.at(-1)?.path).toBe(
      'E:\\Project\\Producer_Workstation\\项目余烬\\快速对齐.md',
    );
  });
});
