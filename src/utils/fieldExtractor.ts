import { COCOAnnotation } from '../types/coco';

export interface ExtractedField {
  path: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  sample?: unknown;
}

// Standard COCO fields that should not be promoted
const STANDARD_COCO_FIELDS = new Set([
  'id',
  'image_id',
  'category_id',
  'segmentation',
  'area',
  'bbox',
  'iscrowd',
]);

/**
 * Extract nested field paths from an object
 */
function extractPaths(obj: unknown, prefix = '', maxDepth = 5): ExtractedField[] {
  if (maxDepth <= 0 || obj === null || obj === undefined) {
    return [];
  }

  const fields: ExtractedField[] = [];

  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      // Skip standard COCO fields at root level
      if (!prefix && STANDARD_COCO_FIELDS.has(key)) {
        continue;
      }

      const valueType = Array.isArray(value) ? 'object' : typeof value;

      // Add primitive fields
      if (valueType !== 'object') {
        fields.push({
          path: currentPath,
          displayName: formatDisplayName(currentPath),
          type: valueType as 'string' | 'number' | 'boolean',
          sample: value,
        });
      } else if (value !== null) {
        // Add object field itself
        fields.push({
          path: currentPath,
          displayName: formatDisplayName(currentPath),
          type: 'object',
          sample: value,
        });

        // Recursively extract nested fields
        fields.push(...extractPaths(value, currentPath, maxDepth - 1));
      }
    }
  }

  return fields;
}

/**
 * Format field path to human-readable display name
 * Examples:
 * - "option.detection.confidence" -> "Detection Confidence"
 * - "custom_score" -> "Custom Score"
 * - "metadata.timestamp" -> "Metadata Timestamp"
 */
function formatDisplayName(path: string): string {
  return path
    .split('.')
    .map((part) =>
      part
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    )
    .join(' ');
}

/**
 * Extract all unique field paths from the first annotation
 */
export function extractFieldsFromAnnotation(annotation: COCOAnnotation): ExtractedField[] {
  return extractPaths(annotation).sort((a, b) => {
    // Sort by depth first (shallower fields first), then alphabetically
    const aDepth = a.path.split('.').length;
    const bDepth = b.path.split('.').length;

    if (aDepth !== bDepth) {
      return aDepth - bDepth;
    }

    return a.path.localeCompare(b.path);
  });
}

/**
 * Get value from annotation using dot notation path
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object'
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}

/**
 * Check if a field path exists in annotation
 */
export function hasFieldPath(annotation: COCOAnnotation, path: string): boolean {
  const value = getValueByPath(annotation, path);
  return value !== undefined;
}

/**
 * Group field paths by their top-level category
 */
export function groupFieldsByCategory(fields: ExtractedField[]): Record<string, ExtractedField[]> {
  const groups: Record<string, ExtractedField[]> = {};

  for (const field of fields) {
    const category = field.path.split('.')[0];
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(field);
  }

  return groups;
}
