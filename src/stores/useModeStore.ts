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
  enterComparisonMode: () => void;
  exitComparisonMode: () => void;
  enterAnnotationMode: () => void;
  exitAnnotationMode: () => void;
}

export const useModeStore = create<ModeState>()(
  subscribeWithSelector((set, get) => ({
    mode: 'normal',
    previousMode: 'normal',

    setMode: (mode) => {
      const currentMode = get().mode;
      set({
        mode,
        previousMode: currentMode,
      });
    },

    enterComparisonMode: () => {
      const { mode } = get();
      if (mode === 'annotation') {
        console.warn('Cannot enter comparison mode while in annotation mode');
        return;
      }
      set({
        mode: 'comparison',
        previousMode: mode,
      });
    },

    exitComparisonMode: () => {
      set({
        mode: 'normal',
        previousMode: 'comparison',
      });
    },

    enterAnnotationMode: () => {
      const { mode } = get();
      if (mode === 'comparison') {
        console.warn('Cannot enter annotation mode while in comparison mode');
        return;
      }
      set({
        mode: 'annotation',
        previousMode: mode,
      });
    },

    exitAnnotationMode: () => {
      set({
        mode: 'normal',
        previousMode: 'annotation',
      });
    },
  }))
);

// セレクタ
export const selectIsNormalMode = (state: ModeState) => state.mode === 'normal';
export const selectIsComparisonMode = (state: ModeState) => state.mode === 'comparison';
export const selectIsAnnotationMode = (state: ModeState) => state.mode === 'annotation';
