import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useImageStore, useAnnotationStore } from '../stores';

export const useMenuEvents = (
  onOpenImage: () => void,
  onOpenAnnotations: () => void,
  onGenerateSample: () => void,
  onExportAnnotations: () => void,
  onShowStatistics: () => void,
  onShowSettings: () => void
) => {
  const { zoomIn, zoomOut, resetView, fitToWindow } = useImageStore();
  const { showAllCategories, hideAllCategories, clearCocoData } = useAnnotationStore();

  useEffect(() => {
    const unsubscribers: Array<Promise<() => void>> = [];

    // File menu events
    unsubscribers.push(
      listen('menu-open_image', onOpenImage),
      listen('menu-open_annotations', onOpenAnnotations),
      listen('menu-generate_sample', onGenerateSample),
      listen('menu-export_annotations', onExportAnnotations),

      // View menu events
      listen('menu-zoom_in', zoomIn),
      listen('menu-zoom_out', zoomOut),
      listen('menu-zoom_fit', fitToWindow),
      listen('menu-zoom_100', resetView),

      // Tools menu events
      listen('menu-statistics', onShowStatistics),
      listen('menu-settings', onShowSettings),
      listen('menu-show_all_categories', showAllCategories),
      listen('menu-hide_all_categories', hideAllCategories),
      listen('menu-clear_data', clearCocoData)
    );

    // Setup cleanup
    const cleanup = async () => {
      const unlisteners = await Promise.all(unsubscribers);
      unlisteners.forEach((unlisten) => unlisten());
    };

    return () => {
      cleanup();
    };
  }, [
    onOpenImage,
    onOpenAnnotations,
    onGenerateSample,
    onExportAnnotations,
    onShowStatistics,
    onShowSettings,
    zoomIn,
    zoomOut,
    resetView,
    fitToWindow,
    showAllCategories,
    hideAllCategories,
    clearCocoData,
  ]);
};
