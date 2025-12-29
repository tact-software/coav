import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AppMode } from '../types';

interface ModeState {
  /** 現在のモード */
  mode: AppMode;
  /** 前回のモード */
  previousMode: AppMode;

  // アクション
  setMode: (mode: AppMode) => void;
  enterAnnotationMode: () => void;
  exitAnnotationMode: () => void;
}

export const useModeStore = create<ModeState>()(
  subscribeWithSelector((set, get) => ({
    mode: 'viewer',
    previousMode: 'viewer',

    setMode: (mode) => {
      const currentMode = get().mode;
      set({
        mode,
        previousMode: currentMode,
      });
    },

    enterAnnotationMode: () => {
      const { mode } = get();
      set({
        mode: 'annotation',
        previousMode: mode,
      });
    },

    exitAnnotationMode: () => {
      set({
        mode: 'viewer',
        previousMode: 'annotation',
      });
    },
  }))
);

// セレクタ
export const selectIsViewerMode = (state: ModeState) => state.mode === 'viewer';
export const selectIsAnnotationMode = (state: ModeState) => state.mode === 'annotation';
