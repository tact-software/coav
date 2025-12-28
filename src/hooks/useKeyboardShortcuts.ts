import { useEffect } from 'react';
import { useImageStore, useAnnotationStore } from '../stores';

interface KeyboardShortcutsConfig {
  onOpenImage: () => void;
  onOpenAnnotations: () => void;
  onShowStatistics: () => void;
  onShowComparisonDialog: () => void;
  onToggleLeftPanel: () => void;
  onCloseUnifiedPanel: () => void;
  isSmallOrMediumScreen: boolean;
}

export function useKeyboardShortcuts({
  onOpenImage,
  onOpenAnnotations,
  onShowStatistics,
  onShowComparisonDialog,
  onToggleLeftPanel,
  onCloseUnifiedPanel,
  isSmallOrMediumScreen,
}: KeyboardShortcutsConfig) {
  const { imageSize, zoomIn, zoomOut, fitToWindow, resetView } = useImageStore();
  const { cocoData } = useAnnotationStore();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '\\':
            e.preventDefault();
            onToggleLeftPanel();
            break;
          case 'o':
            e.preventDefault();
            onOpenImage();
            break;
          case 'j':
            e.preventDefault();
            onOpenAnnotations();
            break;
          case '=':
          case '+':
            e.preventDefault();
            if (imageSize) zoomIn();
            break;
          case '-':
            e.preventDefault();
            if (imageSize) zoomOut();
            break;
          case '0':
            e.preventDefault();
            if (imageSize) resetView();
            break;
          case 'f':
            e.preventDefault();
            if (imageSize) fitToWindow();
            break;
          case 'i':
            e.preventDefault();
            if (cocoData) onShowStatistics();
            break;
          case 'k':
            e.preventDefault();
            if (cocoData) onShowComparisonDialog();
            break;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isSmallOrMediumScreen) {
          onCloseUnifiedPanel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    imageSize,
    zoomIn,
    zoomOut,
    resetView,
    fitToWindow,
    onOpenImage,
    onOpenAnnotations,
    cocoData,
    onShowStatistics,
    onShowComparisonDialog,
    onToggleLeftPanel,
    onCloseUnifiedPanel,
    isSmallOrMediumScreen,
  ]);
}
