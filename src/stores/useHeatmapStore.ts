import { create } from 'zustand';

export type HeatmapType = 'widthHeight' | 'centerXY' | 'areaAspectRatio' | 'polygonAreaAspectRatio';

export interface HeatmapSettings {
  xBins: number;
  yBins: number;
  colorScale: 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cividis';
  selectedCategories: Set<number>;
  viewMode: 'current' | 'all';
}

export interface HeatmapBin {
  xRange: [number, number];
  yRange: [number, number];
  count: number;
  annotations: number[];
  categoryBreakdown: Map<number, number>;
}

export interface HeatmapData {
  type: HeatmapType;
  bins: HeatmapBin[][];
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  totalCount: number;
}

interface HeatmapStore {
  isOpen: boolean;
  settings: HeatmapSettings;
  heatmapType: HeatmapType;
  heatmapData: HeatmapData | null;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  setHeatmapType: (type: HeatmapType) => void;
  setXBins: (bins: number) => void;
  setYBins: (bins: number) => void;
  setColorScale: (scale: HeatmapSettings['colorScale']) => void;
  toggleCategory: (categoryId: number) => void;
  setViewMode: (mode: 'current' | 'all') => void;
  setHeatmapData: (data: HeatmapData | null) => void;
}

export const useHeatmapStore = create<HeatmapStore>((set) => ({
  isOpen: false,
  settings: {
    xBins: 20,
    yBins: 20,
    colorScale: 'viridis',
    selectedCategories: new Set(),
    viewMode: 'current',
  },
  heatmapType: 'widthHeight',
  heatmapData: null,

  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),

  setHeatmapType: (type) => set({ heatmapType: type }),

  setXBins: (bins) =>
    set((state) => ({
      settings: { ...state.settings, xBins: bins },
    })),

  setYBins: (bins) =>
    set((state) => ({
      settings: { ...state.settings, yBins: bins },
    })),

  setColorScale: (scale) =>
    set((state) => ({
      settings: { ...state.settings, colorScale: scale },
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
        settings: { ...state.settings, selectedCategories: newCategories },
      };
    }),

  setViewMode: (mode) =>
    set((state) => ({
      settings: { ...state.settings, viewMode: mode },
    })),

  setHeatmapData: (data) => set({ heatmapData: data }),
}));
