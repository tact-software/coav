import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ControlPanel from '../ControlPanel';
import InfoPanel from '../InfoPanel';
import AnnotationDetailPanel from '../AnnotationDetailPanel';
import { FilesPanel } from '../FilesPanel';
import { NavigationPanel } from '../NavigationPanel';
import type { RecentFile } from '../../stores';

interface TabContentProps {
  tab: string;
  onOpenComparisonDialog: () => void;
  onOpenImage: () => void;
  onOpenAnnotations: () => void;
  onOpenFolder: () => void;
  onFileSelect: (file: RecentFile) => void;
}

export function TabContent({
  tab,
  onOpenComparisonDialog,
  onOpenImage,
  onOpenAnnotations,
  onOpenFolder,
  onFileSelect,
}: TabContentProps): ReactNode {
  switch (tab) {
    case 'control':
      return <ControlPanel onOpenComparisonDialog={onOpenComparisonDialog} />;
    case 'info':
      return <InfoPanel />;
    case 'detail':
      return <AnnotationDetailPanel />;
    case 'files':
      return (
        <FilesPanel
          onOpenImage={onOpenImage}
          onOpenAnnotations={onOpenAnnotations}
          onOpenFolder={onOpenFolder}
          onFileSelect={onFileSelect}
        />
      );
    case 'navigation':
      return <NavigationPanel />;
    default:
      return null;
  }
}

export function TabIcon({ tab }: { tab: string }): ReactNode {
  switch (tab) {
    case 'control':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
        </svg>
      );
    case 'info':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case 'detail':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      );
    case 'files':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'navigation':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3v18h18" />
          <polyline points="9 9 12 6 15 9" />
          <path d="M12 6v13" />
        </svg>
      );
    case 'comparison':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case 'annotation':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      );
    default:
      return null;
  }
}

export function useTabTitle() {
  const { t } = useTranslation();

  return (tab: string): string => {
    switch (tab) {
      case 'control':
        return t('controls.title');
      case 'info':
        return t('info.title');
      case 'detail':
        return t('detail.title');
      case 'files':
        return t('files.recentFiles');
      case 'navigation':
        return t('navigation.title');
      case 'comparison':
        return t('comparisonTab.title');
      case 'annotation':
        return t('annotationTab.title');
      default:
        return '';
    }
  };
}
