import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Layer, Line, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useAnnotationStore, useSettingsStore, generateCategoryColor } from '../../stores';
import { COCOAnnotation } from '../../types/coco';
import { DiffFilter } from '../../types/diff';

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
    comparisonData,
    comparisonSettings,
    selectedAnnotationIds,
    hoveredAnnotationId,
    visibleCategoryIds,
    selectAnnotation,
    setHoveredAnnotation,
    getCategoryById,
    isComparing,
    diffResults,
    diffFilters,
  } = useAnnotationStore();

  const settingsStore = useSettingsStore();
  // Use comparison display settings if in comparison mode, otherwise use regular display settings
  const display =
    isComparing && comparisonSettings?.displaySettings
      ? { ...settingsStore.display, ...comparisonSettings.displaySettings }
      : settingsStore.display;
  const colors = settingsStore.colors;

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

  // Get diff status for an annotation
  const getDiffStatus = useCallback(
    (
      annotation: COCOAnnotation & { _source?: 'primary' | 'comparison' }
    ): { status: 'tp' | 'fp' | 'fn' | null; isGT: boolean } => {
      // Early return for non-comparison mode
      if (!isComparing || !diffResults || !comparisonSettings) {
        return { status: null, isGT: false };
      }

      const imageDiff = diffResults.get(annotation.image_id);
      if (!imageDiff) return { status: null, isGT: false };

      // Use the source tag to determine if this annotation is from GT or Pred
      let isFromGTDataset = false;
      if (annotation._source) {
        isFromGTDataset =
          (comparisonSettings.gtFileId === 'primary' && annotation._source === 'primary') ||
          (comparisonSettings.gtFileId === 'comparison' && annotation._source === 'comparison');
      } else {
        // Fallback to old method if no source tag
        if (comparisonSettings.gtFileId === 'primary') {
          isFromGTDataset = cocoData?.annotations.some((ann) => ann.id === annotation.id) || false;
        } else {
          isFromGTDataset =
            comparisonData?.annotations.some((ann) => ann.id === annotation.id) || false;
        }
      }

      // Debug logging for TP annotations
      if (annotation.id <= 3) {
        // Log first few annotations to avoid spam
        console.debug(`getDiffStatus for annotation ${annotation.id}:`, {
          gtFileId: comparisonSettings.gtFileId,
          source: annotation._source,
          isFromGTDataset,
          annotationSource: annotation._source || 'no-source',
        });
      }

      // Check if annotation is in true positives
      const tpMatch = imageDiff.truePositives.find((match) => {
        if (isFromGTDataset) {
          return match.gtAnnotation.id === annotation.id;
        } else {
          return match.predAnnotation.id === annotation.id;
        }
      });
      if (tpMatch) {
        // For TP, use the source information to determine GT/Pred
        // If the annotation is from the GT dataset, it's the GT annotation
        const isThisGT = isFromGTDataset;

        // Debug logging for TP matching
        if (annotation.id <= 3) {
          console.debug(`TP match found for annotation ${annotation.id}:`, {
            isThisGT,
            isFromGTDataset,
            annotationSource: annotation._source,
            gtId: tpMatch.gtAnnotation.id,
            predId: tpMatch.predAnnotation.id,
            gtFileId: comparisonSettings.gtFileId,
          });
        }

        return { status: 'tp', isGT: isThisGT };
      }

      // Check if annotation is in false positives
      // FP annotations are always from the Pred dataset
      if (imageDiff.falsePositives.some((ann) => ann.id === annotation.id)) {
        // Debug logging for FP detection
        if (annotation.id <= 3) {
          console.debug(`FP check for annotation ${annotation.id}:`, {
            isFromGTDataset,
            shouldBeFP: !isFromGTDataset,
            annotationSource: annotation._source,
            fpIds: imageDiff.falsePositives.map((a) => a.id),
          });
        }
        // Only return FP if this annotation is from the Pred dataset
        if (!isFromGTDataset) {
          return { status: 'fp', isGT: false };
        }
      }

      // Check if annotation is in false negatives
      // FN annotations are always from the GT dataset
      if (imageDiff.falseNegatives.some((ann) => ann.id === annotation.id)) {
        // Only return FN if this annotation is from the GT dataset
        if (isFromGTDataset) {
          return { status: 'fn', isGT: true };
        }
      }

      // Debug: Log unmatched annotations
      if (annotation.id === 1) {
        // Log only for annotation ID 1 to avoid spam
        console.debug('Unmatched annotation:', {
          id: annotation.id,
          isGT: isFromGTDataset,
          tpCount: imageDiff.truePositives.length,
          fpCount: imageDiff.falsePositives.length,
          fnCount: imageDiff.falseNegatives.length,
        });
      }

      return { status: null, isGT: isFromGTDataset };
    },
    [isComparing, diffResults, comparisonSettings, cocoData, comparisonData]
  );

  const getAnnotationColor = useCallback(
    (
      categoryId: number,
      opacity: number,
      diffInfo?: { status: 'tp' | 'fp' | 'fn' | null; isGT: boolean }
    ) => {
      let baseColor: string;

      // If in comparison mode and has diff status, use diff colors
      if (isComparing && diffInfo?.status && comparisonSettings) {
        const { status, isGT } = diffInfo;
        switch (status) {
          case 'tp':
            baseColor = isGT
              ? comparisonSettings.colorSettings.gtColors.tp
              : comparisonSettings.colorSettings.predColors.tp;

            // Debug logging for TP color application (only log first few to avoid spam)
            if (categoryId <= 2) {
              console.debug(`TP color for category ${categoryId}:`, {
                isGT,
                gtColor: comparisonSettings.colorSettings.gtColors.tp,
                predColor: comparisonSettings.colorSettings.predColors.tp,
                selectedColor: baseColor,
              });
            }
            break;
          case 'fp':
            baseColor = comparisonSettings.colorSettings.predColors.fp;
            break;
          case 'fn':
            baseColor = comparisonSettings.colorSettings.gtColors.fn;
            break;
          default:
            baseColor = colors.categoryColors[categoryId] || generateCategoryColor(categoryId);
        }
      } else {
        // Use normal category color
        baseColor = colors.categoryColors[categoryId] || generateCategoryColor(categoryId);
      }

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
    [colors.categoryColors, generateCategoryColor, isComparing]
  );

  const handleClick = useCallback(
    (
      annotation: COCOAnnotation,
      e: Konva.KonvaEventObject<MouseEvent>,
      selectionId?: number | string
    ) => {
      e.cancelBubble = true;
      const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
      // Use provided selection ID or fall back to annotation ID
      const idToSelect = selectionId !== undefined ? selectionId : annotation.id;
      selectAnnotation(idToSelect, multiSelect);
    },
    [selectAnnotation]
  );

  const handleMouseEnter = useCallback(
    (annotationId: number | string) => {
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

  // Immediate return for comparison mode cleanup
  // If not comparing, only render primary data to prevent comparison polygon persistence
  if (!isComparing && comparisonData) {
    console.debug('Comparison ended but comparisonData still exists - forcing primary data only');
  }

  // Collect annotations from both datasets when comparing
  // Use a more explicit approach to prevent stale data
  const allAnnotations = useMemo(() => {
    if (!cocoData?.annotations) return [];

    // CRITICAL: Only include comparison data if ALL comparison conditions are met
    // AND at least one filter is active
    const shouldIncludeComparisonData =
      isComparing === true &&
      comparisonData?.annotations &&
      comparisonData.annotations.length > 0 &&
      diffResults &&
      diffResults.size > 0 &&
      diffFilters.size > 0; // Must have active filters

    if (shouldIncludeComparisonData) {
      // Tag annotations with their source to distinguish them
      const taggedPrimary = cocoData.annotations.map((ann) => ({
        ...ann,
        _source: 'primary' as const,
      }));
      const taggedComparison = comparisonData.annotations.map((ann) => ({
        ...ann,
        _source: 'comparison' as const,
      }));
      const combined = [...taggedPrimary, ...taggedComparison];

      console.debug('✓ Comparison mode: combining annotations', {
        primary: cocoData.annotations.length,
        comparison: comparisonData.annotations.length,
        total: combined.length,
        isComparing,
        hasDiffResults: diffResults.size > 0,
      });
      return combined;
    }

    // Default to primary data only - this should clear comparison polygons
    console.debug('✗ Non-comparison mode: primary only', {
      primary: cocoData.annotations.length,
      isComparing,
      hasComparisonData: !!comparisonData?.annotations,
      hasDiffResults: diffResults ? diffResults.size : 0,
    });
    return cocoData.annotations.map((ann) => ({ ...ann, _source: 'primary' as const }));
  }, [cocoData, comparisonData, isComparing, diffResults, diffFilters]);

  const annotations = useMemo(() => {
    return allAnnotations.filter((ann) => {
      // Filter 1: Must be current image
      if (ann.image_id !== imageId) {
        return false;
      }

      // Filter 2: Must be in viewport
      if (!isInViewport(ann)) {
        return false;
      }

      // For comparison mode, apply specialized filtering
      if (isComparing) {
        // In comparison mode: ONLY use comparison result filters, ignore categories
        // CRITICAL: If no filters are selected in comparison mode, show nothing
        if (diffFilters.size === 0) {
          return false;
        }

        // Apply comparison result filter
        const diffInfo = getDiffStatus(ann);
        if (!diffInfo.status) return false;

        // Map diff status to the appropriate filter based on GT/Pred role
        let requiredFilter: string | null = null;

        if (diffInfo.status === 'tp') {
          // For TP annotations, distinguish between GT and Pred
          requiredFilter = diffInfo.isGT ? 'tp-gt' : 'tp-pred';

          // Debug logging for TP filtering
          if (ann.id <= 3) {
            console.debug(`TP filtering for annotation ${ann.id}:`, {
              isGT: diffInfo.isGT,
              requiredFilter,
              hasFilter: diffFilters.has(requiredFilter as DiffFilter),
              allFilters: Array.from(diffFilters),
            });
          }
        } else if (diffInfo.status === 'fp') {
          // FP are always on prediction side
          requiredFilter = 'fp';
        } else if (diffInfo.status === 'fn') {
          // FN are always on ground truth side
          requiredFilter = 'fn';
        }

        if (!requiredFilter || !diffFilters.has(requiredFilter as DiffFilter)) {
          return false;
        }
      } else {
        // Non-comparison mode: use category filtering
        if (!visibleCategoryIds.includes(ann.category_id)) {
          return false;
        }
      }

      return true;
    });
  }, [
    allAnnotations,
    imageId,
    isComparing,
    diffFilters,
    visibleCategoryIds,
    comparisonData,
    comparisonSettings,
    viewport,
    isInViewport,
  ]);

  // Performance monitoring in development
  useEffect(() => {
    renderCountRef.current++;
  });

  // Force re-render when comparison state changes
  useEffect(() => {
    // This effect ensures the component re-renders when entering/exiting comparison mode
    console.log('🎨 AnnotationLayer state change:', {
      isComparing,
      hasComparisonData: !!comparisonData,
      comparisonDataSize: comparisonData?.annotations?.length || 0,
      diffFiltersSize: diffFilters.size,
      diffResultsSize: diffResults.size,
      allAnnotationsLength: allAnnotations.length,
    });

    if (!isComparing && comparisonData) {
      console.warn('⚠️ isComparing=false but comparisonData still exists!');
    }
  }, [isComparing, comparisonData, diffFilters, diffResults, allAnnotations]);

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

  // Final check before rendering
  if (annotations.length > 0) {
    const comparisonIds = comparisonData?.annotations.map((a) => a.id) || [];
    const renderingIds = annotations.map((a) => a.id);

    const renderingComparisonData = renderingIds.filter((id) => comparisonIds.includes(id));

    if (renderingComparisonData.length > 0 && !isComparing) {
      console.error('🚨 PROBLEM FOUND: Rendering comparison data while not comparing!', {
        isComparing,
        renderingComparisonCount: renderingComparisonData.length,
        renderingComparisonIds: renderingComparisonData.slice(0, 5), // first 5 IDs
        totalRendering: annotations.length,
      });
    }
  }

  // Generate unique keys for comparison mode to prevent React key conflicts
  const getUniqueKey = (
    annotation: COCOAnnotation & { _source?: 'primary' | 'comparison' },
    suffix: string = ''
  ) => {
    if (isComparing && annotation._source) {
      // Use the source tag for uniqueness
      return `${annotation._source}-${annotation.id}${suffix}`;
    }
    return `${annotation.id}${suffix}`;
  };

  // Get selection ID (for store operations)
  const getSelectionId = (annotation: COCOAnnotation & { _source?: 'primary' | 'comparison' }) => {
    if (isComparing && annotation._source) {
      return `${annotation._source}-${annotation.id}`;
    }
    return annotation.id; // Return number for single mode
  };

  return (
    <Layer>
      {/* Render non-interactive elements in batches by category */}
      {Object.entries(annotationsByCategory).map(([categoryId, categoryAnnotations]) => {
        return (
          <Group key={`batch-${categoryId}`}>
            {/* Batch render bounding boxes for this category */}
            {display.showBoundingBoxes &&
              lodLevel === 'low' &&
              colors.strokeOpacity > 0 &&
              categoryAnnotations
                .filter(
                  (ann) =>
                    !selectedAnnotationIds.includes(getSelectionId(ann)) &&
                    hoveredAnnotationId !== getSelectionId(ann)
                )
                .map((annotation) => {
                  const diffInfo = getDiffStatus(annotation);
                  const strokeColor = getAnnotationColor(
                    annotation.category_id,
                    colors.strokeOpacity,
                    diffInfo
                  );

                  const strokeWidth = display.lineWidth;

                  return (
                    <Rect
                      key={getUniqueKey(annotation, '-bbox')}
                      x={annotation.bbox[0]}
                      y={annotation.bbox[1]}
                      width={annotation.bbox[2]}
                      height={annotation.bbox[3]}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="transparent"
                      listening={false} // Disable events for performance
                    />
                  );
                })}
          </Group>
        );
      })}

      {/* Render interactive elements individually */}
      {annotations.map((annotation) => {
        // Use selection ID for store operations, unique key for React
        const selectionId = getSelectionId(annotation);
        const uniqueKey = getUniqueKey(annotation);
        const isSelected = selectedAnnotationIds.includes(selectionId);
        const isHovered = hoveredAnnotationId === selectionId;
        const category = getCategoryById(annotation.category_id);
        // We'll calculate the actual color with opacity in the polygon rendering

        // Debug logging for interactive rendering
        if (annotation.id <= 3 && isComparing) {
          console.debug(`Rendering interactive annotation ${annotation.id}:`, {
            selectionId,
            uniqueKey,
            isSelected,
            isHovered,
            source: (annotation as COCOAnnotation & { _source?: string })._source,
            diffStatus: getDiffStatus(annotation),
          });
        }

        // Always render selected or hovered annotations at full detail
        const forceHighDetail = isSelected || isHovered;
        const effectiveLod = forceHighDetail ? 'high' : lodLevel;

        return (
          <Group
            key={uniqueKey}
            onClick={(e) => handleClick(annotation, e, selectionId)}
            onMouseEnter={() => handleMouseEnter(selectionId)}
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

                    // Get diff status for comparison mode
                    const diffInfo = getDiffStatus(annotation);

                    // Get colors with opacity already included
                    const fillColor = getAnnotationColor(
                      annotation.category_id,
                      currentFillOpacity,
                      diffInfo
                    );
                    const strokeColor = getAnnotationColor(
                      annotation.category_id,
                      currentStrokeOpacity,
                      diffInfo
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
                        key={getUniqueKey(annotation, `-poly-${idx}`)}
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
                  stroke={getAnnotationColor(
                    annotation.category_id,
                    colors.strokeOpacity,
                    getDiffStatus(annotation)
                  )}
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
                  fill={getAnnotationColor(annotation.category_id, 0.8, getDiffStatus(annotation))} // Label background uses fixed opacity for readability
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
