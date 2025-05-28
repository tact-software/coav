import type { COCOData, COCOAnnotation } from '../types/coco';
import type {
  DiffResult,
  MatchedAnnotation,
  DiffStatistics,
  CategoryStats,
  ComparisonSettings,
  IoUMethod,
} from '../types/diff';

/**
 * Calculate IoU (Intersection over Union) between two bounding boxes
 */
function calculateBBoxIoU(box1: number[], box2: number[]): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  // Calculate intersection area
  const xLeft = Math.max(x1, x2);
  const yTop = Math.max(y1, y2);
  const xRight = Math.min(x1 + w1, x2 + w2);
  const yBottom = Math.min(y1 + h1, y2 + h2);

  if (xRight < xLeft || yBottom < yTop) {
    return 0; // No intersection
  }

  const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
  const box1Area = w1 * h1;
  const box2Area = w2 * h2;
  const unionArea = box1Area + box2Area - intersectionArea;

  return intersectionArea / unionArea;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function isPointInPolygon(x: number, y: number, polygon: number[]): boolean {
  let inside = false;
  const n = polygon.length / 2;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i * 2];
    const yi = polygon[i * 2 + 1];
    const xj = polygon[j * 2];
    const yj = polygon[j * 2 + 1];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate IoU between two polygons
 * Uses a grid-based approximation for efficiency
 */
function calculatePolygonIoU(
  seg1: number[][],
  seg2: number[][],
  bbox1: number[],
  bbox2: number[]
): number {
  // If segmentations are empty, fall back to bbox IoU
  if (!seg1 || seg1.length === 0 || !seg2 || seg2.length === 0) {
    return calculateBBoxIoU(bbox1, bbox2);
  }

  // Get the first polygon from each segmentation (COCO can have multiple polygons)
  const poly1 = seg1[0];
  const poly2 = seg2[0];

  if (poly1.length < 6 || poly2.length < 6) {
    // Need at least 3 points (6 coordinates) to form a polygon
    return calculateBBoxIoU(bbox1, bbox2);
  }

  // Find bounding box of the union
  const [x1, y1, w1, h1] = bbox1;
  const [x2, y2, w2, h2] = bbox2;
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1 + w1, x2 + w2);
  const maxY = Math.max(y1 + h1, y2 + h2);

  // Use a grid resolution based on the size of the region
  const gridSize = Math.max(1, Math.min((maxX - minX) / 50, (maxY - minY) / 50));

  let intersectionCount = 0;
  let union1Count = 0;
  let union2Count = 0;

  // Sample points in a grid
  for (let x = minX; x <= maxX; x += gridSize) {
    for (let y = minY; y <= maxY; y += gridSize) {
      const inPoly1 = isPointInPolygon(x, y, poly1);
      const inPoly2 = isPointInPolygon(x, y, poly2);

      if (inPoly1 && inPoly2) {
        intersectionCount++;
      }
      if (inPoly1) {
        union1Count++;
      }
      if (inPoly2) {
        union2Count++;
      }
    }
  }

  const unionCount = union1Count + union2Count - intersectionCount;

  if (unionCount === 0) {
    return 0;
  }

  return intersectionCount / unionCount;
}

/**
 * Calculate IoU based on the specified method
 */
function calculateIoU(
  ann1: COCOAnnotation,
  ann2: COCOAnnotation,
  method: IoUMethod = 'bbox'
): number {
  if (method === 'polygon') {
    return calculatePolygonIoU(ann1.segmentation, ann2.segmentation, ann1.bbox, ann2.bbox);
  }
  return calculateBBoxIoU(ann1.bbox, ann2.bbox);
}

/**
 * Find overlapping annotations between two datasets with multiple matching support
 */
function findOverlappingAnnotationsMultiple(
  datasetA: COCOAnnotation[],
  datasetB: COCOAnnotation[],
  iouThreshold: number,
  categoryMapping: Map<number, number>,
  maxMatchesPerAnnotation: number = 1,
  iouMethod: IoUMethod = 'bbox'
): {
  matches: { annotationA: COCOAnnotation; annotationB: COCOAnnotation; iou: number }[];
  unmatchedA: COCOAnnotation[];
  unmatchedB: COCOAnnotation[];
  belowThresholdMatches: {
    annotationA: COCOAnnotation;
    annotationB: COCOAnnotation;
    iou: number;
  }[];
} {
  const matches: { annotationA: COCOAnnotation; annotationB: COCOAnnotation; iou: number }[] = [];
  const belowThresholdMatches: {
    annotationA: COCOAnnotation;
    annotationB: COCOAnnotation;
    iou: number;
  }[] = [];
  const matchCountA = new Map<number, number>();
  const matchCountB = new Map<number, number>();

  // Find all potential matches (both above and below threshold)
  const potentialMatches: {
    annotationA: COCOAnnotation;
    annotationB: COCOAnnotation;
    iou: number;
  }[] = [];
  const potentialBelowThreshold: {
    annotationA: COCOAnnotation;
    annotationB: COCOAnnotation;
    iou: number;
  }[] = [];

  let totalComparisons = 0;
  let aboveThresholdCount = 0;
  let belowThresholdCount = 0;
  let zeroIouCount = 0;

  datasetA.forEach((annA) => {
    datasetB.forEach((annB) => {
      totalComparisons++;

      // Check category mapping
      const mappedCategory = categoryMapping.get(annA.category_id);
      if (mappedCategory !== undefined && mappedCategory !== annB.category_id) return;
      if (mappedCategory === undefined && annA.category_id !== annB.category_id) return;

      // Calculate IoU
      const iou = calculateIoU(annA, annB, iouMethod);

      // Log first few IoU calculations for debugging
      if (totalComparisons <= 5) {
        console.debug('IoU calculation:', {
          annA_id: annA.id,
          annB_id: annB.id,
          bboxA: annA.bbox,
          bboxB: annB.bbox,
          iou,
          threshold: iouThreshold,
          method: iouMethod,
        });
      }

      if (iou >= iouThreshold) {
        aboveThresholdCount++;
        potentialMatches.push({
          annotationA: annA,
          annotationB: annB,
          iou,
        });
      } else if (iou > 0) {
        // Store below threshold matches that have some overlap
        belowThresholdCount++;
        potentialBelowThreshold.push({
          annotationA: annA,
          annotationB: annB,
          iou,
        });
      } else {
        zeroIouCount++;
      }
    });
  });

  console.debug('IoU comparison summary:', {
    totalComparisons,
    aboveThresholdCount,
    belowThresholdCount,
    zeroIouCount,
    threshold: iouThreshold,
    datasetASize: datasetA.length,
    datasetBSize: datasetB.length,
  });

  // Sort by IoU descending
  potentialMatches.sort((a, b) => b.iou - a.iou);

  // Select matches respecting maxMatchesPerAnnotation
  potentialMatches.forEach((match) => {
    const countA = matchCountA.get(match.annotationA.id) || 0;
    const countB = matchCountB.get(match.annotationB.id) || 0;

    if (countA < maxMatchesPerAnnotation && countB < maxMatchesPerAnnotation) {
      matches.push(match);
      matchCountA.set(match.annotationA.id, countA + 1);
      matchCountB.set(match.annotationB.id, countB + 1);
    }
  });

  // Sort and process below threshold matches for unmatched annotations only
  potentialBelowThreshold.sort((a, b) => b.iou - a.iou);
  console.debug(`Processing ${potentialBelowThreshold.length} potential below threshold matches`);

  potentialBelowThreshold.forEach((match) => {
    // Only include if both annotations are unmatched (have no above-threshold matches)
    const hasMatchA = matchCountA.has(match.annotationA.id);
    const hasMatchB = matchCountB.has(match.annotationB.id);

    console.debug('Below threshold candidate:', {
      aId: match.annotationA.id,
      bId: match.annotationB.id,
      iou: match.iou,
      hasMatchA,
      hasMatchB,
      willInclude: !hasMatchA || !hasMatchB,
    });

    if (!hasMatchA || !hasMatchB) {
      belowThresholdMatches.push(match);
    }
  });

  // Find unmatched annotations
  const unmatchedA = datasetA.filter((ann) => !matchCountA.has(ann.id));
  const unmatchedB = datasetB.filter((ann) => !matchCountB.has(ann.id));

  return { matches, unmatchedA, unmatchedB, belowThresholdMatches };
}

/**
 * Find overlapping annotations between two datasets (role-agnostic) - Legacy single match version
 */
function findOverlappingAnnotations(
  datasetA: COCOAnnotation[],
  datasetB: COCOAnnotation[],
  iouThreshold: number,
  categoryMapping: Map<number, number>,
  iouMethod: IoUMethod = 'bbox'
): {
  matches: { annotationA: COCOAnnotation; annotationB: COCOAnnotation; iou: number }[];
  unmatchedA: COCOAnnotation[];
  unmatchedB: COCOAnnotation[];
  belowThresholdMatches: {
    annotationA: COCOAnnotation;
    annotationB: COCOAnnotation;
    iou: number;
  }[];
} {
  const matches: { annotationA: COCOAnnotation; annotationB: COCOAnnotation; iou: number }[] = [];
  const belowThresholdMatches: {
    annotationA: COCOAnnotation;
    annotationB: COCOAnnotation;
    iou: number;
  }[] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // For each annotation in dataset A, find the best matching annotation in dataset B
  datasetA.forEach((annA) => {
    let bestMatch: { annotation: COCOAnnotation; iou: number } | null = null;

    datasetB.forEach((annB) => {
      // Skip if already matched
      if (usedB.has(annB.id)) return;

      // Check category mapping
      const mappedCategory = categoryMapping.get(annA.category_id);
      if (mappedCategory !== undefined && mappedCategory !== annB.category_id) return;
      if (mappedCategory === undefined && annA.category_id !== annB.category_id) return;

      // Calculate IoU
      const iou = calculateIoU(annA, annB, iouMethod);
      if (iou >= iouThreshold) {
        if (!bestMatch || iou > bestMatch.iou) {
          bestMatch = { annotation: annB, iou };
        }
      }
    });

    if (bestMatch !== null) {
      const foundMatch = bestMatch as { annotation: COCOAnnotation; iou: number };
      matches.push({
        annotationA: annA,
        annotationB: foundMatch.annotation,
        iou: foundMatch.iou,
      });
      usedA.add(annA.id);
      usedB.add(foundMatch.annotation.id);
    }
  });

  // Find unmatched annotations
  const unmatchedA = datasetA.filter((ann) => !usedA.has(ann.id));
  const unmatchedB = datasetB.filter((ann) => !usedB.has(ann.id));

  // Find below threshold matches among unmatched annotations
  unmatchedA.forEach((annA) => {
    unmatchedB.forEach((annB) => {
      // Check category mapping
      const mappedCategory = categoryMapping.get(annA.category_id);
      if (mappedCategory !== undefined && mappedCategory !== annB.category_id) return;
      if (mappedCategory === undefined && annA.category_id !== annB.category_id) return;

      // Calculate IoU
      const iou = calculateIoU(annA, annB, iouMethod);
      if (iou > 0 && iou < iouThreshold) {
        belowThresholdMatches.push({
          annotationA: annA,
          annotationB: annB,
          iou,
        });
      }
    });
  });

  console.debug(`Single match: Found ${belowThresholdMatches.length} below threshold matches`);

  return { matches, unmatchedA, unmatchedB, belowThresholdMatches };
}

/**
 * Calculate statistics from diff results
 */
function calculateStatistics(
  diffResults: Map<number, DiffResult>,
  categories: { id: number; name: string }[]
): DiffStatistics {
  const categoryStatsMap = new Map<number, { tp: number; fp: number; fn: number }>();
  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  // Initialize category stats
  categories.forEach((cat) => {
    categoryStatsMap.set(cat.id, { tp: 0, fp: 0, fn: 0 });
  });

  // Aggregate results
  diffResults.forEach((result) => {
    // Count true positives
    result.truePositives.forEach((match) => {
      totalTP++;
      const catId = match.gtAnnotation.category_id;
      const stats = categoryStatsMap.get(catId);
      if (stats) stats.tp++;
    });

    // Count false positives
    result.falsePositives.forEach((ann) => {
      totalFP++;
      const catId = ann.category_id;
      const stats = categoryStatsMap.get(catId);
      if (stats) stats.fp++;
    });

    // Count false negatives
    result.falseNegatives.forEach((ann) => {
      totalFN++;
      const catId = ann.category_id;
      const stats = categoryStatsMap.get(catId);
      if (stats) stats.fn++;
    });
  });

  // Calculate metrics
  const calculateMetrics = (tp: number, fp: number, fn: number): CategoryStats => {
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

    return { tp, fp, fn, precision, recall, f1 };
  };

  // Build final statistics
  const byCategory = new Map<number, CategoryStats & { categoryName: string }>();
  categories.forEach((cat) => {
    const stats = categoryStatsMap.get(cat.id);
    if (stats) {
      byCategory.set(cat.id, {
        ...calculateMetrics(stats.tp, stats.fp, stats.fn),
        categoryName: cat.name,
      });
    }
  });

  return {
    total: calculateMetrics(totalTP, totalFP, totalFN),
    byCategory,
  };
}

/**
 * Main diff calculation function - role-agnostic approach
 */
export function calculateDiff(
  dataA: COCOData,
  dataB: COCOData,
  settings: ComparisonSettings
): {
  results: Map<number, DiffResult>;
  statistics: DiffStatistics;
} {
  // Debug logging to verify data sources
  console.log('calculateDiff called with:', {
    dataA_annotations: dataA.annotations.length,
    dataB_annotations: dataB.annotations.length,
    gtFileId: settings.gtFileId,
    dataA_sample_ids: dataA.annotations.slice(0, 3).map((a) => a.id),
    dataB_sample_ids: dataB.annotations.slice(0, 3).map((a) => a.id),
    areDataSetsIdentical: dataA.annotations === dataB.annotations,
    annotationIdsOverlap: dataA.annotations.some((a) =>
      dataB.annotations.some((b) => b.id === a.id)
    ),
    maxMatchesPerAnnotation: settings.maxMatchesPerAnnotation || 1,
  });

  const results = new Map<number, DiffResult>();

  // Get all unique image IDs from both datasets
  const allImageIds = new Set<number>();
  dataA.annotations.forEach((ann) => allImageIds.add(ann.image_id));
  dataB.annotations.forEach((ann) => allImageIds.add(ann.image_id));

  // Process each image
  allImageIds.forEach((imageId) => {
    const annotationsA = dataA.annotations.filter((ann) => ann.image_id === imageId);
    const annotationsB = dataB.annotations.filter((ann) => ann.image_id === imageId);

    // Step 1: Find overlapping annotations (role-agnostic)
    // Use multiple matching if specified, otherwise use single matching
    const iouMethod = settings.iouMethod || 'bbox';
    const overlappingResult =
      settings.maxMatchesPerAnnotation && settings.maxMatchesPerAnnotation > 1
        ? findOverlappingAnnotationsMultiple(
            annotationsA,
            annotationsB,
            settings.iouThreshold,
            settings.categoryMapping,
            settings.maxMatchesPerAnnotation,
            iouMethod
          )
        : findOverlappingAnnotations(
            annotationsA,
            annotationsB,
            settings.iouThreshold,
            settings.categoryMapping,
            iouMethod
          );

    const { matches, unmatchedA, unmatchedB, belowThresholdMatches } = overlappingResult;

    // Step 2: Classify based on role settings
    const truePositives: MatchedAnnotation[] = [];
    const falsePositives: COCOAnnotation[] = [];
    const falseNegatives: COCOAnnotation[] = [];

    // Determine which dataset is GT and which is Pred based on settings
    // Note: settings should contain information about which dataset is GT
    // For now, we'll assume the first parameter (dataA) corresponds to the primary file
    const isPrimaryGT = settings.gtFileId === 'primary';

    if (isPrimaryGT) {
      // dataA is GT, dataB is Pred
      matches.forEach((match) => {
        truePositives.push({
          gtAnnotation: match.annotationA,
          predAnnotation: match.annotationB,
          iou: match.iou,
        });
      });
      falseNegatives.push(...unmatchedA); // Unmatched GT
      falsePositives.push(...unmatchedB); // Unmatched Pred
    } else {
      // dataA is Pred, dataB is GT
      matches.forEach((match) => {
        truePositives.push({
          gtAnnotation: match.annotationB,
          predAnnotation: match.annotationA,
          iou: match.iou,
        });
      });
      falseNegatives.push(...unmatchedB); // Unmatched GT
      falsePositives.push(...unmatchedA); // Unmatched Pred
    }

    // Debug logging for first image
    if (imageId === allImageIds.values().next().value) {
      console.log('Diff results for first image:', {
        imageId,
        truePositives: truePositives.map((tp) => ({
          gtId: tp.gtAnnotation.id,
          predId: tp.predAnnotation.id,
          iou: tp.iou,
        })),
        falsePositives: falsePositives.map((fp) => fp.id),
        falseNegatives: falseNegatives.map((fn) => fn.id),
        isPrimaryGT,
      });
    }

    // Convert below threshold matches to MatchedAnnotation format
    const belowThresholdMatchedAnnotations: MatchedAnnotation[] = [];

    console.debug(
      `Image ${imageId}: Found ${belowThresholdMatches.length} below threshold matches`
    );

    belowThresholdMatches.forEach((match) => {
      console.debug('Below threshold match:', {
        aId: match.annotationA.id,
        bId: match.annotationB.id,
        iou: match.iou,
        isPrimaryGT,
      });

      if (isPrimaryGT) {
        belowThresholdMatchedAnnotations.push({
          gtAnnotation: match.annotationA,
          predAnnotation: match.annotationB,
          iou: match.iou,
        });
      } else {
        belowThresholdMatchedAnnotations.push({
          gtAnnotation: match.annotationB,
          predAnnotation: match.annotationA,
          iou: match.iou,
        });
      }
    });

    results.set(imageId, {
      imageId,
      truePositives,
      falsePositives,
      falseNegatives,
      belowThresholdMatches: belowThresholdMatchedAnnotations,
    });
  });

  // Calculate statistics using the appropriate GT dataset for categories
  const gtDataForStats = settings.gtFileId === 'primary' ? dataA : dataB;
  const statistics = calculateStatistics(results, gtDataForStats.categories);

  return { results, statistics };
}
