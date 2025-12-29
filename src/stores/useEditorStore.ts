import { create } from 'zustand';
import type { EditorTool, DrawingState, ClipboardData, Point } from '../types';

interface EditorState {
  /** 選択中のツール */
  activeTool: EditorTool;
  /** 描画中フラグ */
  isDrawing: boolean;
  /** 描画中の状態 */
  drawingState: DrawingState;
  /** 選択中のアノテーションID */
  selectedAnnotationIds: number[];
  /** ホバー中のアノテーションID */
  hoveredAnnotationId: number | null;
  /** クリップボード */
  clipboard: ClipboardData | null;
  /** 編集中の頂点インデックス */
  editingVertexIndex: number | null;

  // アクション
  setActiveTool: (tool: EditorTool) => void;
  startDrawing: (point: Point) => void;
  updateDrawing: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  addPolygonPoint: (point: Point) => void;
  removeLastPolygonPoint: () => void;
  selectAnnotation: (id: number, additive?: boolean) => void;
  selectAnnotations: (ids: number[]) => void;
  toggleAnnotationSelection: (id: number) => void;
  deselectAll: () => void;
  setHoveredAnnotation: (id: number | null) => void;
  setClipboard: (data: ClipboardData | null) => void;
  setEditingVertex: (index: number | null) => void;
  reset: () => void;
}

const initialDrawingState: DrawingState = {
  isDrawing: false,
  tool: 'select',
  points: [],
};

export const useEditorStore = create<EditorState>()((set, get) => ({
  activeTool: 'select',
  isDrawing: false,
  drawingState: initialDrawingState,
  selectedAnnotationIds: [],
  hoveredAnnotationId: null,
  clipboard: null,
  editingVertexIndex: null,

  setActiveTool: (tool) => {
    set({
      activeTool: tool,
      drawingState: { ...initialDrawingState, tool },
      isDrawing: false,
    });
  },

  startDrawing: (point) => {
    const { activeTool } = get();
    set({
      isDrawing: true,
      drawingState: {
        isDrawing: true,
        tool: activeTool,
        startPoint: point,
        currentPoint: point,
        points: activeTool === 'polygon' ? [point] : [],
      },
    });
  },

  updateDrawing: (point) => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        currentPoint: point,
      },
    }));
  },

  finishDrawing: () => {
    set({
      isDrawing: false,
      drawingState: { ...initialDrawingState, tool: get().activeTool },
    });
  },

  cancelDrawing: () => {
    set({
      isDrawing: false,
      drawingState: { ...initialDrawingState, tool: get().activeTool },
    });
  },

  addPolygonPoint: (point) => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        points: [...state.drawingState.points, point],
        currentPoint: point,
      },
    }));
  },

  removeLastPolygonPoint: () => {
    set((state) => {
      const points = state.drawingState.points.slice(0, -1);
      return {
        drawingState: {
          ...state.drawingState,
          points,
          currentPoint: points[points.length - 1] ?? state.drawingState.startPoint,
        },
      };
    });
  },

  selectAnnotation: (id, additive = false) => {
    set((state) => {
      if (additive) {
        if (state.selectedAnnotationIds.includes(id)) {
          return state;
        }
        return {
          selectedAnnotationIds: [...state.selectedAnnotationIds, id],
        };
      }
      return {
        selectedAnnotationIds: [id],
      };
    });
  },

  selectAnnotations: (ids) => {
    set({ selectedAnnotationIds: ids });
  },

  toggleAnnotationSelection: (id) => {
    set((state) => {
      if (state.selectedAnnotationIds.includes(id)) {
        return {
          selectedAnnotationIds: state.selectedAnnotationIds.filter((i) => i !== id),
        };
      }
      return {
        selectedAnnotationIds: [...state.selectedAnnotationIds, id],
      };
    });
  },

  deselectAll: () => {
    set({
      selectedAnnotationIds: [],
      editingVertexIndex: null,
    });
  },

  setHoveredAnnotation: (id) => {
    set({ hoveredAnnotationId: id });
  },

  setClipboard: (data) => {
    set({ clipboard: data });
  },

  setEditingVertex: (index) => {
    set({ editingVertexIndex: index });
  },

  reset: () => {
    set({
      activeTool: 'select',
      isDrawing: false,
      drawingState: initialDrawingState,
      selectedAnnotationIds: [],
      hoveredAnnotationId: null,
      editingVertexIndex: null,
    });
  },
}));

// セレクタ
export const selectActiveTool = (state: EditorState) => state.activeTool;
export const selectIsDrawing = (state: EditorState) => state.isDrawing;
export const selectDrawingState = (state: EditorState) => state.drawingState;
export const selectSelectedAnnotationIds = (state: EditorState) => state.selectedAnnotationIds;
export const selectHasSelection = (state: EditorState) => state.selectedAnnotationIds.length > 0;
export const selectCanPaste = (state: EditorState) => state.clipboard !== null;
