import { useCallback, useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import './App.css';
import './styles/modern.css';
import './styles/themes.css';
import ImageViewer from './components/ImageViewer';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';
import AnnotationDetailPanel from './components/AnnotationDetailPanel';
import SampleGeneratorDialog from './components/SampleGeneratorDialog';
import StatisticsDialog from './components/StatisticsDialog';
import SettingsModal from './components/SettingsModal';
import ImageSelectionDialog from './components/ImageSelectionDialog';
import { ComparisonDialog } from './components/ComparisonDialog';
import { CommonModal } from './components/CommonModal';
import { HistogramPanel } from './components/HistogramPanel';
import { HeatmapDialog } from './components/HeatmapDialog';
import { FilesPanel } from './components/FilesPanel';
import { NavigationPanel } from './components/NavigationPanel';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';
import {
  useAnnotationStore,
  useImageStore,
  useToastStore,
  useRecentFilesStore,
  useSettingsStore,
  useLoadingStore,
  useHeatmapStore,
  useNavigationStore,
  toast,
} from './stores';
import type { RecentFile, TabType } from './stores';
import { useMenuEvents } from './hooks/useMenuEvents';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { COCOData } from './types/coco';
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  const { cocoData, setCocoData, clearCocoData, setCurrentImageId, isComparing, clearComparison } =
    useAnnotationStore();
  const {
    setImagePath,
    setImageData,
    setLoading,
    setError,
    imageSize,
    zoomIn,
    zoomOut,
    fitToWindow,
    resetView,
  } = useImageStore();
  const { toasts, removeToast } = useToastStore();
  const { addRecentFile } = useRecentFilesStore();
  const { isSettingsModalOpen, openSettingsModal, closeSettingsModal, panelLayout } =
    useSettingsStore();
  const { selectedFolderPath, navigationMode } = useNavigationStore();
  const { isLoading, message, subMessage, progress } = useLoadingStore();
  const { imageData } = useImageStore();

  // Check if images are available (either single image or folder)
  const hasImagesAvailable =
    imageData || (navigationMode === 'folder' && selectedFolderPath !== null);

  const [activeLeftTab, setActiveLeftTab] = useState<string>(() => {
    // デフォルトタブが実際に左パネルに存在するかチェック
    const defaultTab = panelLayout.defaultLeftTab;
    return panelLayout.leftPanelTabs.includes(defaultTab as TabType)
      ? defaultTab
      : panelLayout.leftPanelTabs[0] || 'control';
  });
  const [activeRightTab, setActiveRightTab] = useState<string>(() => {
    // デフォルトタブが実際に右パネルに存在するかチェック
    const defaultTab = panelLayout.defaultRightTab;
    return panelLayout.rightPanelTabs.includes(defaultTab as TabType)
      ? defaultTab
      : panelLayout.rightPanelTabs[0] || 'info';
  });
  const prevPanelLayoutRef = useRef(panelLayout);
  const [unifiedPanelVisible, setUnifiedPanelVisible] = useState(false);
  const [activeUnifiedTab, setActiveUnifiedTab] = useState<string>('control');
  const [showSampleGenerator, setShowSampleGenerator] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [showHistogramDialog, setShowHistogramDialog] = useState(false);
  const { openModal: openHeatmapModal } = useHeatmapStore();
  const [tempCocoData, setTempCocoData] = useState<{
    data: COCOData;
    annotationDir: string;
  } | null>(null);

  // Helper to render tab content
  const renderTabContent = (tab: string) => {
    switch (tab) {
      case 'control':
        return <ControlPanel onOpenComparisonDialog={() => setShowComparisonDialog(true)} />;
      case 'info':
        return <InfoPanel />;
      case 'detail':
        return <AnnotationDetailPanel />;
      case 'files':
        return (
          <FilesPanel
            onOpenImage={handleOpenImage}
            onOpenAnnotations={handleOpenAnnotations}
            onOpenFolder={handleOpenFolder}
            onFileSelect={handleRecentFileSelect}
          />
        );
      case 'navigation':
        return <NavigationPanel />;
      default:
        return null;
    }
  };

  // Helper to get tab icon
  const getTabIcon = (tab: string) => {
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
      default:
        return null;
    }
  };

  // Helper to get tab title
  const getTabTitle = (tab: string) => {
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
      default:
        return '';
    }
  };

  // Responsive layout hook
  const {
    screenSize,
    leftPanelVisible,
    rightPanelVisible,
    leftPanelLayout,
    rightPanelLayout,
    toggleLeftPanel,
    toggleRightPanel,
    showRightPanelForSelection,
    showLeftPanel,
    showRightPanel,
    shouldRenderLeftPanel,
    shouldRenderRightPanel,
    isSmallScreen,
    isCompactScreen,
    isMediumScreen,
    isLargeScreen,
  } = useResponsiveLayout();

  // Show image selection dialog when tempCocoData is set
  useEffect(() => {
    if (tempCocoData && tempCocoData.data.images && tempCocoData.data.images.length > 1) {
      setShowImageSelection(true);
    }
  }, [tempCocoData]);

  // Handle panel layout changes
  useEffect(() => {
    const prevLayout = prevPanelLayoutRef.current;

    // Check if panel layout has changed
    if (
      JSON.stringify(prevLayout.leftPanelTabs) !== JSON.stringify(panelLayout.leftPanelTabs) ||
      JSON.stringify(prevLayout.rightPanelTabs) !== JSON.stringify(panelLayout.rightPanelTabs)
    ) {
      // Update active tabs to the first available tab in each panel
      if (panelLayout.leftPanelTabs.length > 0) {
        // If current active tab is not in the new layout, set to first tab
        if (!panelLayout.leftPanelTabs.includes(activeLeftTab as TabType)) {
          setActiveLeftTab(panelLayout.leftPanelTabs[0]);
        }
      }

      if (panelLayout.rightPanelTabs.length > 0) {
        // If current active tab is not in the new layout, set to first tab
        if (!panelLayout.rightPanelTabs.includes(activeRightTab as TabType)) {
          setActiveRightTab(panelLayout.rightPanelTabs[0]);
        }
      }

      // Update unified panel active tab if needed
      const allTabs = [...panelLayout.leftPanelTabs, ...panelLayout.rightPanelTabs];
      if (!allTabs.includes(activeUnifiedTab as TabType) && allTabs.length > 0) {
        setActiveUnifiedTab(allTabs[0]);
      }

      // Show panels after layout change
      if (isLargeScreen) {
        // For large screens, ensure panels are visible if they have tabs
        if (panelLayout.leftPanelTabs.length > 0) {
          showLeftPanel();
        }
        if (panelLayout.rightPanelTabs.length > 0) {
          showRightPanel();
        }
      }

      prevPanelLayoutRef.current = panelLayout;
    }
  }, [
    panelLayout,
    activeLeftTab,
    activeRightTab,
    activeUnifiedTab,
    isLargeScreen,
    showLeftPanel,
    showRightPanel,
  ]);

  const handleOpenImage = useCallback(async () => {
    try {
      setLoading(true);

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Image',
            extensions: ['jpg', 'jpeg', 'png'],
          },
        ],
      });

      if (!selected) {
        setLoading(false);
        return;
      }

      const imagePath = selected as string;

      // Reset to single mode when opening a single image
      const { resetToSingleMode } = useNavigationStore.getState();

      // Use setTimeout to avoid hook execution order issues
      setTimeout(() => {
        clearCocoData();
        resetToSingleMode();
      }, 0);

      const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
      const uint8Array = new Uint8Array(imageBytes);
      const blob = new Blob([uint8Array]);
      const dataUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        setImagePath(imagePath);
        setImageData(dataUrl, { width: img.width, height: img.height });
        // Add to recent files
        addRecentFile({
          path: imagePath,
          name: imagePath.split('/').pop() || 'Unknown',
          type: 'image',
        });
        toast.success(
          t('success.imageLoaded'),
          `${t('success.loaded')}: ${imagePath.split('/').pop()}`
        );
      };
      img.onerror = () => {
        setError('Failed to load image');
        toast.error(t('errors.loadImageFailed'), t('errors.invalidImageFormat'));
      };
      img.src = dataUrl;
    } catch (error) {
      console.error('Error loading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open image';
      setError(errorMessage);
      toast.error(t('errors.loadImageFailed'), errorMessage);
    }
  }, [setImagePath, setImageData, setLoading, setError, clearCocoData, addRecentFile]);

  const handleOpenAnnotations = useCallback(async () => {
    // Check if images are available
    if (!hasImagesAvailable) {
      toast.error(t('errors.loadAnnotationFailed'), t('errors.imageRequiredFirst'));
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (!selected) return;

      const jsonPath = selected as string;

      // Reset state first
      setShowImageSelection(false);
      setTempCocoData(null);

      const data = await invoke<COCOData>('load_annotations', { filePath: jsonPath });

      // Store the annotation file path for later use
      const annotationDir =
        jsonPath.substring(0, jsonPath.lastIndexOf('/')) ||
        jsonPath.substring(0, jsonPath.lastIndexOf('\\'));

      // Check if there are multiple images
      if (data.images && data.images.length > 1) {
        // フォルダモード（ナビゲーション有効）の場合は直接セット
        if (navigationMode === 'folder') {
          // フォルダ + 複数画像アノテーション → そのまま開く（ナビゲーションモード）
          setCocoData(data);
          // 最初の画像IDをセット
          setCurrentImageId(data.images[0].id);
        } else {
          // 画像モード（単一画像）の場合は画像選択ダイアログ
          // 画像 + 複数画像アノテーション → 画像ID選択ダイアログ
          setTempCocoData({ data, annotationDir });
        }
      } else if (data.images && data.images.length === 1) {
        // 単一画像、そのまま開く
        setCocoData(data);
        setCurrentImageId(data.images[0].id);
      } else {
        // 画像なし、データのみセット
        setCocoData(data);
      }

      // Add to recent files
      addRecentFile({
        path: jsonPath,
        name: jsonPath.split('/').pop() || jsonPath.split('\\').pop() || 'Unknown',
        type: 'annotation',
      });
      toast.success(
        t('success.annotationsLoaded'),
        `${t('success.loaded')} ${data.annotations.length} ${t('controls.annotations').toLowerCase()}`
      );
    } catch (error) {
      console.error('Error loading annotations:', error);
      let errorMessage = 'Failed to load annotations';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = error.message as string;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setError(errorMessage);
      toast.error(t('errors.loadAnnotationsFailed'), errorMessage);
    }
  }, [hasImagesAvailable, setCocoData, setCurrentImageId, setError, addRecentFile, t]);

  const handleGenerateSample = useCallback(() => {
    setShowSampleGenerator(true);
  }, []);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('navigation.selectFolder'),
      });

      // ユーザーがキャンセルした場合
      if (!selected) {
        return; // エラーではないので、何もしない
      }

      if (selected) {
        try {
          // Clear annotations immediately when changing folder
          clearCocoData();

          // Store folder path in navigation store first
          const { setSelectedFolderPath, clearImageList } = useNavigationStore.getState();

          // Clear other state after a microtask to avoid hook issues
          setTimeout(() => {
            // Clear images and image list
            const { clearImage } = useImageStore.getState();
            clearImage();
            clearImageList();

            // Set the new folder path after clearing
            setSelectedFolderPath(selected as string);
          }, 0);

          toast.success(
            'フォルダを選択しました',
            'アノテーションを読み込むとナビゲーション機能が利用可能になります'
          );
        } catch (stateError) {
          console.error('Error updating state after folder selection:', stateError);
          toast.error(
            'フォルダの設定中にエラーが発生しました',
            stateError instanceof Error ? stateError.message : 'Unknown error'
          );
        }
      }
      // キャンセルした場合は何もしない（エラーではない）
    } catch (error) {
      // ダイアログ表示時のエラーのみキャッチ
      console.error('Failed to open folder dialog:', error);
      toast.error(
        'フォルダ選択ダイアログの表示に失敗しました',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }, [t, clearCocoData]);

  const handleExportAnnotations = useCallback(() => {
    const { cocoData } = useAnnotationStore.getState();
    if (!cocoData) return;

    const dataStr = JSON.stringify(cocoData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'annotations.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('success.annotationsExported'), t('success.exported'));
  }, []);

  const handleShowStatistics = useCallback(() => {
    setShowStatistics(true);
  }, []);

  const handleSampleGenerated = useCallback(
    async (imagePath: string, jsonPath: string) => {
      try {
        // Load the generated image
        setLoading(true);
        const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
        const uint8Array = new Uint8Array(imageBytes);
        const blob = new Blob([uint8Array]);
        const dataUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          setImagePath(imagePath);
          setImageData(dataUrl, { width: img.width, height: img.height });
        };
        img.src = dataUrl;

        // Load the generated annotations
        const data = await invoke<COCOData>('load_annotations', { filePath: jsonPath });
        setCocoData(data);
        toast.success(
          t('success.sampleGenerated'),
          `${t('success.generated')} ${data.annotations.length} ${t('controls.annotations').toLowerCase()}`
        );
      } catch (error) {
        console.error('Error loading generated files:', error);
        setError('Failed to load generated files');
        toast.error(t('sampleGenerator.generationFailed'), t('errors.error'));
      }
    },
    [setImagePath, setImageData, setLoading, setError, setCocoData]
  );

  // Common function to load image from path
  const loadImageFromPath = useCallback(
    async (imagePath: string) => {
      try {
        setLoading(true);
        // Reset dialog state when loading new image
        setShowImageSelection(false);
        setTempCocoData(null);

        // Reset to single mode when loading a single image
        const { resetToSingleMode } = useNavigationStore.getState();

        // Use setTimeout to avoid hook execution order issues
        setTimeout(() => {
          clearCocoData();
          resetToSingleMode();
        }, 0);

        const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
        const uint8Array = new Uint8Array(imageBytes);
        const blob = new Blob([uint8Array]);
        const dataUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          setImagePath(imagePath);
          setImageData(dataUrl, { width: img.width, height: img.height });
          clearCocoData();

          // Exit comparison mode if active
          if (isComparing) {
            clearComparison();
          }
          // Add to recent files
          addRecentFile({
            path: imagePath,
            name: imagePath.split('/').pop() || imagePath.split('\\').pop() || 'Unknown',
            type: 'image',
          });
          toast.success(
            t('success.imageLoaded'),
            `${t('success.loaded')}: ${imagePath.split('/').pop() || imagePath.split('\\').pop()}`
          );
        };
        img.onerror = () => {
          setError('Failed to load image');
          toast.error(t('errors.loadImageFailed'), t('errors.invalidImageFormat'));
        };
        img.src = dataUrl;
      } catch (error) {
        console.error('Error loading image:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load image';
        setError(errorMessage);
        toast.error(t('errors.loadImageFailed'), errorMessage);
      }
    },
    [
      setImagePath,
      setImageData,
      setLoading,
      setError,
      clearCocoData,
      addRecentFile,
      isComparing,
      clearComparison,
    ]
  );

  // Common function to load annotations from path
  const loadAnnotationsFromPath = useCallback(
    async (jsonPath: string) => {
      // Check if images are available
      if (!hasImagesAvailable) {
        toast.error(t('errors.loadAnnotationFailed'), t('errors.imageRequiredFirst'));
        return;
      }

      try {
        // Reset previous state
        setShowImageSelection(false);
        setTempCocoData(null);

        const data = await invoke<COCOData>('load_annotations', { filePath: jsonPath });

        // Store the annotation file path for later use
        const annotationDir =
          jsonPath.substring(0, jsonPath.lastIndexOf('/')) ||
          jsonPath.substring(0, jsonPath.lastIndexOf('\\'));

        // Exit comparison mode if active
        if (isComparing) {
          clearComparison();
        }

        // Check if there are multiple images
        if (data.images && data.images.length > 1) {
          // フォルダモード（ナビゲーション有効）の場合は直接セット
          if (navigationMode === 'folder') {
            // フォルダ + 複数画像アノテーション → そのまま開く（ナビゲーションモード）
            setCocoData(data);
            // 最初の画像IDをセット
            setCurrentImageId(data.images[0].id);
          } else {
            // 画像モード（単一画像）の場合は画像選択ダイアログ
            // 画像 + 複数画像アノテーション → 画像ID選択ダイアログ
            setTempCocoData({ data, annotationDir });
          }
        } else if (data.images && data.images.length === 1) {
          // 単一画像、そのまま開く
          setCocoData(data);
          setCurrentImageId(data.images[0].id);
        } else {
          // 画像なし、データのみセット
          setCocoData(data);
        }

        // Add to recent files
        addRecentFile({
          path: jsonPath,
          name: jsonPath.split('/').pop() || jsonPath.split('\\').pop() || 'Unknown',
          type: 'annotation',
        });
        toast.success(
          t('success.annotationsLoaded'),
          `${t('success.loaded')} ${data.annotations.length} ${t('controls.annotations').toLowerCase()}`
        );
      } catch (error) {
        console.error('Error loading annotations:', error);
        let errorMessage = 'Failed to load annotations';
        if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = error.message as string;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        setError(errorMessage);
        toast.error(t('errors.loadAnnotationsFailed'), errorMessage);
      }
    },
    [
      hasImagesAvailable,
      setCocoData,
      setError,
      addRecentFile,
      loadImageFromPath,
      isComparing,
      clearComparison,
      setCurrentImageId,
      t,
    ]
  );

  // Handle recent file selection
  const handleRecentFileSelect = useCallback(
    (file: RecentFile) => {
      if (file.type === 'image') {
        loadImageFromPath(file.path);
      } else {
        loadAnnotationsFromPath(file.path);
      }
    },
    [loadImageFromPath, loadAnnotationsFromPath]
  );

  // Listen for menu events
  useMenuEvents(
    handleOpenImage,
    handleOpenAnnotations,
    handleGenerateSample,
    handleExportAnnotations,
    handleShowStatistics,
    openSettingsModal,
    () => setShowComparisonDialog(true),
    () => setShowHistogramDialog(true),
    openHeatmapModal
  );

  // Handle drag and drop
  useDragAndDrop({
    onImageDrop: loadImageFromPath,
    onAnnotationDrop: loadAnnotationsFromPath,
  });

  // Auto-show right panel when annotation is selected
  const { selectedAnnotationIds } = useAnnotationStore();
  const prevSelectedAnnotationIdsRef = useRef<(number | string)[]>([]);

  useEffect(() => {
    const prevLength = prevSelectedAnnotationIdsRef.current.length;
    const currentLength = selectedAnnotationIds.length;

    // Only auto-show when going from 0 to >0 selections
    if (prevLength === 0 && currentLength > 0) {
      if (isSmallScreen || isCompactScreen || isMediumScreen) {
        setActiveUnifiedTab('detail');
        setUnifiedPanelVisible(true);
      } else {
        showRightPanelForSelection();
        setActiveRightTab('detail');
      }
    }

    prevSelectedAnnotationIdsRef.current = selectedAnnotationIds;
  }, [
    selectedAnnotationIds,
    showRightPanelForSelection,
    isSmallScreen,
    isCompactScreen,
    isMediumScreen,
  ]);

  // Keyboard shortcuts
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
            toggleLeftPanel();
            break;
          case 'o':
            e.preventDefault();
            handleOpenImage();
            break;
          case 'j':
            e.preventDefault();
            handleOpenAnnotations();
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
            if (cocoData) handleShowStatistics();
            break;
          case 'k':
            e.preventDefault();
            if (cocoData) setShowComparisonDialog(true);
            break;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isSmallScreen || isCompactScreen || isMediumScreen) {
          setUnifiedPanelVisible(false);
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
    handleOpenImage,
    handleOpenAnnotations,
    cocoData,
    handleShowStatistics,
    toggleLeftPanel,
    isSmallScreen,
    isCompactScreen,
    isMediumScreen,
  ]);

  return (
    <div className={`app app--${screenSize}`}>
      <main className="app-main">
        {/* Unified Panel for Small, Compact and Medium Screens */}
        {isSmallScreen || isCompactScreen || isMediumScreen
          ? unifiedPanelVisible && (
              <aside
                className={`unified-panel unified-panel--overlay unified-panel--visible ${isMediumScreen ? 'unified-panel--horizontal' : 'unified-panel--vertical'}`}
              >
                <div
                  className="unified-panel-backdrop"
                  onClick={() => setUnifiedPanelVisible(false)}
                />
                <div className="unified-panel-container">
                  <div className="unified-panel-header">
                    <div className="unified-panel-tabs">
                      {[...panelLayout.leftPanelTabs, ...panelLayout.rightPanelTabs].map((tab) => (
                        <button
                          key={tab}
                          className={`tab ${activeUnifiedTab === tab ? 'active' : ''}`}
                          onClick={() => setActiveUnifiedTab(tab)}
                        >
                          {getTabIcon(tab)}
                          {!isMediumScreen && getTabTitle(tab)}
                        </button>
                      ))}
                    </div>
                    <button
                      className="unified-panel-close"
                      onClick={() => setUnifiedPanelVisible(false)}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="unified-panel-content">{renderTabContent(activeUnifiedTab)}</div>
                </div>
              </aside>
            )
          : /* Left Panel for Large Screens Only */
            shouldRenderLeftPanel &&
            panelLayout.leftPanelTabs.length > 0 && (
              <aside
                className={`sidebar sidebar--${leftPanelLayout} ${leftPanelVisible ? 'sidebar--visible' : ''}`}
              >
                {leftPanelLayout === 'overlay' && leftPanelVisible && (
                  <div className="sidebar-backdrop" onClick={toggleLeftPanel} />
                )}
                <div className="sidebar-container">
                  <div className="sidebar-header">
                    <div className="sidebar-tabs">
                      {panelLayout.leftPanelTabs.map((tab) => (
                        <button
                          key={tab}
                          className={`tab ${activeLeftTab === tab ? 'active' : ''}`}
                          onClick={() => setActiveLeftTab(tab)}
                        >
                          {getTabIcon(tab)}
                          {getTabTitle(tab)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sidebar-content">{renderTabContent(activeLeftTab)}</div>
                </div>
              </aside>
            )}

        {/* Main Content */}
        <div className="app-content">
          <div className="viewer-container">
            {imageSize ? (
              <ImageViewer />
            ) : (
              <div className="empty-state">
                <div className="empty-state-content">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <h3>{t('empty.noImageLoaded')}</h3>
                  <p>{t('empty.openImagePrompt')}</p>
                  <div className="empty-state-actions">
                    <button className="btn btn-primary" onClick={handleOpenImage}>
                      {t('empty.openImage')}
                    </button>
                    <button className="btn btn-secondary" onClick={handleOpenAnnotations}>
                      {t('empty.openAnnotations')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel for Large Screens Only */}
        {isLargeScreen && shouldRenderRightPanel && panelLayout.rightPanelTabs.length > 0 && (
          <aside
            className={`sidebar sidebar--${rightPanelLayout} ${rightPanelVisible ? 'sidebar--visible' : ''}`}
          >
            {rightPanelLayout === 'overlay' && rightPanelVisible && (
              <div className="sidebar-backdrop" onClick={toggleRightPanel} />
            )}
            <div className="sidebar-container">
              <div className="sidebar-header">
                <div className="sidebar-tabs">
                  {panelLayout.rightPanelTabs.map((tab) => (
                    <button
                      key={tab}
                      className={`tab ${activeRightTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveRightTab(tab)}
                    >
                      {getTabIcon(tab)}
                      {getTabTitle(tab)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sidebar-content">{renderTabContent(activeRightTab)}</div>
            </div>
          </aside>
        )}
      </main>

      {/* Floating Action Button for Small/Compact/Medium Screens */}
      {(isSmallScreen || isCompactScreen || isMediumScreen) && !unifiedPanelVisible && (
        <div className="floating-controls">
          <button
            className="fab fab--primary"
            onClick={() => setUnifiedPanelVisible(true)}
            title={t('menu.showSidebar')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <SampleGeneratorDialog
        isOpen={showSampleGenerator}
        onClose={() => setShowSampleGenerator(false)}
        onGenerated={handleSampleGenerated}
      />

      <StatisticsDialog isOpen={showStatistics} onClose={() => setShowStatistics(false)} />

      <SettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />

      <ImageSelectionDialog
        isOpen={showImageSelection && tempCocoData !== null}
        onClose={() => {
          setShowImageSelection(false);
          setTempCocoData(null);
        }}
        images={tempCocoData?.data.images || []}
        currentImageFileName={
          useImageStore.getState().imagePath?.split('/').pop() ||
          useImageStore.getState().imagePath?.split('\\').pop()
        }
        onSelect={async (image) => {
          if (tempCocoData) {
            // Set the COCO data now that user has selected an image
            setCocoData(tempCocoData.data);
            setCurrentImageId(image.id);
            setShowImageSelection(false);

            // Clear temporary data
            setTempCocoData(null);

            // Notify user that they need to open the actual image file
            toast.info(t('info.imageIdSelected'), t('info.pleaseOpenImage'));
          }
        }}
      />

      <ComparisonDialog
        isOpen={showComparisonDialog}
        onClose={() => setShowComparisonDialog(false)}
      />

      <CommonModal
        isOpen={showHistogramDialog}
        onClose={() => setShowHistogramDialog(false)}
        title={t('histogram.title')}
        size="xl"
        hasBlur={true}
      >
        <HistogramPanel />
      </CommonModal>

      <HeatmapDialog />

      <ToastContainer toasts={toasts} onClose={removeToast} />
      <LoadingOverlay
        isLoading={isLoading}
        message={message}
        subMessage={subMessage}
        progress={progress}
      />
    </div>
  );
}

export default App;
