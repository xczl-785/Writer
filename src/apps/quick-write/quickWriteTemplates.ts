export type QuickWriteTemplateId =
  | 'meeting-notes'
  | 'quick-brief'
  | 'daily-note';

export interface QuickWriteTemplate {
  id: QuickWriteTemplateId;
  title: string;
  content: string;
  suggestedFileName?: string;
}

export const QUICK_WRITE_TEMPLATES: QuickWriteTemplate[] = [
  {
    id: 'meeting-notes',
    title: 'Meeting notes',
    suggestedFileName: 'meeting-notes.md',
    content: [
      '# Meeting Notes',
      '',
      '## Topics',
      '',
      '- ',
      '',
      '## Decisions',
      '',
      '- ',
      '',
      '## Next Actions',
      '',
      '- ',
    ].join('\n'),
  },
  {
    id: 'quick-brief',
    title: 'Quick brief',
    suggestedFileName: 'quick-brief.md',
    content: [
      '# Brief',
      '',
      '## Context',
      '',
      '- ',
      '',
      '## Goal',
      '',
      '- ',
      '',
      '## Notes',
      '',
      '- ',
    ].join('\n'),
  },
  {
    id: 'daily-note',
    title: 'Daily note',
    suggestedFileName: 'daily-note.md',
    content: [
      '# Daily Note',
      '',
      '## Focus',
      '',
      '- ',
      '',
      '## Notes',
      '',
      '- ',
    ].join('\n'),
  },
];

export const getQuickWriteTemplateById = (
  id: string | null,
): QuickWriteTemplate | null =>
  QUICK_WRITE_TEMPLATES.find((template) => template.id === id) ?? null;
