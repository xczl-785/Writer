// src/ui/sidebar/WorkspaceRootHeader.tsx
// V6 根文件夹头部组件

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, X } from 'lucide-react';
import { t } from '../../i18n';

interface WorkspaceRootHeaderProps {
  folder: {
    workspacePath: string;
    displayName: string;
  };
}

export const WorkspaceRootHeader: React.FC<WorkspaceRootHeaderProps> = ({ folder }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className="workspace-root-header"
    >
      <button
        className="expand-button"
        onClick={toggleExpanded}
        type="button"
      >
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      
      <Folder size={16} className="folder-icon" />
      
      <span className="folder-name" title={folder.workspacePath}>
        {folder.displayName}
      </span>
      
      <button
        className="remove-button"
        onClick={() => {
          console.log('Remove folder:', folder.workspacePath);
        }}
        type="button"
        title={t('workspace.removeFolder')}
      >
        <X size={12} />
      </button>
    </div>
  );
};
