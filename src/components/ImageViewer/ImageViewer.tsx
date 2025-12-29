import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useTranslation } from 'react-i18next';
import { useImageStore, useAnnotationStore, useNavigationStore, useModeStore, useEditorStore } from '../../stores';
import AnnotationLayer from '../AnnotationLayer';
import { DrawingLayer } from '../DrawingLayer';
import './ImageViewer.css';

const ImageViewer: React.FC = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setLocalContainerSize] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [hasAutoFitted, setHasAutoFitted] = useState(false);

  const {
    imageData,
    imageSize,
    zoom,
    pan,
    setZoom,
    setPan,
    fitToWindow,
    setContainerSize,
    isLoading,
    error,
    preserveViewState,
  } = useImageStore();

  const { cocoData, selectedAnnotationIds, shouldCenterOnSelection, currentImageId, isComparing } =
    useAnnotationStore();

  const { navigationMode } = useNavigationStore();
  const appMode = useModeStore((state) => state.mode);
  const currentTool = useEditorStore((state) => state.currentTool);

  // アノテーションモードで描画ツール（bbox/polygon）使用中はStageのドラッグを無効にする
  const isDraggable = !(appMode === 'annotation' && currentTool !== 'select');

  // Calculate viewport for culling
  const getViewport = useCallback(() => {
    if (!containerSize.width || !containerSize.height) return undefined;

    // Calculate the visible area in image coordinates
    const viewportX = -pan.x / zoom;
    const viewportY = -pan.y / zoom;
    const viewportWidth = containerSize.width / zoom;
    const viewportHeight = containerSize.height / zoom;

    return {
      x: viewportX,
      y: viewportY,
      width: viewportWidth,
      height: viewportHeight,
    };
  }, [pan, zoom, containerSize]);

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const size = {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        };
        setLocalContainerSize(size);
        setContainerSize(size);
      }
    };

    // Use ResizeObserver for more reliable size detection
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      updateSize(); // Initial size
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [setContainerSize]);

  // Load image when imageData changes
  useEffect(() => {
    if (imageData) {
      const img = new window.Image();
      img.onload = () => {
        setImage(img);
      };
      img.src = imageData;
      // Only reset auto-fit flag in single mode (not in folder navigation mode)
      if (navigationMode === 'single') {
        setHasAutoFitted(false);
      }
    } else {
      setImage(null);
      setHasAutoFitted(false); // Reset auto-fit flag when image is cleared
    }
  }, [imageData, navigationMode]);

  // Auto-fit image when both image and container size are available (first time only or in single mode)
  useEffect(() => {
    if (image && containerSize.width > 0 && containerSize.height > 0) {
      // Don't auto-fit if preserveViewState is true
      if (preserveViewState) {
        return;
      }

      // In folder mode, only auto-fit if it's the first time for this session
      // In single mode, always auto-fit new images
      if (navigationMode === 'single' || !hasAutoFitted) {
        // Small delay to ensure container size is properly set in store
        setTimeout(() => {
          fitToWindow();
          setHasAutoFitted(true);
        }, 0);
      }
    }
  }, [
    image,
    containerSize.width,
    containerSize.height,
    fitToWindow,
    hasAutoFitted,
    navigationMode,
    preserveViewState,
  ]);

  // Auto-scroll to selected annotation only when flagged (e.g., from search)
  useEffect(() => {
    if (!cocoData || selectedAnnotationIds.length === 0 || !imageSize || !shouldCenterOnSelection)
      return;

    const selectedId = selectedAnnotationIds[selectedAnnotationIds.length - 1];
    const annotation = cocoData.annotations.find((ann) => ann.id === selectedId);
    if (!annotation) return;

    // Calculate annotation center
    const bbox = annotation.bbox;
    const centerX = bbox[0] + bbox[2] / 2;
    const centerY = bbox[1] + bbox[3] / 2;

    // Calculate required pan to center the annotation
    const targetPanX = containerSize.width / 2 - centerX * zoom;
    const targetPanY = containerSize.height / 2 - centerY * zoom;

    setPan(targetPanX, targetPanY);

    // Reset the flag after centering
    useAnnotationStore.setState({ shouldCenterOnSelection: false });
  }, [
    selectedAnnotationIds,
    cocoData,
    imageSize,
    zoom,
    containerSize,
    setPan,
    shouldCenterOnSelection,
  ]);

  // Handle wheel zoom - always zoom to viewport center
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const scaleBy = 1.1;
      const oldScale = stage.scaleX();

      // Always use viewport center for zoom
      const viewportCenter = {
        x: containerSize.width / 2,
        y: containerSize.height / 2,
      };

      const mousePointTo = {
        x: (viewportCenter.x - stage.x()) / oldScale,
        y: (viewportCenter.y - stage.y()) / oldScale,
      };

      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

      setZoom(newScale);

      const newPos = {
        x: viewportCenter.x - mousePointTo.x * newScale,
        y: viewportCenter.y - mousePointTo.y * newScale,
      };

      setPan(newPos.x, newPos.y);
    },
    [setZoom, setPan, containerSize]
  );

  // Handle drag
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const stage = e.target as Konva.Stage;
      setPan(stage.x(), stage.y());
    },
    [setPan]
  );

  return (
    <div ref={containerRef} className="image-viewer">
      {error ? (
        <div className="error">
          <p>
            {t('errors.error')}: {error}
          </p>
        </div>
      ) : isLoading ? (
        <div className="loading">
          <p>{t('loading', 'Loading...')}</p>
        </div>
      ) : !image || !imageSize ? (
        <div className="empty">
          <p>{t('info.noImageLoaded')}</p>
        </div>
      ) : (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          draggable={isDraggable}
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          scaleX={zoom}
          scaleY={zoom}
          x={pan.x}
          y={pan.y}
        >
          <Layer>
            <KonvaImage image={image} width={imageSize.width} height={imageSize.height} />
          </Layer>
          {cocoData && currentImageId && (
            <AnnotationLayer
              key={`annotation-layer-${currentImageId}-${isComparing ? 'comparing' : 'normal'}`}
              imageId={currentImageId}
              scale={zoom}
              viewport={getViewport()}
            />
          )}
          {appMode === 'annotation' && currentImageId && (
            <DrawingLayer
              scale={zoom}
              stageRef={stageRef}
              imageId={currentImageId}
            />
          )}
        </Stage>
      )}
    </div>
  );
};

export default ImageViewer;
