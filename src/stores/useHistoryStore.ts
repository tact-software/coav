import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { HistoryEntry, EditAction } from '../types';

interface HistoryState {
  /** 過去の履歴 */
  past: HistoryEntry[];
  /** 未来の履歴（Redo用） */
  future: HistoryEntry[];
  /** 最大履歴数 */
  maxHistorySize: number;

  // アクション
  push: (action: EditAction, description?: string) => void;
  pushHistory: (action: EditAction, description: string) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 20;

// ユニークIDを生成
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useHistoryStore = create<HistoryState>()(
  subscribeWithSelector((set, get) => ({
    past: [],
    future: [],
    maxHistorySize: MAX_HISTORY_SIZE,

    push: (action, description = '') => {
      const entry: HistoryEntry = {
        id: generateId(),
        timestamp: Date.now(),
        action,
        description,
      };

      set((state) => {
        const newPast = [entry, ...state.past].slice(0, state.maxHistorySize);
        return {
          past: newPast,
          future: [], // 新しい操作をしたらRedoはクリア
        };
      });
    },

    pushHistory: (action, description) => {
      get().push(action, description);
    },

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return null;

      const [entry, ...remainingPast] = past;

      set({
        past: remainingPast,
        future: [entry, ...future].slice(0, MAX_HISTORY_SIZE),
      });

      return entry;
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return null;

      const [entry, ...remainingFuture] = future;

      set({
        past: [entry, ...past].slice(0, MAX_HISTORY_SIZE),
        future: remainingFuture,
      });

      return entry;
    },

    canUndo: () => {
      return get().past.length > 0;
    },

    canRedo: () => {
      return get().future.length > 0;
    },

    clearHistory: () => {
      set({
        past: [],
        future: [],
      });
    },
  }))
);

// セレクタ
export const selectCanUndo = (state: HistoryState) => state.past.length > 0;
export const selectCanRedo = (state: HistoryState) => state.future.length > 0;
export const selectUndoDescription = (state: HistoryState) =>
  state.past.length > 0 ? state.past[0].description : null;
export const selectRedoDescription = (state: HistoryState) =>
  state.future.length > 0 ? state.future[0].description : null;
export const selectHistoryCount = (state: HistoryState) => ({
  past: state.past.length,
  future: state.future.length,
});
