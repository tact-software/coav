import React from 'react';
import { useTranslation } from 'react-i18next';
import { RecentFiles } from '../RecentFiles';
import type { RecentFile } from '../../stores';
import './FilesPanel.css';

interface FilesPanelProps {
  onOpenImage: () => void;
  onOpenAnnotations: () => void;
  onFileSelect: (file: RecentFile) => void;
}

export const FilesPanel: React.FC<FilesPanelProps> = ({
  onOpenImage,
  onOpenAnnotations,
  onFileSelect,
}) => {
  const { t } = useTranslation();

  const handleOpenImage = () => {
    onOpenImage();
  };

  const handleOpenAnnotations = () => {
    onOpenAnnotations();
  };

  const handleFileSelect = (file: RecentFile) => {
    onFileSelect(file);
  };

  return (
    <div className="files-panel">
      <div className="files-panel__actions">
        <button className="btn btn-primary" onClick={handleOpenImage}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {t('menu.openImage')}
        </button>
        <button className="btn btn-secondary" onClick={handleOpenAnnotations}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2v6h6" />
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 12h-6" />
            <path d="M14 16h-6" />
            <path d="M10 8h-2" />
          </svg>
          {t('menu.openAnnotations')}
        </button>
      </div>
      <div className="files-panel__header">
        <h3>{t('info.recentFiles')}</h3>
      </div>
      <div className="files-panel__content">
        <RecentFiles onFileSelect={handleFileSelect} />
      </div>
    </div>
  );
};
