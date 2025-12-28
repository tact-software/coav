import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useImageStore, useAnnotationStore, useSettingsStore } from '../stores';

interface MenuEventHandlers {
  onOpenImage: () => void;
  onOpenAnnotations: () => void;
  onGenerateSample: () => void;
  onExportAnnotations: () => void;
  onShowStatistics: () => void;
  onShowSettings: () => void;
  onShowComparison?: () => void;
  onShowHistogram?: () => void;
  onShowHeatmap?: () => void;
  onShowAbout?: () => void;
  onShowShortcuts?: () => void;
  onToggleSidebar?: () => void;
}

export const useMenuEvents = (handlers: MenuEventHandlers) => {
  const {
    onOpenImage,
    onOpenAnnotations,
    onGenerateSample,
    onExportAnnotations,
    onShowStatistics,
    onShowSettings,
    onShowComparison,
    onShowHistogram,
    onShowHeatmap,
    onShowAbout,
    onShowShortcuts,
    onToggleSidebar,
  } = handlers;

  const { zoomIn, zoomOut, resetView, fitToWindow } = useImageStore();
  const { showAllCategories, hideAllCategories, clearCocoData } = useAnnotationStore();
  const { toggleAnnotations, toggleLabels, toggleBoundingBoxes } = useSettingsStore();

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

        // View menu - toggle events
        await listen('menu-toggle_annotations', toggleAnnotations),
        await listen('menu-toggle_labels', toggleLabels),
        await listen('menu-toggle_bbox', toggleBoundingBoxes),

        // Tools menu events
        await listen('menu-statistics', onShowStatistics),
        await listen('menu-settings', onShowSettings),
        await listen('menu-show_all_categories', showAllCategories),
        await listen('menu-hide_all_categories', hideAllCategories),
        await listen('menu-clear_data', clearCocoData)
      );

      // Optional event listeners
      if (onShowComparison) {
        unsubscribers.push(await listen('menu-compare', onShowComparison));
      }
      if (onShowHistogram) {
        unsubscribers.push(await listen('menu-histogram', onShowHistogram));
      }
      if (onShowHeatmap) {
        unsubscribers.push(await listen('menu-heatmap', onShowHeatmap));
      }
      if (onShowAbout) {
        unsubscribers.push(await listen('menu-about', onShowAbout));
      }
      if (onShowShortcuts) {
        unsubscribers.push(await listen('menu-shortcuts', onShowShortcuts));
      }
      if (onToggleSidebar) {
        unsubscribers.push(await listen('menu-toggle_sidebar', onToggleSidebar));
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
    onShowAbout,
    onShowShortcuts,
    onToggleSidebar,
    zoomIn,
    zoomOut,
    resetView,
    fitToWindow,
    toggleAnnotations,
    toggleLabels,
    toggleBoundingBoxes,
    showAllCategories,
    hideAllCategories,
    clearCocoData,
  ]);
};
