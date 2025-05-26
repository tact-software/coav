import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentFile {
  path: string;
  name: string;
  type: 'image' | 'annotation';
  lastOpened: number;
}

interface RecentFilesState {
  recentFiles: RecentFile[];
  addRecentFile: (file: Omit<RecentFile, 'lastOpened'>) => void;
  clearRecentFiles: () => void;
  removeRecentFile: (path: string) => void;
  getRecentImages: () => RecentFile[];
  getRecentAnnotations: () => RecentFile[];
}

export const useRecentFilesStore = create<RecentFilesState>()(
  persist(
    (set, get) => ({
      recentFiles: [],

      addRecentFile: (file) => {
        const newFile: RecentFile = {
          ...file,
          lastOpened: Date.now(),
        };

        set((state) => {
          // Remove if already exists
          const filtered = state.recentFiles.filter((f) => f.path !== file.path);

          // Add to beginning and limit to 10 files
          const updated = [newFile, ...filtered].slice(0, 10);

          return { recentFiles: updated };
        });
      },

      clearRecentFiles: () => {
        set({ recentFiles: [] });
      },

      removeRecentFile: (path) => {
        set((state) => ({
          recentFiles: state.recentFiles.filter((f) => f.path !== path),
        }));
      },

      getRecentImages: () => {
        return get()
          .recentFiles.filter((f) => f.type === 'image')
          .sort((a, b) => b.lastOpened - a.lastOpened);
      },

      getRecentAnnotations: () => {
        return get()
          .recentFiles.filter((f) => f.type === 'annotation')
          .sort((a, b) => b.lastOpened - a.lastOpened);
      },
    }),
    {
      name: 'recent-files-storage',
    }
  )
);
