import React, { useCallback, useEffect, useRef } from 'react';
import { Layer, Line, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useAnnotationStore, useSettingsStore, generateCategoryColor } from '../../stores';
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

  const { display, colors } = useSettingsStore();

  // Performance monitoring in development
  const renderCountRef = useRef(0);

  // Helper function to convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  };

  const getAnnotationColor = useCallback(
    (categoryId: number, opacity: number) => {
      // カスタムカラーがあれば使用、なければデフォルトカラーを生成
      const baseColor = colors.categoryColors[categoryId] || generateCategoryColor(categoryId);

      let r: number, g: number, b: number;

      // Extract RGB values from the color
      const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (hslMatch) {
        const [, h, s, l] = hslMatch;
        [r, g, b] = hslToRgb(parseInt(h), parseInt(s), parseInt(l));
      } else if (baseColor.startsWith('#')) {
        // Hex color
        const hex = baseColor.substring(1);
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else if (baseColor.startsWith('rgb')) {
        // RGB or RGBA format
        const rgbMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          [, r, g, b] = rgbMatch.map(Number);
        } else {
          // Default to gray if parsing fails
          r = g = b = 128;
        }
      } else {
        // Default to gray if color format is unknown
        r = g = b = 128;
      }

      // Return RGBA format with the specified opacity
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    [colors.categoryColors, generateCategoryColor]
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
        const baseColor = getAnnotationColor(catId, colors.strokeOpacity);

        return (
          <Group key={`batch-${categoryId}`}>
            {/* Batch render bounding boxes for this category */}
            {display.showBoundingBoxes &&
              lodLevel === 'low' &&
              colors.strokeOpacity > 0 &&
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
        // We'll calculate the actual color with opacity in the polygon rendering

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

                    const currentFillOpacity = isSelected
                      ? colors.selectedFillOpacity
                      : isHovered
                        ? colors.hoverFillOpacity
                        : colors.fillOpacity;
                    const currentStrokeOpacity = colors.strokeOpacity;

                    // Skip rendering if both fill and stroke are transparent
                    if (currentFillOpacity === 0 && currentStrokeOpacity === 0) {
                      return null;
                    }

                    // Get colors with opacity already included
                    const fillColor = getAnnotationColor(
                      annotation.category_id,
                      currentFillOpacity
                    );
                    const strokeColor = getAnnotationColor(
                      annotation.category_id,
                      currentStrokeOpacity
                    );

                    // Debug logging
                    if (annotation.id === annotations[0]?.id) {
                      // Log only for first annotation to avoid spam
                      console.log('Annotation colors:', {
                        annotationId: annotation.id,
                        isSelected,
                        isHovered,
                        fillColor,
                        strokeColor,
                        fillOpacity: currentFillOpacity,
                        strokeOpacity: currentStrokeOpacity,
                      });
                    }

                    return (
                      <Line
                        key={`${annotation.id}-poly-${idx}`}
                        points={simplifiedPoints}
                        closed
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? display.lineWidth + 1 : display.lineWidth}
                        tension={effectiveLod === 'medium' ? 0.2 : 0} // Smooth curves for medium LOD
                      />
                    );
                  })}
                </>
              )}

            {/* Bounding box rendering - skip if already rendered in batch */}
            {display.showBoundingBoxes &&
              (effectiveLod !== 'low' || forceHighDetail) &&
              colors.strokeOpacity > 0 && (
                <Rect
                  x={annotation.bbox[0]}
                  y={annotation.bbox[1]}
                  width={annotation.bbox[2]}
                  height={annotation.bbox[3]}
                  stroke={getAnnotationColor(annotation.category_id, colors.strokeOpacity)}
                  strokeWidth={isSelected ? display.lineWidth + 1 : display.lineWidth}
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
                  fill={getAnnotationColor(annotation.category_id, 0.8)}
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
