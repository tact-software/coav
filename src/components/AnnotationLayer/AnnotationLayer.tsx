import React, { useCallback, useEffect, useRef } from 'react';
import { Layer, Line, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useAnnotationStore, useSettingsStore } from '../../stores';
import { COCOAnnotation } from '../../types/coco';

interface AnnotationLayerProps {
  imageId: number;
  scale?: number;
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({ imageId, scale = 1, viewport }) => {
  const {
    cocoData,
    selectedAnnotationIds,
    hoveredAnnotationId,
    visibleCategoryIds,
    selectAnnotation,
    setHoveredAnnotation,
    getCategoryById,
  } = useAnnotationStore();

  const { display } = useSettingsStore();

  // Performance monitoring in development
  const renderCountRef = useRef(0);

  const getAnnotationColor = useCallback(
    (categoryId: number, isSelected: boolean, isHovered: boolean) => {
      // カテゴリに基づいた色を生成
      const hue = (categoryId * 137.5) % 360; // Golden angle approximation
      const saturation = isSelected || isHovered ? 70 : 50;
      const lightness = isSelected ? 60 : isHovered ? 55 : 50;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    },
    []
  );

  const handleClick = useCallback(
    (annotation: COCOAnnotation, e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
      selectAnnotation(annotation.id, multiSelect);
    },
    [selectAnnotation]
  );

  const handleMouseEnter = useCallback(
    (annotationId: number) => {
      setHoveredAnnotation(annotationId);
    },
    [setHoveredAnnotation]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredAnnotation(null);
  }, [setHoveredAnnotation]);

  // Viewport culling function
  const isInViewport = useCallback(
    (annotation: COCOAnnotation) => {
      if (!viewport) return true; // If no viewport is specified, render all

      const [x, y, width, height] = annotation.bbox;
      const annotationRight = x + width;
      const annotationBottom = y + height;
      const viewportRight = viewport.x + viewport.width;
      const viewportBottom = viewport.y + viewport.height;

      // Check if annotation bounding box intersects with viewport
      return !(
        x > viewportRight ||
        annotationRight < viewport.x ||
        y > viewportBottom ||
        annotationBottom < viewport.y
      );
    },
    [viewport]
  );

  if (!cocoData) return null;

  const annotations = cocoData.annotations.filter(
    (ann) =>
      ann.image_id === imageId && visibleCategoryIds.includes(ann.category_id) && isInViewport(ann)
  );

  // Performance monitoring in development
  useEffect(() => {
    renderCountRef.current++;
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `AnnotationLayer render #${renderCountRef.current}, visible annotations: ${annotations.length}`
      );
    }
  });

  // Determine LOD based on zoom level
  const lodLevel = scale > 2 ? 'high' : scale > 0.5 ? 'medium' : 'low';

  // Group annotations by category for batching
  const annotationsByCategory = annotations.reduce(
    (acc, annotation) => {
      if (!acc[annotation.category_id]) {
        acc[annotation.category_id] = [];
      }
      acc[annotation.category_id].push(annotation);
      return acc;
    },
    {} as Record<number, COCOAnnotation[]>
  );

  return (
    <Layer>
      {/* Render non-interactive elements in batches by category */}
      {Object.entries(annotationsByCategory).map(([categoryId, categoryAnnotations]) => {
        const catId = parseInt(categoryId);
        const baseColor = getAnnotationColor(catId, false, false);

        return (
          <Group key={`batch-${categoryId}`}>
            {/* Batch render bounding boxes for this category */}
            {display.showBoundingBoxes &&
              lodLevel === 'low' &&
              categoryAnnotations
                .filter(
                  (ann) => !selectedAnnotationIds.includes(ann.id) && hoveredAnnotationId !== ann.id
                )
                .map((annotation) => (
                  <Rect
                    key={`bbox-${annotation.id}`}
                    x={annotation.bbox[0]}
                    y={annotation.bbox[1]}
                    width={annotation.bbox[2]}
                    height={annotation.bbox[3]}
                    stroke={baseColor}
                    strokeWidth={display.lineWidth}
                    strokeOpacity={display.annotationOpacity * 0.5}
                    fill="transparent"
                    listening={false} // Disable events for performance
                  />
                ))}
          </Group>
        );
      })}

      {/* Render interactive elements individually */}
      {annotations.map((annotation) => {
        const isSelected = selectedAnnotationIds.includes(annotation.id);
        const isHovered = hoveredAnnotationId === annotation.id;
        const category = getCategoryById(annotation.category_id);
        const color = getAnnotationColor(annotation.category_id, isSelected, isHovered);

        // Always render selected or hovered annotations at full detail
        const forceHighDetail = isSelected || isHovered;
        const effectiveLod = forceHighDetail ? 'high' : lodLevel;

        return (
          <Group
            key={annotation.id}
            onClick={(e) => handleClick(annotation, e)}
            onMouseEnter={() => handleMouseEnter(annotation.id)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Polygon rendering - only in medium/high LOD or for selected/hovered */}
            {effectiveLod !== 'low' &&
              annotation.segmentation &&
              annotation.segmentation.length > 0 && (
                <>
                  {annotation.segmentation.map((points, idx) => {
                    // Simplify polygon points for medium LOD
                    // Don't simplify complex shapes with specific vertex counts (e.g., cross with 24 points)
                    const simplifiedPoints =
                      effectiveLod === 'medium' && points.length > 40
                        ? points.filter((_, index) => index % 2 === 0)
                        : points;

                    return (
                      <Line
                        key={`${annotation.id}-poly-${idx}`}
                        points={simplifiedPoints}
                        closed
                        fill={color}
                        fillOpacity={display.annotationOpacity * 0.5}
                        stroke={color}
                        strokeWidth={isSelected ? display.lineWidth + 1 : display.lineWidth}
                        strokeOpacity={isSelected || isHovered ? 1 : display.annotationOpacity}
                        tension={effectiveLod === 'medium' ? 0.2 : 0} // Smooth curves for medium LOD
                      />
                    );
                  })}
                </>
              )}

            {/* Bounding box rendering - skip if already rendered in batch */}
            {display.showBoundingBoxes && (effectiveLod !== 'low' || forceHighDetail) && (
              <Rect
                x={annotation.bbox[0]}
                y={annotation.bbox[1]}
                width={annotation.bbox[2]}
                height={annotation.bbox[3]}
                stroke={color}
                strokeWidth={isSelected ? display.lineWidth + 1 : display.lineWidth}
                strokeOpacity={
                  effectiveLod === 'low'
                    ? display.annotationOpacity * 0.5
                    : display.annotationOpacity
                }
                dash={effectiveLod !== 'low' ? [5, 5] : undefined}
                fill="transparent"
              />
            )}

            {/* Label rendering - only show for selected/hovered or at higher zoom levels */}
            {display.showLabels && category && (forceHighDetail || effectiveLod === 'high') && (
              <Group>
                <Rect
                  x={annotation.bbox[0]}
                  y={annotation.bbox[1] - 20}
                  width={category.name.length * 8 + 10}
                  height={20}
                  fill={color}
                  cornerRadius={3}
                />
                <Text
                  x={annotation.bbox[0] + 5}
                  y={annotation.bbox[1] - 18}
                  text={category.name}
                  fontSize={14}
                  fill="white"
                  fontStyle="bold"
                />
              </Group>
            )}
          </Group>
        );
      })}
    </Layer>
  );
};

export default AnnotationLayer;
