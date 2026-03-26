import { describe, expect, it } from 'vitest';
import {
  buildActiveFileBreadcrumb,
  buildBreadcrumb,
  truncateBreadcrumb,
} from './useBreadcrumb';

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
      'E:\\Project\\Producer_Workstation\\��Ŀ���',
      'E:\\Project\\Producer_Workstation\\��Ŀ���\\���ٶ���.md',
    );
    expect(items.map((item) => item.name)).toEqual(['��Ŀ���', '���ٶ���.md']);
    expect(items.at(-1)?.path).toBe(
      'E:/Project/Producer_Workstation/��Ŀ���/���ٶ���.md',
    );
  });

  it('uses the matching workspace root instead of always assuming the first root', () => {
    const items = buildActiveFileBreadcrumb(
      [{ path: 'E:\\Project\\Writer' }, { path: 'E:\\Project\\Producer' }],
      'E:\\Project\\Producer\\docs\\plan.md',
    );

    expect(items.map((item) => item.name)).toEqual([
      'Producer',
      'docs',
      'plan.md',
    ]);
  });

  it('shows the absolute path when the active file does not belong to the workspace', () => {
    const items = buildActiveFileBreadcrumb(
      [{ path: 'E:\\Project\\Writer' }],
      'D:\\Inbox\\Scratch\\idea.md',
    );

    expect(items.map((item) => item.name)).toEqual([
      'D:',
      'Inbox',
      'Scratch',
      'idea.md',
    ]);
    expect(items[0]?.type).toBe('folder');
    expect(items.at(-1)?.type).toBe('file');
  });
});
