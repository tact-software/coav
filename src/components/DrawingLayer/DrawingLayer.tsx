import React, { useCallback, useRef, useEffect, useState } from 'react';
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
  const setTool = useEditorStore((state) => state.setTool);
  const drawingState = useEditorStore((state) => state.drawingState);
  const startDrawing = useEditorStore((state) => state.startDrawing);
  const updateDrawing = useEditorStore((state) => state.updateDrawing);
  const finishDrawing = useEditorStore((state) => state.finishDrawing);
  const cancelDrawing = useEditorStore((state) => state.cancelDrawing);
  const addPolygonPointAction = useEditorStore((state) => state.addPolygonPoint);
  const currentCategoryId = useEditorStore((state) => state.currentCategoryId);
  const setHasChanges = useEditorStore((state) => state.setHasChanges);

  // 描画完了後に選択モードに戻る
  const returnToSelectMode = useCallback(() => {
    setTool('select');
  }, [setTool]);

  const { cocoData, addAnnotation } = useAnnotationStore();
  const pushHistory = useHistoryStore((state) => state.push);

  const isDrawingRef = useRef(false);

  // ポリゴン閉じるためのスナップ距離（画面座標でのピクセル数）
  const SNAP_DISTANCE = 8;
  // マウスが始点のスナップ範囲内にいるかどうか
  const [isNearStartPoint, setIsNearStartPoint] = useState(false);

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

  // 2点間の距離を計算（画面座標で）
  const getScreenDistance = useCallback(
    (p1: Point, p2: Point): number => {
      const dx = (p2.x - p1.x) * scale;
      const dy = (p2.y - p1.y) * scale;
      return Math.sqrt(dx * dx + dy * dy);
    },
    [scale]
  );

  // 始点に近いかどうかを判定
  const isCloseToStartPoint = useCallback(
    (currentPoint: Point): boolean => {
      const points = drawingState.points;
      if (points.length < 3) return false; // 3点以上ないと閉じられない

      const startPoint = points[0];
      return getScreenDistance(currentPoint, startPoint) < SNAP_DISTANCE;
    },
    [drawingState.points, getScreenDistance, SNAP_DISTANCE]
  );

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
      // 描画完了後に選択モードに戻る
      returnToSelectMode();
    },
    [drawingState.startPoint, imageId, currentCategoryId, addAnnotationToStore, finishDrawing, returnToSelectMode]
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
    // 描画完了後に選択モードに戻る
    returnToSelectMode();
  }, [drawingState.points, imageId, currentCategoryId, addAnnotationToStore, finishDrawing, cancelDrawing, returnToSelectMode]);

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
          // 始点に近い場合はポリゴンを閉じる
          if (drawingState.isDrawing && isCloseToStartPoint(point)) {
            finishPolygonDrawing();
            setIsNearStartPoint(false);
          } else {
            if (!drawingState.isDrawing) {
              startDrawing(point);
            }
            addPolygonPointAction(point);
          }
        }
      }
    },
    [currentTool, getPointerPosition, startDrawing, addPolygonPointAction, finishPolygonDrawing, drawingState.isDrawing, isCloseToStartPoint]
  );

  const handleMouseMove = useCallback(() => {
      const point = getPointerPosition();
      if (!point) return;

      if (currentTool === 'bbox' && isDrawingRef.current) {
        updateDrawing(point);
      } else if (currentTool === 'polygon' && drawingState.isDrawing) {
        // ポリゴン描画中はマウス位置を更新して始点との距離をチェック
        updateDrawing(point);
        setIsNearStartPoint(isCloseToStartPoint(point));
      }
    },
    [currentTool, getPointerPosition, updateDrawing, drawingState.isDrawing, isCloseToStartPoint]
  );

  const handleMouseUp = useCallback(() => {
      if (currentTool !== 'bbox' || !isDrawingRef.current) return;

      const point = getPointerPosition();
      if (!point) return;

      isDrawingRef.current = false;
      finishBboxDrawing(point);
    },
    [currentTool, getPointerPosition, finishBboxDrawing]
  );

  // キーボードイベント（Escでキャンセル＆選択モードに戻る、Enterで完了）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'annotation') return;

      if (e.key === 'Escape') {
        // 描画キャンセル＆選択モードに戻る
        isDrawingRef.current = false;
        cancelDrawing();
        returnToSelectMode();
      } else if (e.key === 'Enter' && currentTool === 'polygon') {
        // ポリゴン描画完了
        finishPolygonDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentTool, cancelDrawing, finishPolygonDrawing, returnToSelectMode]);

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
      const startPoint = points[0];
      const snapRadius = SNAP_DISTANCE / scale; // 画像座標でのスナップ範囲

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
          {/* 始点のスナップ範囲インジケーター（3点以上で表示） */}
          {points.length >= 3 && (
            <Circle
              x={startPoint.x}
              y={startPoint.y}
              radius={snapRadius}
              stroke={isNearStartPoint ? '#ff0000' : '#ff000066'}
              strokeWidth={isNearStartPoint ? 2 / scale : 1 / scale}
              dash={[4 / scale, 4 / scale]}
              fill={isNearStartPoint ? 'rgba(255, 0, 0, 0.15)' : 'transparent'}
            />
          )}
          {/* 頂点マーカー */}
          {points.map((point: Point, index: number) => (
            <Circle
              key={index}
              x={point.x}
              y={point.y}
              radius={index === 0 ? pointRadius * 1.5 : pointRadius}
              fill={index === 0 ? '#ff0000' : '#00ff00'}
              stroke="#ffffff"
              strokeWidth={1 / scale}
            />
          ))}
          {/* 現在のマウス位置へのプレビューライン */}
          {drawingState.currentPoint && points.length > 0 && (
            <Line
              points={[
                points[points.length - 1].x,
                points[points.length - 1].y,
                drawingState.currentPoint.x,
                drawingState.currentPoint.y,
              ]}
              stroke="#00ff0088"
              strokeWidth={strokeWidth}
              dash={[3 / scale, 3 / scale]}
            />
          )}
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
