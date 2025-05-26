import { COCOData, COCOAnnotation } from '../types/coco';

export interface CategoryStats {
  categoryId: number;
  categoryName: string;
  count: number;
  totalArea: number;
  averageArea: number;
  percentage: number;
}

export interface SizeStats {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  avgWidth: number;
  avgHeight: number;
  minArea: number;
  maxArea: number;
  avgArea: number;
}

export interface AnnotationStatistics {
  totalAnnotations: number;
  visibleAnnotations: number;
  selectedAnnotations: number;
  categoryStats: CategoryStats[];
  sizeStats: SizeStats | null;
  coveragePercentage: number;
  overlappingCount: number;
}

export function calculateAnnotationStatistics(
  cocoData: COCOData | null,
  imageId: number,
  visibleCategoryIds: number[],
  selectedAnnotationIds: number[]
): AnnotationStatistics | null {
  if (!cocoData) return null;

  const image = cocoData.images.find((img) => img.id === imageId);
  if (!image) return null;

  const imageAnnotations = cocoData.annotations.filter((ann) => ann.image_id === imageId);
  const visibleAnnotations = imageAnnotations.filter((ann) =>
    visibleCategoryIds.includes(ann.category_id)
  );

  // Calculate category statistics
  const categoryMap = new Map<number, { name: string; annotations: COCOAnnotation[] }>();

  imageAnnotations.forEach((ann) => {
    const category = cocoData.categories.find((cat) => cat.id === ann.category_id);
    if (!categoryMap.has(ann.category_id)) {
      categoryMap.set(ann.category_id, {
        name: category?.name || 'Unknown',
        annotations: [],
      });
    }
    categoryMap.get(ann.category_id)!.annotations.push(ann);
  });

  const categoryStats: CategoryStats[] = Array.from(categoryMap.entries()).map(
    ([categoryId, { name, annotations }]) => {
      const totalArea = annotations.reduce((sum, ann) => sum + ann.area, 0);
      return {
        categoryId,
        categoryName: name,
        count: annotations.length,
        totalArea,
        averageArea: totalArea / annotations.length,
        percentage: (annotations.length / imageAnnotations.length) * 100,
      };
    }
  );

  // Sort by count descending
  categoryStats.sort((a, b) => b.count - a.count);

  // Calculate size statistics
  let sizeStats: SizeStats | null = null;
  if (imageAnnotations.length > 0) {
    const widths = imageAnnotations.map((ann) => ann.bbox[2]);
    const heights = imageAnnotations.map((ann) => ann.bbox[3]);
    const areas = imageAnnotations.map((ann) => ann.area);

    sizeStats = {
      minWidth: Math.min(...widths),
      minHeight: Math.min(...heights),
      maxWidth: Math.max(...widths),
      maxHeight: Math.max(...heights),
      avgWidth: widths.reduce((a, b) => a + b, 0) / widths.length,
      avgHeight: heights.reduce((a, b) => a + b, 0) / heights.length,
      minArea: Math.min(...areas),
      maxArea: Math.max(...areas),
      avgArea: areas.reduce((a, b) => a + b, 0) / areas.length,
    };
  }

  // Calculate coverage percentage
  const imageArea = image.width * image.height;
  const totalAnnotationArea = imageAnnotations.reduce((sum, ann) => sum + ann.area, 0);
  const coveragePercentage = (totalAnnotationArea / imageArea) * 100;

  // Calculate overlapping annotations
  const overlappingCount = countOverlappingAnnotations(imageAnnotations);

  return {
    totalAnnotations: imageAnnotations.length,
    visibleAnnotations: visibleAnnotations.length,
    selectedAnnotations: selectedAnnotationIds.filter((id) =>
      imageAnnotations.some((ann) => ann.id === id)
    ).length,
    categoryStats,
    sizeStats,
    coveragePercentage,
    overlappingCount,
  };
}

function countOverlappingAnnotations(annotations: COCOAnnotation[]): number {
  let overlappingCount = 0;

  for (let i = 0; i < annotations.length; i++) {
    for (let j = i + 1; j < annotations.length; j++) {
      if (bboxOverlap(annotations[i].bbox, annotations[j].bbox)) {
        overlappingCount++;
        break; // Count each annotation only once even if it overlaps with multiple
      }
    }
  }

  return overlappingCount;
}

function bboxOverlap(bbox1: number[], bbox2: number[]): boolean {
  const [x1, y1, w1, h1] = bbox1;
  const [x2, y2, w2, h2] = bbox2;

  return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
