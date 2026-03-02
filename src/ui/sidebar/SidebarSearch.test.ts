import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar Search Behavior Markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sidebarTsx = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('includes the search input marker', () => {
    expect(sidebarTsx).toContain('id="explorer-search"');
    expect(sidebarTsx).toContain("t('sidebar.search')");
  });

  it('implements keyboard navigation handlers for search results', () => {
    expect(sidebarTsx).toContain("if (e.key === 'ArrowDown')");
    expect(sidebarTsx).toContain(
      'setSearchActiveIndex((v) => (v + 1) % searchMatches.length)',
    );

    expect(sidebarTsx).toContain("if (e.key === 'ArrowUp')");
    expect(sidebarTsx).toContain('setSearchActiveIndex(');
    expect(sidebarTsx).toContain(
      '(v - 1 + searchMatches.length) % searchMatches.length',
    );

    expect(sidebarTsx).toContain("if (e.key === 'Enter')");
    expect(sidebarTsx).toContain(
      'openSearchMatch(searchMatches[searchActiveIndex])',
    );
  });

  it('defines the no-match state text', () => {
    expect(sidebarTsx).toContain("t('sidebar.noMatches')");
    expect(sidebarTsx).toContain("t('sidebar.tryDifferent')");
  });

  it('includes the clear search button marker', () => {
    expect(sidebarTsx).toContain('aria-label="Clear search"');
    expect(sidebarTsx).toContain("onClick={() => setSearchQuery('')}");
  });

  it('provides accessibility markers for search results list', () => {
    expect(sidebarTsx).toContain('id="explorer-search-results"');
    expect(sidebarTsx).toContain('role="listbox"');
    expect(sidebarTsx).toContain('aria-label="Search results"');
    expect(sidebarTsx).toContain('role="option"');
    expect(sidebarTsx).toContain('aria-selected={isActive}');
  });
});
