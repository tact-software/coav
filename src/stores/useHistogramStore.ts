import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type HistogramType = 'width' | 'height' | 'area' | 'polygonArea' | 'aspectRatio';
export type ScaleType = 'linear' | 'log';

export interface HistogramBin {
  range: [number, number];
  count: number;
  categoryBreakdown: Map<number, number>;
  annotationIds: number[];
}

export interface HistogramData {
  type: HistogramType;
  bins: HistogramBin[];
  statistics: HistogramStatistics;
}

export interface HistogramStatistics {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  total: number;
}

export interface HistogramSettings {
  binCount: number;
  scale: ScaleType;
  selectedCategories: Set<number>;
  sizeRange: [number, number] | null;
}

interface HistogramStore {
  // 設定
  settings: HistogramSettings;
  histogramType: HistogramType;
  
  // 計算結果
  histogramData: HistogramData | null;
  highlightedAnnotations: Set<number>;
  
  // アクション
  setHistogramType: (type: HistogramType) => void;
  setBinCount: (count: number) => void;
  setScale: (scale: ScaleType) => void;
  toggleCategory: (categoryId: number) => void;
  setSizeRange: (range: [number, number] | null) => void;
  highlightBin: (binIndex: number) => void;
  clearHighlight: () => void;
  setHistogramData: (data: HistogramData | null) => void;
  resetSettings: () => void;
}

const defaultSettings: HistogramSettings = {
  binCount: 20,
  scale: 'linear',
  selectedCategories: new Set(),
  sizeRange: null,
};

export const useHistogramStore = create<HistogramStore>()(
  subscribeWithSelector((set) => ({
    // 初期状態
    settings: defaultSettings,
    histogramType: 'area',
    histogramData: null,
    highlightedAnnotations: new Set(),

    // アクション
    setHistogramType: (type) =>
      set(() => ({
        histogramType: type,
        // タイプ変更時はデータをクリア（再計算が必要）
        histogramData: null,
      })),

    setBinCount: (count) =>
      set((state) => ({
        settings: {
          ...state.settings,
          binCount: Math.max(5, Math.min(100, count)),
        },
        // ビン数変更時はデータをクリア（再計算が必要）
        histogramData: null,
      })),

    setScale: (scale) =>
      set((state) => ({
        settings: {
          ...state.settings,
          scale,
        },
      })),

    toggleCategory: (categoryId) =>
      set((state) => {
        const newCategories = new Set(state.settings.selectedCategories);
        if (newCategories.has(categoryId)) {
          newCategories.delete(categoryId);
        } else {
          newCategories.add(categoryId);
        }
        return {
          settings: {
            ...state.settings,
            selectedCategories: newCategories,
          },
          // カテゴリ変更時はデータをクリア（再計算が必要）
          histogramData: null,
        };
      }),

    setSizeRange: (range) =>
      set((state) => ({
        settings: {
          ...state.settings,
          sizeRange: range,
        },
        // サイズ範囲変更時はデータをクリア（再計算が必要）
        histogramData: null,
      })),

    highlightBin: (binIndex) =>
      set((state) => {
        if (!state.histogramData || binIndex < 0 || binIndex >= state.histogramData.bins.length) {
          return { highlightedAnnotations: new Set() };
        }
        const bin = state.histogramData.bins[binIndex];
        return {
          highlightedAnnotations: new Set(bin.annotationIds),
        };
      }),

    clearHighlight: () =>
      set(() => ({
        highlightedAnnotations: new Set(),
      })),

    setHistogramData: (data) =>
      set(() => ({
        histogramData: data,
      })),

    resetSettings: () =>
      set(() => ({
        settings: defaultSettings,
        histogramType: 'area',
        histogramData: null,
        highlightedAnnotations: new Set(),
      })),
  }))
);