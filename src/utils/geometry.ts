/**
 * ポリゴンの面積を計算（Shoelace formula）
 * 複数のポリゴンがある場合は合計面積を返す
 */
export function calculatePolygonArea(segmentation: number[][]): number {
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

      area += x1 * y2 - x2 * y1;
    }

    totalArea += Math.abs(area) / 2;
  }

  return totalArea;
}
