import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useImageStore, useAnnotationStore } from '../stores';

export const useMenuEvents = (
  onOpenImage: () => void,
  onOpenAnnotations: () => void,
  onGenerateSample: () => void,
  onExportAnnotations: () => void,
  onShowStatistics: () => void,
  onShowSettings: () => void,
  onShowComparison?: () => void,
  onShowHistogram?: () => void,
  onShowHeatmap?: () => void
) => {
  const { zoomIn, zoomOut, resetView, fitToWindow } = useImageStore();
  const { showAllCategories, hideAllCategories, clearCocoData } = useAnnotationStore();

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    let isSubscribed = true;

    const setupListeners = async () => {
      if (!isSubscribed) return;

      // File menu events
      unsubscribers.push(
        await listen('menu-open_image', onOpenImage),
        await listen('menu-open_annotations', onOpenAnnotations),
        await listen('menu-generate_sample', onGenerateSample),
        await listen('menu-export_annotations', onExportAnnotations),

        // View menu events
        await listen('menu-zoom_in', zoomIn),
        await listen('menu-zoom_out', zoomOut),
        await listen('menu-zoom_fit', fitToWindow),
        await listen('menu-zoom_100', resetView),

        // Tools menu events
        await listen('menu-statistics', onShowStatistics),
        await listen('menu-settings', onShowSettings),
        await listen('menu-show_all_categories', showAllCategories),
        await listen('menu-hide_all_categories', hideAllCategories),
        await listen('menu-clear_data', clearCocoData)
      );

      // Add comparison dialog listener if handler provided
      if (onShowComparison) {
        unsubscribers.push(await listen('menu-compare', onShowComparison));
      }

      // Add histogram dialog listener if handler provided
      if (onShowHistogram) {
        unsubscribers.push(await listen('menu-histogram', onShowHistogram));
      }

      // Add heatmap dialog listener if handler provided
      if (onShowHeatmap) {
        unsubscribers.push(await listen('menu-heatmap', onShowHeatmap));
      }
    };

    setupListeners();

    return () => {
      isSubscribed = false;
      unsubscribers.forEach((unlisten) => unlisten());
    };
  }, [
    onOpenImage,
    onOpenAnnotations,
    onGenerateSample,
    onExportAnnotations,
    onShowStatistics,
    onShowSettings,
    onShowComparison,
    onShowHistogram,
    onShowHeatmap,
    zoomIn,
    zoomOut,
    resetView,
    fitToWindow,
    showAllCategories,
    hideAllCategories,
    clearCocoData,
  ]);
};
