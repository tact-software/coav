import { create } from 'zustand';

interface LoadingState {
  isLoading: boolean;
  message: string;
  subMessage?: string;
  progress?: number;
  setLoading: (loading: boolean, message?: string, subMessage?: string, progress?: number) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: '',
  subMessage: undefined,
  progress: undefined,

  setLoading: (loading, message = '', subMessage = undefined, progress = undefined) =>
    set({ isLoading: loading, message, subMessage, progress }),
}));
