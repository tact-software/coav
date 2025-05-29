import { COCOAnnotation, COCOData } from '../types/coco';
import { HistogramBin, HistogramData, HistogramStatistics, HistogramType, HistogramSettings } from '../stores/useHistogramStore';

// ポリゴンの面積を計算（Shoelace formula）
function calculatePolygonArea(segmentation: number[][]): number {
  if (!segmentation || segmentation.length === 0) {
    return 0;
  }

  let totalArea = 0;
  
  for (const polygon of segmentation) {
    if (polygon.length < 6) continue; // 最低3点（x1,y1,x2,y2,x3,y3）が必要
    
    let area = 0;
    const pointCount = polygon.length / 2;
    
    for (let i = 0; i < pointCount; i++) {
      const x1 = polygon[i * 2];
      const y1 = polygon[i * 2 + 1];
      const x2 = polygon[((i + 1) % pointCount) * 2];
      const y2 = polygon[((i + 1) % pointCount) * 2 + 1];
      
      area += (x1 * y2 - x2 * y1);
    }
    
    totalArea += Math.abs(area) / 2;
  }
  
  return totalArea;
}

// アノテーションからサイズ値を取得
export function getAnnotationSize(annotation: COCOAnnotation, type: HistogramType): number {
  if (!annotation.bbox || annotation.bbox.length < 4) {
    return 0;
  }

  const [, , width, height] = annotation.bbox;

  switch (type) {
    case 'width':
      return width;
    case 'height':
      return height;
    case 'area':
      return width * height;
    case 'polygonArea':
      if (annotation.segmentation && Array.isArray(annotation.segmentation) && annotation.segmentation.length > 0) {
        return calculatePolygonArea(annotation.segmentation);
      }
      // ポリゴンデータがない場合はbbox面積を返す
      return width * height;
    case 'aspectRatio':
      return height > 0 ? width / height : 0;
    default:
      return 0;
  }
}

// 統計値を計算
export function calculateStatistics(values: number[]): HistogramStatistics {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      std: 0,
      min: 0,
      max: 0,
      q1: 0,
      q3: 0,
      total: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const total = values.length;

  // 平均
  const mean = values.reduce((sum, val) => sum + val, 0) / total;

  // 中央値
  const median = total % 2 === 0
    ? (sorted[Math.floor(total / 2) - 1] + sorted[Math.floor(total / 2)]) / 2
    : sorted[Math.floor(total / 2)];

  // 標準偏差
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / total;
  const std = Math.sqrt(variance);

  // 最小値・最大値
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // 四分位数
  const q1Index = Math.floor(total * 0.25);
  const q3Index = Math.floor(total * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];

  return { mean, median, std, min, max, q1, q3, total };
}

// ビンの範囲を計算
export function calculateBinRanges(
  min: number,
  max: number,
  binCount: number,
  scale: 'linear' | 'log'
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  if (scale === 'linear') {
    const binWidth = (max - min) / binCount;
    for (let i = 0; i < binCount; i++) {
      const start = min + i * binWidth;
      const end = i === binCount - 1 ? max : min + (i + 1) * binWidth;
      ranges.push([start, end]);
    }
  } else {
    // ログスケール
    if (min <= 0) {
      // ログスケールでは正の値のみ扱う
      min = 0.1;
    }
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logBinWidth = (logMax - logMin) / binCount;

    for (let i = 0; i < binCount; i++) {
      const logStart = logMin + i * logBinWidth;
      const logEnd = logMin + (i + 1) * logBinWidth;
      const start = Math.pow(10, logStart);
      const end = i === binCount - 1 ? max : Math.pow(10, logEnd);
      ranges.push([start, end]);
    }
  }

  return ranges;
}

// ヒストグラムデータを計算
export function calculateHistogram(
  cocoData: COCOData,
  type: HistogramType,
  settings: HistogramSettings
): HistogramData | null {
  if (!cocoData.annotations || cocoData.annotations.length === 0) {
    return null;
  }

  // フィルタリング
  let annotations = cocoData.annotations;
  
  // カテゴリフィルタ
  if (settings.selectedCategories.size > 0) {
    annotations = annotations.filter(ann => 
      ann.category_id && settings.selectedCategories.has(ann.category_id)
    );
  }

  if (annotations.length === 0) {
    return null;
  }

  // サイズ値を取得
  const annotationSizes = annotations.map(ann => ({
    annotation: ann,
    size: getAnnotationSize(ann, type),
  })).filter(item => item.size > 0);

  if (annotationSizes.length === 0) {
    return null;
  }

  // サイズ範囲フィルタ
  if (settings.sizeRange) {
    const [minRange, maxRange] = settings.sizeRange;
    annotationSizes.filter(item => item.size >= minRange && item.size <= maxRange);
  }

  const sizes = annotationSizes.map(item => item.size);
  const statistics = calculateStatistics(sizes);

  // ビンの範囲を計算
  const binRanges = calculateBinRanges(
    statistics.min,
    statistics.max,
    settings.binCount,
    settings.scale
  );

  // ビンを作成
  const bins: HistogramBin[] = binRanges.map(range => ({
    range,
    count: 0,
    categoryBreakdown: new Map(),
    annotationIds: [],
  }));

  // アノテーションをビンに割り当て
  annotationSizes.forEach(({ annotation, size }) => {
    for (let i = 0; i < bins.length; i++) {
      const [start, end] = bins[i].range;
      if (size >= start && size <= end) {
        bins[i].count++;
        bins[i].annotationIds.push(annotation.id);

        // カテゴリ別カウント
        if (annotation.category_id) {
          const currentCount = bins[i].categoryBreakdown.get(annotation.category_id) || 0;
          bins[i].categoryBreakdown.set(annotation.category_id, currentCount + 1);
        }
        break;
      }
    }
  });

  return {
    type,
    bins,
    statistics,
  };
}

// データをCSV形式でエクスポート
export function exportHistogramAsCSV(data: HistogramData, categories: Map<number, string>): string {
  const headers = ['Bin Range', 'Count', 'Percentage'];
  
  // カテゴリ別ヘッダーを追加
  const categoryIds = Array.from(
    new Set(data.bins.flatMap(bin => Array.from(bin.categoryBreakdown.keys())))
  ).sort((a, b) => a - b);
  
  categoryIds.forEach(id => {
    const categoryName = categories.get(id) || `Category ${id}`;
    headers.push(categoryName);
  });

  const rows = data.bins.map(bin => {
    const percentage = ((bin.count / data.statistics.total) * 100).toFixed(2);
    const row = [
      `${bin.range[0].toFixed(2)}-${bin.range[1].toFixed(2)}`,
      bin.count.toString(),
      `${percentage}%`,
    ];

    // カテゴリ別カウントを追加
    categoryIds.forEach(id => {
      const count = bin.categoryBreakdown.get(id) || 0;
      row.push(count.toString());
    });

    return row;
  });

  // 統計情報を追加
  rows.push([]);
  rows.push(['Statistics']);
  rows.push(['Mean', data.statistics.mean.toFixed(2)]);
  rows.push(['Median', data.statistics.median.toFixed(2)]);
  rows.push(['Std Dev', data.statistics.std.toFixed(2)]);
  rows.push(['Min', data.statistics.min.toFixed(2)]);
  rows.push(['Max', data.statistics.max.toFixed(2)]);
  rows.push(['Q1', data.statistics.q1.toFixed(2)]);
  rows.push(['Q3', data.statistics.q3.toFixed(2)]);
  rows.push(['Total', data.statistics.total.toString()]);

  // CSVフォーマット
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csv;
}