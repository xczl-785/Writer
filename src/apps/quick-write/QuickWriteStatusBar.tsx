interface QuickWriteStatusBarProps {
  activityLabel: string;
  documentStatus: string;
  filePath: string | null;
  saveState: 'saved' | 'dirty' | 'saving' | 'failed';
  tooltip: string;
  labels?: {
    documentStatus: string;
    saveStatus: string;
  };
}

export function QuickWriteStatusBar({
  activityLabel,
  documentStatus,
  filePath,
  saveState,
  tooltip,
  labels = {
    documentStatus: 'QuickWrite document status',
    saveStatus: 'QuickWrite save status',
  },
}: QuickWriteStatusBarProps) {
  return (
    <footer className="quick-write-status-bar" title={tooltip}>
      <output
        aria-label={labels.documentStatus}
        className="quick-write-status"
        data-status={saveState}
      >
        {documentStatus}
      </output>
      <output
        aria-label={labels.saveStatus}
        className="quick-write-status-message"
        data-status={saveState}
      >
        {activityLabel}
      </output>
      {filePath ? (
        <span className="quick-write-status-path" title={filePath}>
          {filePath}
        </span>
      ) : null}
    </footer>
  );
}
