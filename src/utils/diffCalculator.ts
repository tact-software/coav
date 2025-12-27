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

  const xLeft = Math.max(x1, x2);
  const yTop = Math.max(y1, y2);
  const xRight = Math.min(x1 + w1, x2 + w2);
  const yBottom = Math.min(y1 + h1, y2 + h2);

  if (xRight < xLeft || yBottom < yTop) {
    return 0;
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
 * Calculate IoU between two polygons using grid-based approximation
 */
function calculatePolygonIoU(
  seg1: number[][],
  seg2: number[][],
  bbox1: number[],
  bbox2: number[]
): number {
  if (!seg1 || seg1.length === 0 || !seg2 || seg2.length === 0) {
    return calculateBBoxIoU(bbox1, bbox2);
  }

  const poly1 = seg1[0];
  const poly2 = seg2[0];

  if (poly1.length < 6 || poly2.length < 6) {
    return calculateBBoxIoU(bbox1, bbox2);
  }

  const [x1, y1, w1, h1] = bbox1;
  const [x2, y2, w2, h2] = bbox2;
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1 + w1, x2 + w2);
  const maxY = Math.max(y1 + h1, y2 + h2);

  const gridSize = Math.max(1, Math.min((maxX - minX) / 50, (maxY - minY) / 50));

  let intersectionCount = 0;
  let union1Count = 0;
  let union2Count = 0;

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
 * Find overlapping annotations with multiple matching support
 */
function findOverlappingAnnotationsMultiple(
  datasetA: COCOAnnotation[],
  datasetB: COCOAnnotation[],
  iouThreshold: number,
  categoryMapping: Map<number, number[]>,
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

  datasetA.forEach((annA) => {
    datasetB.forEach((annB) => {
      const mappedCategories = categoryMapping.get(annA.category_id);
      if (mappedCategories !== undefined) {
        if (!mappedCategories.includes(annB.category_id)) return;
      } else {
        return;
      }

      const iou = calculateIoU(annA, annB, iouMethod);

      if (iou >= iouThreshold) {
        potentialMatches.push({
          annotationA: annA,
          annotationB: annB,
          iou,
        });
      } else if (iou > 0) {
        potentialBelowThreshold.push({
          annotationA: annA,
          annotationB: annB,
          iou,
        });
      }
    });
  });

  potentialMatches.sort((a, b) => b.iou - a.iou);

  potentialMatches.forEach((match) => {
    const countA = matchCountA.get(match.annotationA.id) || 0;
    const countB = matchCountB.get(match.annotationB.id) || 0;

    if (countA < maxMatchesPerAnnotation && countB < maxMatchesPerAnnotation) {
      matches.push(match);
      matchCountA.set(match.annotationA.id, countA + 1);
      matchCountB.set(match.annotationB.id, countB + 1);
    }
  });

  potentialBelowThreshold.sort((a, b) => b.iou - a.iou);

  potentialBelowThreshold.forEach((match) => {
    const hasMatchA = matchCountA.has(match.annotationA.id);
    const hasMatchB = matchCountB.has(match.annotationB.id);

    if (!hasMatchA || !hasMatchB) {
      belowThresholdMatches.push(match);
    }
  });

  const unmatchedA = datasetA.filter((ann) => !matchCountA.has(ann.id));
  const unmatchedB = datasetB.filter((ann) => !matchCountB.has(ann.id));

  return { matches, unmatchedA, unmatchedB, belowThresholdMatches };
}

/**
 * Find overlapping annotations - single match version
 */
function findOverlappingAnnotations(
  datasetA: COCOAnnotation[],
  datasetB: COCOAnnotation[],
  iouThreshold: number,
  categoryMapping: Map<number, number[]>,
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

  datasetA.forEach((annA) => {
    let bestMatch: { annotation: COCOAnnotation; iou: number } | null = null;

    datasetB.forEach((annB) => {
      if (usedB.has(annB.id)) return;

      const mappedCategories = categoryMapping.get(annA.category_id);
      if (mappedCategories !== undefined) {
        if (!mappedCategories.includes(annB.category_id)) return;
      } else {
        return;
      }

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

  const unmatchedA = datasetA.filter((ann) => !usedA.has(ann.id));
  const unmatchedB = datasetB.filter((ann) => !usedB.has(ann.id));

  unmatchedA.forEach((annA) => {
    unmatchedB.forEach((annB) => {
      const mappedCategories = categoryMapping.get(annA.category_id);
      if (mappedCategories !== undefined) {
        if (!mappedCategories.includes(annB.category_id)) return;
      } else {
        return;
      }

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

  categories.forEach((cat) => {
    categoryStatsMap.set(cat.id, { tp: 0, fp: 0, fn: 0 });
  });

  diffResults.forEach((result) => {
    result.truePositives.forEach((match) => {
      totalTP++;
      const catId = match.gtAnnotation.category_id;
      const stats = categoryStatsMap.get(catId);
      if (stats) stats.tp++;
    });

    result.falsePositives.forEach((ann) => {
      totalFP++;
      const catId = ann.category_id;
      const stats = categoryStatsMap.get(catId);
      if (stats) stats.fp++;
    });

    result.falseNegatives.forEach((ann) => {
      totalFN++;
      const catId = ann.category_id;
      const stats = categoryStatsMap.get(catId);
      if (stats) stats.fn++;
    });
  });

  const calculateMetrics = (tp: number, fp: number, fn: number): CategoryStats => {
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

    return { tp, fp, fn, precision, recall, f1 };
  };

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
 * Main diff calculation function
 */
export function calculateDiff(
  dataA: COCOData,
  dataB: COCOData,
  settings: ComparisonSettings
): {
  results: Map<number, DiffResult>;
  statistics: DiffStatistics;
} {
  const results = new Map<number, DiffResult>();

  const allImageIds = new Set<number>();
  dataA.annotations.forEach((ann) => allImageIds.add(ann.image_id));
  dataB.annotations.forEach((ann) => allImageIds.add(ann.image_id));

  allImageIds.forEach((imageId) => {
    const annotationsA = dataA.annotations.filter((ann) => ann.image_id === imageId);
    const annotationsB = dataB.annotations.filter((ann) => ann.image_id === imageId);

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

    const truePositives: MatchedAnnotation[] = [];
    const falsePositives: COCOAnnotation[] = [];
    const falseNegatives: COCOAnnotation[] = [];

    const isPrimaryGT = settings.gtFileId === 'primary';

    if (isPrimaryGT) {
      matches.forEach((match) => {
        truePositives.push({
          gtAnnotation: match.annotationA,
          predAnnotation: match.annotationB,
          iou: match.iou,
        });
      });
      falseNegatives.push(...unmatchedA);
      falsePositives.push(...unmatchedB);
    } else {
      matches.forEach((match) => {
        truePositives.push({
          gtAnnotation: match.annotationB,
          predAnnotation: match.annotationA,
          iou: match.iou,
        });
      });
      falseNegatives.push(...unmatchedB);
      falsePositives.push(...unmatchedA);
    }

    const belowThresholdMatchedAnnotations: MatchedAnnotation[] = belowThresholdMatches.map(
      (match) => {
        if (isPrimaryGT) {
          return {
            gtAnnotation: match.annotationA,
            predAnnotation: match.annotationB,
            iou: match.iou,
          };
        } else {
          return {
            gtAnnotation: match.annotationB,
            predAnnotation: match.annotationA,
            iou: match.iou,
          };
        }
      }
    );

    results.set(imageId, {
      imageId,
      truePositives,
      falsePositives,
      falseNegatives,
      belowThresholdMatches: belowThresholdMatchedAnnotations,
    });
  });

  const gtDataForStats = settings.gtFileId === 'primary' ? dataA : dataB;
  const statistics = calculateStatistics(results, gtDataForStats.categories);

  return { results, statistics };
}
