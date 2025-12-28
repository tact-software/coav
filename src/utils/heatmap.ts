import { COCOData, COCOAnnotation } from '../types/coco';
import { HeatmapData, HeatmapType, HeatmapSettings, HeatmapBin } from '../stores/useHeatmapStore';
import { calculatePolygonArea } from './geometry';

// アノテーションから2次元の値を取得
function getAnnotationValues(
  annotation: COCOAnnotation,
  type: HeatmapType
): [number, number] | null {
  const bbox = annotation.bbox;
  if (!bbox || bbox.length < 4) return null;

  switch (type) {
    case 'widthHeight':
      return [bbox[2], bbox[3]];

    case 'centerXY': {
      const centerX = bbox[0] + bbox[2] / 2;
      const centerY = bbox[1] + bbox[3] / 2;
      return [centerX, centerY];
    }

    case 'areaAspectRatio': {
      const area = bbox[2] * bbox[3];
      const aspectRatio = bbox[3] > 0 ? bbox[2] / bbox[3] : 0;
      return [area, aspectRatio];
    }

    case 'polygonAreaAspectRatio': {
      // ポリゴン面積を計算
      const polygonArea = annotation.segmentation
        ? calculatePolygonArea(annotation.segmentation)
        : 0;

      // ポリゴンがない場合はbbox面積を使用
      const area = polygonArea > 0 ? polygonArea : bbox[2] * bbox[3];

      // アスペクト比はbboxから計算（ポリゴンの正確なアスペクト比は複雑）
      const aspectRatio = bbox[3] > 0 ? bbox[2] / bbox[3] : 0;

      return [area, aspectRatio];
    }

    default:
      return null;
  }
}

// ヒートマップのラベルを取得
function getHeatmapLabels(type: HeatmapType): { xLabel: string; yLabel: string } {
  switch (type) {
    case 'widthHeight':
      return { xLabel: 'Width', yLabel: 'Height' };
    case 'centerXY':
      return { xLabel: 'X', yLabel: 'Y' };
    case 'areaAspectRatio':
      return { xLabel: 'Area (bbox)', yLabel: 'Aspect Ratio' };
    case 'polygonAreaAspectRatio':
      return { xLabel: 'Area (polygon)', yLabel: 'Aspect Ratio' };
    default:
      return { xLabel: 'X', yLabel: 'Y' };
  }
}

// ヒートマップデータを計算
export function calculateHeatmap(
  cocoData: COCOData,
  type: HeatmapType,
  settings: HeatmapSettings,
  currentImageId?: number | null
): HeatmapData | null {
  if (!cocoData.annotations || cocoData.annotations.length === 0) {
    return null;
  }

  // フィルタリング
  let filteredAnnotations = cocoData.annotations;

  // ビューモードによるフィルタリング
  if (settings.viewMode === 'current' && currentImageId !== null && currentImageId !== undefined) {
    filteredAnnotations = filteredAnnotations.filter((ann) => ann.image_id === currentImageId);
  }

  // カテゴリによるフィルタリング
  if (settings.selectedCategories.size > 0) {
    filteredAnnotations = filteredAnnotations.filter((ann) =>
      settings.selectedCategories.has(ann.category_id)
    );
  }

  if (filteredAnnotations.length === 0) {
    return null;
  }

  // 値を収集
  const values: Array<{ x: number; y: number; annotation: COCOAnnotation }> = [];

  for (const annotation of filteredAnnotations) {
    const vals = getAnnotationValues(annotation, type);
    if (vals) {
      values.push({
        x: vals[0],
        y: vals[1],
        annotation,
      });
    }
  }

  if (values.length === 0) {
    return null;
  }

  // 最小値と最大値を計算
  const xValues = values.map((v) => v.x);
  const yValues = values.map((v) => v.y);

  let xMin = Math.min(...xValues);
  let xMax = Math.max(...xValues);
  let yMin = Math.min(...yValues);
  let yMax = Math.max(...yValues);

  // ビンの範囲を計算（最小幅を確保）
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  // 範囲が0の場合は最小値を設定
  const xBinWidth = xRange > 0 ? xRange / settings.xBins : 1;
  const yBinWidth = yRange > 0 ? yRange / settings.yBins : 1;

  // 範囲が0の場合は、最小値・最大値を調整
  if (xRange === 0) {
    xMin -= 0.5;
    xMax += 0.5;
  }
  if (yRange === 0) {
    yMin -= 0.5;
    yMax += 0.5;
  }

  // 2次元のビン配列を初期化
  const bins: HeatmapBin[][] = [];

  for (let i = 0; i < settings.xBins; i++) {
    bins[i] = [];
    for (let j = 0; j < settings.yBins; j++) {
      bins[i][j] = {
        xRange: [xMin + i * xBinWidth, xMin + (i + 1) * xBinWidth],
        yRange: [yMin + j * yBinWidth, yMin + (j + 1) * yBinWidth],
        count: 0,
        annotations: [],
        categoryBreakdown: new Map(),
      };
    }
  }

  // 値をビンに割り当て
  for (const val of values) {
    const xBinIndex = Math.min(Math.floor((val.x - xMin) / xBinWidth), settings.xBins - 1);
    const yBinIndex = Math.min(Math.floor((val.y - yMin) / yBinWidth), settings.yBins - 1);

    const bin = bins[xBinIndex][yBinIndex];
    bin.count++;
    bin.annotations.push(val.annotation.id);

    // カテゴリ別カウント
    const categoryCount = bin.categoryBreakdown.get(val.annotation.category_id) || 0;
    bin.categoryBreakdown.set(val.annotation.category_id, categoryCount + 1);
  }

  const labels = getHeatmapLabels(type);

  return {
    type,
    bins,
    xLabel: labels.xLabel,
    yLabel: labels.yLabel,
    xMin,
    xMax,
    yMin,
    yMax,
    totalCount: values.length,
  };
}

// ヒートマップデータをCSV形式でエクスポート
export function exportHeatmapAsCSV(data: HeatmapData, categories: Map<number, string>): string {
  const headers = ['X_Min', 'X_Max', 'Y_Min', 'Y_Max', 'Count'];

  // カテゴリヘッダーを追加
  const categoryIds = Array.from(
    new Set(data.bins.flat().flatMap((bin) => Array.from(bin.categoryBreakdown.keys())))
  ).sort((a, b) => a - b);

  categoryIds.forEach((id) => {
    const categoryName = categories.get(id) || `Category ${id}`;
    headers.push(categoryName);
  });

  const rows: string[][] = [];

  // 各ビンのデータを行に変換
  for (let i = 0; i < data.bins.length; i++) {
    for (let j = 0; j < data.bins[i].length; j++) {
      const bin = data.bins[i][j];
      if (bin.count === 0) continue; // 空のビンはスキップ

      const row: string[] = [
        bin.xRange[0].toFixed(2),
        bin.xRange[1].toFixed(2),
        bin.yRange[0].toFixed(2),
        bin.yRange[1].toFixed(2),
        bin.count.toString(),
      ];

      // カテゴリ別カウントを追加
      categoryIds.forEach((id) => {
        const count = bin.categoryBreakdown.get(id) || 0;
        row.push(count.toString());
      });

      rows.push(row);
    }
  }

  // 統計情報を追加
  rows.push([]);
  rows.push(['Statistics']);
  rows.push(['Type', data.type]);
  rows.push(['X Label', data.xLabel]);
  rows.push(['Y Label', data.yLabel]);
  rows.push(['X Range', `${data.xMin.toFixed(2)} - ${data.xMax.toFixed(2)}`]);
  rows.push(['Y Range', `${data.yMin.toFixed(2)} - ${data.yMax.toFixed(2)}`]);
  rows.push(['Total Count', data.totalCount.toString()]);
  rows.push(['X Bins', data.bins.length.toString()]);
  rows.push(['Y Bins', data.bins[0]?.length.toString() || '0']);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

  return csv;
}
