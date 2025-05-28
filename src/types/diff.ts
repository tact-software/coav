import type { COCOAnnotation } from './coco';

export interface MatchedAnnotation {
  gtAnnotation: COCOAnnotation;
  predAnnotation: COCOAnnotation;
  iou: number;
}

export interface DiffResult {
  imageId: number;
  truePositives: MatchedAnnotation[];
  falsePositives: COCOAnnotation[];
  falseNegatives: COCOAnnotation[];
  // Matches below threshold but with IoU > 0
  belowThresholdMatches: MatchedAnnotation[];
}

export interface CategoryStats {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface DiffStatistics {
  total: CategoryStats;
  byCategory: Map<number, CategoryStats & { categoryName: string }>;
}

export type DiffFilter = 'tp-gt' | 'tp-pred' | 'fp' | 'fn';

export interface DiffColorSettings {
  gtColors: {
    tp: string;
    fn: string;
  };
  predColors: {
    tp: string;
    fp: string;
  };
}

export interface DiffDisplaySettings {
  showBoundingBoxes: boolean;
  showLabels: boolean;
}

export type IoUMethod = 'bbox' | 'polygon';

export interface ComparisonSettings {
  gtFileId: string;
  predFileId: string;
  iouThreshold: number;
  categoryMapping: Map<number, number[]>; // GT category ID -> Pred category IDs (1対多)
  colorSettings: DiffColorSettings;
  displaySettings: DiffDisplaySettings;
  maxMatchesPerAnnotation?: number; // Maximum number of matches allowed per annotation (default: 1)
  iouMethod?: IoUMethod; // Method to calculate IoU (default: 'bbox')
}
