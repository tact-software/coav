// エディタ関連の型定義

import type { COCOAnnotation } from './coco';
import type { Point } from './app';

/** アプリケーションモード */
export type AppMode = 'normal' | 'comparison' | 'annotation';

/** エディタツール */
export type EditorTool = 'select' | 'bbox' | 'polygon';

/** アノテーション種別 */
export type AnnotationType = 'bbox' | 'polygon';

/** 矩形 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 編集可能アノテーション（COCOAnnotationを拡張） */
export interface EditableAnnotation extends COCOAnnotation {
  /** 描画順序 */
  zIndex: number;
}

/** 描画状態 */
export interface DrawingState {
  /** 描画中フラグ */
  isDrawing: boolean;
  /** 使用中のツール */
  tool: EditorTool;
  /** 開始点（BBox用） */
  startPoint?: Point;
  /** 現在のマウス位置 */
  currentPoint?: Point;
  /** 頂点リスト（ポリゴン用） */
  points: Point[];
}

/** クリップボードデータ */
export interface ClipboardData {
  /** コピーされたアノテーション */
  annotations: EditableAnnotation[];
  /** コピー元の画像ID */
  sourceImageId: number;
}

/** 編集アクションの種類 */
export type EditActionType = 'CREATE' | 'DELETE' | 'UPDATE' | 'BATCH';

/** 編集アクション */
export type EditAction =
  | { type: 'CREATE'; annotation: EditableAnnotation }
  | { type: 'DELETE'; annotation: EditableAnnotation }
  | {
      type: 'UPDATE';
      id: number;
      before: Partial<EditableAnnotation>;
      after: Partial<EditableAnnotation>;
    }
  | { type: 'BATCH'; actions: EditAction[] };

/** 履歴エントリ */
export interface HistoryEntry {
  /** エントリID */
  id: string;
  /** タイムスタンプ */
  timestamp: number;
  /** 実行されたアクション */
  action: EditAction;
  /** 操作の説明（UI表示用） */
  description: string;
}

/** エディタ設定 */
export interface EditorSettings {
  /** 最小アノテーションサイズ */
  minAnnotationSize: number;
  /** グリッドスナップ */
  snapToGrid: boolean;
  /** グリッドサイズ */
  gridSize: number;
  /** クロスヘア表示 */
  showCrosshair: boolean;
  /** 削除確認 */
  confirmDelete: boolean;
}

/** デフォルトのエディタ設定 */
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  minAnnotationSize: 5,
  snapToGrid: false,
  gridSize: 10,
  showCrosshair: true,
  confirmDelete: true,
};

/** デフォルトの描画状態 */
export const DEFAULT_DRAWING_STATE: DrawingState = {
  isDrawing: false,
  tool: 'select',
  points: [],
};
