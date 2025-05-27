import { useCallback, useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import './App.css';
import './styles/modern.css';
import './styles/themes.css';
import ImageViewer from './components/ImageViewer';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';
import SampleGeneratorDialog from './components/SampleGeneratorDialog';
import StatisticsDialog from './components/StatisticsDialog';
import AnnotationDetailPanel from './components/AnnotationDetailPanel';
import SettingsModal from './components/SettingsModal';
import ImageSelectionDialog from './components/ImageSelectionDialog';
import { ToastContainer } from './components/Toast';
import {
  useAnnotationStore,
  useImageStore,
  useToastStore,
  useRecentFilesStore,
  useSettingsStore,
  toast,
} from './stores';
import type { RecentFile } from './stores';
import { useMenuEvents } from './hooks/useMenuEvents';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { COCOData } from './types/coco';
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  const { cocoData, setCocoData, clearCocoData, setCurrentImageId } = useAnnotationStore();
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
  const { isSettingsModalOpen, openSettingsModal, closeSettingsModal } = useSettingsStore();
  const [activePanel, setActivePanel] = useState<'control' | 'info' | 'detail'>('control');
  const [unifiedPanelVisible, setUnifiedPanelVisible] = useState(false);
  const [showSampleGenerator, setShowSampleGenerator] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [tempCocoData, setTempCocoData] = useState<{
    data: COCOData;
    annotationDir: string;
  } | null>(null);

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
    shouldRenderLeftPanel,
    shouldRenderRightPanel,
    isSmallScreen,
    isCompactScreen,
    isMediumScreen,
    isLargeScreen,
  } = useResponsiveLayout();

  // Show image selection dialog when tempCocoData is set
  useEffect(() => {
    if (tempCocoData) {
      setShowImageSelection(true);
    }
  }, [tempCocoData]);

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

      const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
      const uint8Array = new Uint8Array(imageBytes);
      const blob = new Blob([uint8Array]);
      const dataUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        setImagePath(imagePath);
        setImageData(dataUrl, { width: img.width, height: img.height });
        // Clear annotations when loading a new image
        clearCocoData();
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
        // Store data temporarily but don't set it in the store yet
        setTempCocoData({ data, annotationDir });
        // Dialog will be shown by useEffect when tempCocoData is set
      } else if (data.images && data.images.length === 1) {
        // Single image, set it immediately
        setCocoData(data);
        setCurrentImageId(data.images[0].id);
      } else {
        // No images, just set the data
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
  }, [setCocoData, setCurrentImageId, setError, addRecentFile, t]);

  const handleGenerateSample = useCallback(() => {
    setShowSampleGenerator(true);
  }, []);

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
        const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
        const uint8Array = new Uint8Array(imageBytes);
        const blob = new Blob([uint8Array]);
        const dataUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          setImagePath(imagePath);
          setImageData(dataUrl, { width: img.width, height: img.height });
          clearCocoData();
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
    [setImagePath, setImageData, setLoading, setError, clearCocoData, addRecentFile]
  );

  // Common function to load annotations from path
  const loadAnnotationsFromPath = useCallback(
    async (jsonPath: string) => {
      try {
        // Reset previous state
        setShowImageSelection(false);
        setTempCocoData(null);

        const data = await invoke<COCOData>('load_annotations', { filePath: jsonPath });

        // Store the annotation file path for later use
        const annotationDir =
          jsonPath.substring(0, jsonPath.lastIndexOf('/')) ||
          jsonPath.substring(0, jsonPath.lastIndexOf('\\'));

        // Check if there are multiple images
        if (data.images && data.images.length > 1) {
          // Store data temporarily but don't set it in the store yet
          setTempCocoData({ data, annotationDir });
          // Dialog will be shown by useEffect when tempCocoData is set
        } else if (data.images && data.images.length === 1) {
          // Single image, set it immediately
          setCocoData(data);
          setCurrentImageId(data.images[0].id);
        } else {
          // No images, just set the data
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
    [setCocoData, setError, addRecentFile, loadImageFromPath]
  );

  // Listen for menu events
  useMenuEvents(
    handleOpenImage,
    handleOpenAnnotations,
    handleGenerateSample,
    handleExportAnnotations,
    handleShowStatistics,
    openSettingsModal
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

  // Handle drag and drop
  useDragAndDrop({
    onImageDrop: loadImageFromPath,
    onAnnotationDrop: loadAnnotationsFromPath,
  });

  // Auto-show right panel when annotation is selected
  const { selectedAnnotationIds } = useAnnotationStore();
  const prevSelectedAnnotationIdsRef = useRef<number[]>([]);

  useEffect(() => {
    const prevLength = prevSelectedAnnotationIdsRef.current.length;
    const currentLength = selectedAnnotationIds.length;

    // Only auto-show when going from 0 to >0 selections
    if (prevLength === 0 && currentLength > 0) {
      if (isSmallScreen || isCompactScreen || isMediumScreen) {
        setActivePanel('detail');
        setUnifiedPanelVisible(true);
      } else {
        showRightPanelForSelection();
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
                      <button
                        className={`tab ${activePanel === 'control' ? 'active' : ''}`}
                        onClick={() => setActivePanel('control')}
                      >
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
                        {!isMediumScreen && t('controls.title')}
                      </button>
                      <button
                        className={`tab ${activePanel === 'info' ? 'active' : ''}`}
                        onClick={() => setActivePanel('info')}
                      >
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
                        {!isMediumScreen && t('info.title')}
                      </button>
                      <button
                        className={`tab ${activePanel === 'detail' ? 'active' : ''}`}
                        onClick={() => setActivePanel('detail')}
                      >
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
                        {!isMediumScreen && t('detail.title')}
                      </button>
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
                  <div className="unified-panel-content">
                    {activePanel === 'control' && <ControlPanel />}
                    {activePanel === 'info' && (
                      <InfoPanel onRecentFileSelect={handleRecentFileSelect} />
                    )}
                    {activePanel === 'detail' && <AnnotationDetailPanel />}
                  </div>
                </div>
              </aside>
            )
          : /* Left Panel for Large Screens Only */
            shouldRenderLeftPanel && (
              <aside
                className={`sidebar sidebar--${leftPanelLayout} ${leftPanelVisible ? 'sidebar--visible' : ''}`}
              >
                {leftPanelLayout === 'overlay' && leftPanelVisible && (
                  <div className="sidebar-backdrop" onClick={toggleLeftPanel} />
                )}
                <div className="sidebar-container">
                  <div className="sidebar-header">
                    <div className="sidebar-tabs">
                      <button
                        className={`tab ${activePanel === 'control' ? 'active' : ''}`}
                        onClick={() => setActivePanel('control')}
                      >
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
                        {t('controls.title')}
                      </button>
                      <button
                        className={`tab ${activePanel === 'info' ? 'active' : ''}`}
                        onClick={() => setActivePanel('info')}
                      >
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
                        {t('info.title')}
                      </button>
                    </div>
                  </div>
                  <div className="sidebar-content">
                    {activePanel === 'control' ? (
                      <ControlPanel />
                    ) : (
                      <InfoPanel onRecentFileSelect={handleRecentFileSelect} />
                    )}
                  </div>
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
        {isLargeScreen && shouldRenderRightPanel && (
          <aside
            className={`sidebar sidebar--${rightPanelLayout} ${rightPanelVisible ? 'sidebar--visible' : ''}`}
          >
            {rightPanelLayout === 'overlay' && rightPanelVisible && (
              <div className="sidebar-backdrop" onClick={toggleRightPanel} />
            )}
            <div className="sidebar-container">
              <div className="sidebar-header">
                <div className="sidebar-tabs">
                  <button className="tab active">
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
                    {t('detail.title')}
                  </button>
                </div>
              </div>
              <div className="sidebar-content">
                <AnnotationDetailPanel />
              </div>
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
        isOpen={showImageSelection}
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

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
