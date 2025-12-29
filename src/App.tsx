import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import './styles/modern.css';
import './styles/themes.css';
import ImageViewer from './components/ImageViewer';
import SampleGeneratorDialog from './components/SampleGeneratorDialog';
import StatisticsDialog from './components/StatisticsDialog';
import SettingsModal from './components/SettingsModal';
import ImageSelectionDialog from './components/ImageSelectionDialog';
import { ComparisonDialog } from './components/ComparisonDialog';
import { CommonModal } from './components/CommonModal';
import { HistogramPanel } from './components/HistogramPanel';
import { HeatmapDialog } from './components/HeatmapDialog';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';
import {
  Sidebar,
  UnifiedPanel,
  EmptyState,
  FloatingActionButton,
  TabContent,
} from './components/Layout';
import { AnnotationToolbar } from './components/AnnotationToolbar';
import {
  useAnnotationStore,
  useImageStore,
  useToastStore,
  useSettingsStore,
  useLoadingStore,
  useHeatmapStore,
  useModeStore,
  toast,
} from './stores';
import type { TabType } from './stores';
import { useMenuEvents } from './hooks/useMenuEvents';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { useFileOperations } from './hooks/useFileOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { t } = useTranslation();
  const { setCocoData, setCurrentImageId, selectedAnnotationIds } = useAnnotationStore();
  const { imageSize } = useImageStore();
  const { toasts, removeToast } = useToastStore();
  const { isSettingsModalOpen, openSettingsModal, closeSettingsModal, panelLayout } =
    useSettingsStore();
  const { isLoading, message, subMessage, progress } = useLoadingStore();
  const { openModal: openHeatmapModal } = useHeatmapStore();
  const appMode = useModeStore((state) => state.mode);

  // File operations hook
  const fileOps = useFileOperations();

  // Panel state
  const [activeLeftTab, setActiveLeftTab] = useState<string>(() => {
    const defaultTab = panelLayout.defaultLeftTab;
    return panelLayout.leftPanelTabs.includes(defaultTab as TabType)
      ? defaultTab
      : panelLayout.leftPanelTabs[0] || 'control';
  });
  const [activeRightTab, setActiveRightTab] = useState<string>(() => {
    const defaultTab = panelLayout.defaultRightTab;
    return panelLayout.rightPanelTabs.includes(defaultTab as TabType)
      ? defaultTab
      : panelLayout.rightPanelTabs[0] || 'info';
  });
  const prevPanelLayoutRef = useRef(panelLayout);
  const [unifiedPanelVisible, setUnifiedPanelVisible] = useState(false);
  const [activeUnifiedTab, setActiveUnifiedTab] = useState<string>('control');

  // Responsive layout
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

  const isSmallOrMediumScreen = isSmallScreen || isCompactScreen || isMediumScreen;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onOpenImage: fileOps.handleOpenImage,
    onOpenAnnotations: fileOps.handleOpenAnnotations,
    onShowStatistics: fileOps.handleShowStatistics,
    onShowComparisonDialog: () => fileOps.setShowComparisonDialog(true),
    onToggleLeftPanel: toggleLeftPanel,
    onCloseUnifiedPanel: () => setUnifiedPanelVisible(false),
    isSmallOrMediumScreen,
  });

  // Menu events
  useMenuEvents({
    onOpenImage: fileOps.handleOpenImage,
    onOpenAnnotations: fileOps.handleOpenAnnotations,
    onGenerateSample: fileOps.handleGenerateSample,
    onExportAnnotations: fileOps.handleExportAnnotations,
    onShowStatistics: fileOps.handleShowStatistics,
    onShowSettings: openSettingsModal,
    onShowComparison: () => fileOps.setShowComparisonDialog(true),
    onShowHistogram: () => fileOps.setShowHistogramDialog(true),
    onShowHeatmap: openHeatmapModal,
    onToggleSidebar: toggleLeftPanel,
    onShowAbout: () => {
      toast.info('COAV v1.1.0 - COCO Annotation Viewer');
    },
    onShowShortcuts: () => {
      toast.info(
        t(
          'help.shortcutsHint',
          'キーボードショートカット: ⌘+O (画像を開く), ⌘+⇧+O (アノテーションを開く)'
        )
      );
    },
  });

  // Drag and drop
  useDragAndDrop({
    onImageDrop: fileOps.loadImageFromPath,
    onAnnotationDrop: fileOps.loadAnnotationsFromPath,
  });

  // Show image selection dialog when tempCocoData is set
  useEffect(() => {
    if (fileOps.tempCocoData && fileOps.tempCocoData.data.images.length > 1) {
      fileOps.setShowImageSelection(true);
    }
  }, [fileOps.tempCocoData]);

  // Handle panel layout changes
  useEffect(() => {
    const prevLayout = prevPanelLayoutRef.current;

    if (
      JSON.stringify(prevLayout.leftPanelTabs) !== JSON.stringify(panelLayout.leftPanelTabs) ||
      JSON.stringify(prevLayout.rightPanelTabs) !== JSON.stringify(panelLayout.rightPanelTabs)
    ) {
      if (panelLayout.leftPanelTabs.length > 0) {
        if (!panelLayout.leftPanelTabs.includes(activeLeftTab as TabType)) {
          setActiveLeftTab(panelLayout.leftPanelTabs[0]);
        }
      }

      if (panelLayout.rightPanelTabs.length > 0) {
        if (!panelLayout.rightPanelTabs.includes(activeRightTab as TabType)) {
          setActiveRightTab(panelLayout.rightPanelTabs[0]);
        }
      }

      const allTabs = [...panelLayout.leftPanelTabs, ...panelLayout.rightPanelTabs];
      if (!allTabs.includes(activeUnifiedTab as TabType) && allTabs.length > 0) {
        setActiveUnifiedTab(allTabs[0]);
      }

      if (isLargeScreen) {
        if (panelLayout.leftPanelTabs.length > 0) showLeftPanel();
        if (panelLayout.rightPanelTabs.length > 0) showRightPanel();
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

  // Auto-show right panel when annotation is selected
  const prevSelectedAnnotationIdsRef = useRef<(number | string)[]>([]);

  useEffect(() => {
    const prevLength = prevSelectedAnnotationIdsRef.current.length;
    const currentLength = selectedAnnotationIds.length;

    if (prevLength === 0 && currentLength > 0) {
      if (isSmallOrMediumScreen) {
        setActiveUnifiedTab('detail');
        setUnifiedPanelVisible(true);
      } else {
        showRightPanelForSelection();
        setActiveRightTab('detail');
      }
    }

    prevSelectedAnnotationIdsRef.current = selectedAnnotationIds;
  }, [selectedAnnotationIds, showRightPanelForSelection, isSmallOrMediumScreen]);

  // Tab content renderer
  const renderTabContent = useCallback(
    (tab: string) => (
      <TabContent
        tab={tab}
        onOpenComparisonDialog={() => fileOps.setShowComparisonDialog(true)}
        onOpenImage={fileOps.handleOpenImage}
        onOpenAnnotations={fileOps.handleOpenAnnotations}
        onOpenFolder={fileOps.handleOpenFolder}
        onFileSelect={fileOps.handleRecentFileSelect}
      />
    ),
    [fileOps]
  );

  const allTabs = [...panelLayout.leftPanelTabs, ...panelLayout.rightPanelTabs];

  return (
    <div className={`app app--${screenSize}`}>
      <main className="app-main">
        {/* Unified Panel for Small/Compact/Medium Screens */}
        {isSmallOrMediumScreen
          ? unifiedPanelVisible && (
              <UnifiedPanel
                tabs={allTabs}
                activeTab={activeUnifiedTab}
                onTabChange={setActiveUnifiedTab}
                onClose={() => setUnifiedPanelVisible(false)}
                isHorizontal={isMediumScreen}
                renderContent={renderTabContent}
              />
            )
          : /* Left Panel for Large Screens */
            shouldRenderLeftPanel && (
              <Sidebar
                tabs={panelLayout.leftPanelTabs}
                activeTab={activeLeftTab}
                onTabChange={setActiveLeftTab}
                layout={leftPanelLayout}
                visible={leftPanelVisible}
                onToggle={toggleLeftPanel}
                renderContent={renderTabContent}
                showModeSelector={true}
              />
            )}

        {/* Main Content */}
        <div className="app-content">
          {appMode === 'annotation' && <AnnotationToolbar />}
          <div className="viewer-container">
            {imageSize ? (
              <ImageViewer />
            ) : (
              <EmptyState
                onOpenImage={fileOps.handleOpenImage}
                onOpenAnnotations={fileOps.handleOpenAnnotations}
              />
            )}
          </div>
        </div>

        {/* Right Panel for Large Screens */}
        {isLargeScreen && shouldRenderRightPanel && (
          <Sidebar
            tabs={panelLayout.rightPanelTabs}
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
            layout={rightPanelLayout}
            visible={rightPanelVisible}
            onToggle={toggleRightPanel}
            renderContent={renderTabContent}
          />
        )}
      </main>

      {/* Floating Action Button for Small/Compact/Medium Screens */}
      {isSmallOrMediumScreen && !unifiedPanelVisible && (
        <FloatingActionButton onClick={() => setUnifiedPanelVisible(true)} />
      )}

      {/* Dialogs */}
      <SampleGeneratorDialog
        isOpen={fileOps.showSampleGenerator}
        onClose={() => fileOps.setShowSampleGenerator(false)}
        onGenerated={fileOps.handleSampleGenerated}
      />

      <StatisticsDialog
        isOpen={fileOps.showStatistics}
        onClose={() => fileOps.setShowStatistics(false)}
      />

      <SettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />

      <ImageSelectionDialog
        isOpen={fileOps.showImageSelection && fileOps.tempCocoData !== null}
        onClose={() => {
          fileOps.setShowImageSelection(false);
          fileOps.setTempCocoData(null);
        }}
        images={fileOps.tempCocoData?.data.images || []}
        currentImageFileName={
          useImageStore.getState().imagePath?.split('/').pop() ||
          useImageStore.getState().imagePath?.split('\\').pop()
        }
        onSelect={async (image) => {
          if (fileOps.tempCocoData) {
            setCocoData(fileOps.tempCocoData.data);
            setCurrentImageId(image.id);
            fileOps.setShowImageSelection(false);
            fileOps.setTempCocoData(null);
            toast.info(t('info.imageIdSelected'), t('info.pleaseOpenImage'));
          }
        }}
      />

      <ComparisonDialog
        isOpen={fileOps.showComparisonDialog}
        onClose={() => fileOps.setShowComparisonDialog(false)}
      />

      <CommonModal
        isOpen={fileOps.showHistogramDialog}
        onClose={() => fileOps.setShowHistogramDialog(false)}
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
