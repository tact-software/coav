import { create } from 'zustand';

interface ImageState {
  imagePath: string | null;
  imageData: string | null; // Base64 encoded
  imageSize: { width: number; height: number } | null;
  containerSize: { width: number; height: number } | null;
  zoom: number;
  pan: { x: number; y: number };
  isLoading: boolean;
  error: string | null;

  // Actions
  setImagePath: (path: string) => void;
  setImageData: (data: string, size: { width: number; height: number }) => void;
  setContainerSize: (size: { width: number; height: number }) => void;
  clearImage: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Zoom helpers
  zoomIn: () => void;
  zoomOut: () => void;
  fitToWindow: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  imagePath: null,
  imageData: null,
  imageSize: null,
  containerSize: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isLoading: false,
  error: null,

  setImagePath: (path) => {
    set({ imagePath: path, error: null });
  },

  setImageData: (data, size) => {
    set({
      imageData: data,
      imageSize: size,
      isLoading: false,
      error: null,
    });
  },

  setContainerSize: (size) => {
    set({ containerSize: size });
  },

  clearImage: () => {
    set({
      imagePath: null,
      imageData: null,
      imageSize: null,
      zoom: 1,
      pan: { x: 0, y: 0 },
      isLoading: false,
      error: null,
    });
  },

  setZoom: (zoom) => {
    // Clamp zoom between 0.1 and 10
    const clampedZoom = Math.max(0.1, Math.min(10, zoom));
    set({ zoom: clampedZoom });
  },

  setPan: (x, y) => {
    set({ pan: { x, y } });
  },

  resetView: () => {
    set({ zoom: 1, pan: { x: 0, y: 0 } });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error, isLoading: false });
  },

  zoomIn: () => {
    const currentZoom = get().zoom;
    set({ zoom: Math.min(10, currentZoom * 1.2) });
  },

  zoomOut: () => {
    const currentZoom = get().zoom;
    set({ zoom: Math.max(0.1, currentZoom / 1.2) });
  },

  fitToWindow: () => {
    const state = get();
    if (!state.imageSize || !state.containerSize) return;

    // Calculate scale to fit image in container with padding
    const padding = 20;
    const scaleX = (state.containerSize.width - padding * 2) / state.imageSize.width;
    const scaleY = (state.containerSize.height - padding * 2) / state.imageSize.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    // Center the image
    const x = (state.containerSize.width - state.imageSize.width * scale) / 2;
    const y = (state.containerSize.height - state.imageSize.height * scale) / 2;

    set({ zoom: scale, pan: { x, y } });
  },
}));
