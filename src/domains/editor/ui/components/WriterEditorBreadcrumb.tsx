import { Breadcrumb } from '../../../../ui/components/Breadcrumb';
import {
  buildActiveFileBreadcrumb,
  type BreadcrumbItem,
} from '../../../../ui/components/Breadcrumb/useBreadcrumb';
import { useFileTreeStore } from '../../../file/state/fileStore';
import { openFile } from '../../../workspace/services/WorkspaceManager';

type WriterEditorBreadcrumbProps = {
  activeFile: string;
  folders: Array<{ path: string }>;
  isMinTier: boolean;
};

export function WriterEditorBreadcrumb({
  activeFile,
  folders,
  isMinTier,
}: WriterEditorBreadcrumbProps) {
  const { setSelectedPath, expandNode } = useFileTreeStore();
  const breadcrumbItems = buildActiveFileBreadcrumb(folders, activeFile);
  const compactFileName = activeFile.split(/[/\\]/).pop() ?? activeFile;

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    setSelectedPath(item.path);
    if (item.type === 'file') {
      void openFile(item.path);
      return;
    }
    if (item.type === 'folder' || item.type === 'workspace') {
      expandNode(item.path);
    }
  };

  return (
    <div className="editor-header__breadcrumb-inner">
      {isMinTier ? (
        <div className="h-12 px-6 flex items-center text-sm text-zinc-500 min-w-0">
          <span className="shrink-0">... /</span>
          <span className="ml-1 font-semibold text-zinc-700 truncate">
            {compactFileName}
          </span>
        </div>
      ) : (
        <Breadcrumb
          items={breadcrumbItems}
          onItemClick={handleBreadcrumbClick}
          className="h-12 px-6"
        />
      )}
    </div>
  );
}
