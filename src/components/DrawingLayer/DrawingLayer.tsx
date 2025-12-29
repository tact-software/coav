import React, { useCallback, useRef, useEffect } from 'react';
import { Layer, Rect, Line, Circle, Group } from 'react-konva';
import Konva from 'konva';
import {
  useEditorStore,
  useModeStore,
  useHistoryStore,
  useAnnotationStore,
} from '../../stores';
import type { Point, COCOAnnotation } from '../../types';
import type { EditableAnnotation } from '../../types/editor';

interface DrawingLayerProps {
  scale: number;
  stageRef: React.RefObject<Konva.Stage | null>;
  imageId: number;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({ scale, stageRef, imageId }) => {
  const mode = useModeStore((state) => state.mode);
  const currentTool = useEditorStore((state) => state.currentTool);
  const drawingState = useEditorStore((state) => state.drawingState);
  const startDrawing = useEditorStore((state) => state.startDrawing);
  const updateDrawing = useEditorStore((state) => state.updateDrawing);
  const finishDrawing = useEditorStore((state) => state.finishDrawing);
  const cancelDrawing = useEditorStore((state) => state.cancelDrawing);
  const addPolygonPointAction = useEditorStore((state) => state.addPolygonPoint);
  const currentCategoryId = useEditorStore((state) => state.currentCategoryId);
  const setHasChanges = useEditorStore((state) => state.setHasChanges);

  const { cocoData, addAnnotation } = useAnnotationStore();
  const pushHistory = useHistoryStore((state) => state.push);

  const isDrawingRef = useRef(false);

  // アノテーションモード以外では何も表示しない
  if (mode !== 'annotation') {
    return null;
  }

  // ステージ座標を取得
  const getPointerPosition = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return null;

    // ステージのスケールとポジションを考慮して画像座標に変換
    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = transform.point(pointerPos);

    return { x: pos.x, y: pos.y };
  }, [stageRef]);

  // アノテーションをCOCOデータに追加
  const addAnnotationToStore = useCallback(
    (annotation: COCOAnnotation) => {
      // AnnotationStoreに追加
      addAnnotation(annotation);

      // 履歴に追加
      const editableAnnotation: EditableAnnotation = {
        ...annotation,
        zIndex: cocoData?.annotations.length ?? 0,
      };

      pushHistory(
        { type: 'CREATE', annotation: editableAnnotation },
        'アノテーションを追加'
      );
      setHasChanges(true);
    },
    [cocoData, addAnnotation, pushHistory, setHasChanges]
  );

  // BBox描画完了
  const finishBboxDrawing = useCallback(
    (endPoint: Point) => {
      const start = drawingState.startPoint;
      if (!start) return;

      const x = Math.min(start.x, endPoint.x);
      const y = Math.min(start.y, endPoint.y);
      const width = Math.abs(endPoint.x - start.x);
      const height = Math.abs(endPoint.y - start.y);

      // 最小サイズチェック
      if (width > 5 && height > 5) {
        const newAnnotation: COCOAnnotation = {
          id: Date.now(),
          image_id: imageId,
          category_id: currentCategoryId || 1,
          bbox: [x, y, width, height],
          area: width * height,
          segmentation: [],
          iscrowd: 0,
        };

        addAnnotationToStore(newAnnotation);
      }

      finishDrawing();
    },
    [drawingState.startPoint, imageId, currentCategoryId, addAnnotationToStore, finishDrawing]
  );

  // ポリゴン描画完了
  const finishPolygonDrawing = useCallback(() => {
    const points = drawingState.points;
    if (points.length < 3) {
      cancelDrawing();
      return;
    }

    // ポイントをCOCO形式のsegmentationに変換 [x1, y1, x2, y2, ...]
    const segmentation = points.flatMap((p: Point) => [p.x, p.y]);

    // バウンディングボックスを計算
    const xs = points.map((p: Point) => p.x);
    const ys = points.map((p: Point) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const newAnnotation: COCOAnnotation = {
      id: Date.now(),
      image_id: imageId,
      category_id: currentCategoryId || 1,
      bbox: [minX, minY, maxX - minX, maxY - minY],
      area: Math.abs((maxX - minX) * (maxY - minY)),
      segmentation: [segmentation],
      iscrowd: 0,
    };

    addAnnotationToStore(newAnnotation);
    finishDrawing();
  }, [drawingState.points, imageId, currentCategoryId, addAnnotationToStore, finishDrawing, cancelDrawing]);

  // マウスイベントハンドラ
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (currentTool === 'select') return;

      const point = getPointerPosition();
      if (!point) return;

      if (currentTool === 'bbox') {
        isDrawingRef.current = true;
        startDrawing(point);
      } else if (currentTool === 'polygon') {
        // ダブルクリックで完了
        if (e.evt.detail === 2) {
          finishPolygonDrawing();
        } else {
          if (!drawingState.isDrawing) {
            startDrawing(point);
          }
          addPolygonPointAction(point);
        }
      }
    },
    [currentTool, getPointerPosition, startDrawing, addPolygonPointAction, finishPolygonDrawing, drawingState.isDrawing]
  );

  const handleMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (currentTool !== 'bbox' || !isDrawingRef.current) return;

      const point = getPointerPosition();
      if (!point) return;

      updateDrawing(point);
    },
    [currentTool, getPointerPosition, updateDrawing]
  );

  const handleMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (currentTool !== 'bbox' || !isDrawingRef.current) return;

      const point = getPointerPosition();
      if (!point) return;

      isDrawingRef.current = false;
      finishBboxDrawing(point);
    },
    [currentTool, getPointerPosition, finishBboxDrawing]
  );

  // キーボードイベント（Escでキャンセル、Enterで完了）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'annotation') return;

      if (e.key === 'Escape') {
        // 描画キャンセル
        isDrawingRef.current = false;
        cancelDrawing();
      } else if (e.key === 'Enter' && currentTool === 'polygon') {
        // ポリゴン描画完了
        finishPolygonDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentTool, cancelDrawing, finishPolygonDrawing]);

  // 描画中のプレビューをレンダリング
  const renderDrawingPreview = () => {
    if (!drawingState.isDrawing) return null;

    const strokeWidth = 2 / scale;
    const pointRadius = 4 / scale;

    if (currentTool === 'bbox' && drawingState.startPoint && drawingState.currentPoint) {
      const start = drawingState.startPoint;
      const end = drawingState.currentPoint;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      return (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke="#00ff00"
          strokeWidth={strokeWidth}
          dash={[5 / scale, 5 / scale]}
          fill="rgba(0, 255, 0, 0.1)"
        />
      );
    }

    if (currentTool === 'polygon' && drawingState.points.length > 0) {
      const points = drawingState.points;
      const flatPoints = points.flatMap((p: Point) => [p.x, p.y]);

      return (
        <Group>
          {/* ポリゴンライン */}
          <Line
            points={flatPoints}
            stroke="#00ff00"
            strokeWidth={strokeWidth}
            closed={false}
            dash={[5 / scale, 5 / scale]}
          />
          {/* 頂点マーカー */}
          {points.map((point: Point, index: number) => (
            <Circle
              key={index}
              x={point.x}
              y={point.y}
              radius={pointRadius}
              fill={index === 0 ? '#ff0000' : '#00ff00'}
              stroke="#ffffff"
              strokeWidth={1 / scale}
            />
          ))}
        </Group>
      );
    }

    return null;
  };

  return (
    <Layer
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 透明な背景レイヤー（イベントキャプチャ用） */}
      <Rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="transparent"
        listening={currentTool !== 'select'}
      />
      {renderDrawingPreview()}
    </Layer>
  );
};
