import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ImageMetadata {
  id: number;
  fileName: string;
  filePath: string;
  width: number;
  height: number;
  fileSize?: number;
  exists: boolean;
  loadError?: string;
}

interface NavigationStore {
  // State
  currentIndex: number;
  imageList: ImageMetadata[];
  selectedFolderPath: string | null;
  navigationMode: 'single' | 'folder';

  // Basic navigation
  setCurrentIndex: (index: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  goToImage: (index: number) => void;

  // List management
  setImageList: (images: ImageMetadata[]) => void;
  updateImageStatus: (index: number, status: Partial<ImageMetadata>) => void;
  clearImageList: () => void;
  setSelectedFolderPath: (path: string | null) => void;
  setNavigationMode: (mode: 'single' | 'folder') => void;
  resetToSingleMode: () => void;

  // Filtering
  filterByCategory: (categoryIds: number[]) => void;
  filterByExistence: (existsOnly: boolean) => void;
  clearFilters: () => void;
}

export const useNavigationStore = create<NavigationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentIndex: 0,
      imageList: [],
      selectedFolderPath: null,
      navigationMode: 'single',

      // Basic navigation
      setCurrentIndex: (index) => {
        set({ currentIndex: index });
      },

      goToNext: () => {
        const { currentIndex, imageList } = get();
        let nextIndex = currentIndex + 1;

        // Find the next existing image
        while (nextIndex < imageList.length && !imageList[nextIndex].exists) {
          nextIndex++;
        }

        if (nextIndex < imageList.length) {
          set({ currentIndex: nextIndex });
        }
      },

      goToPrevious: () => {
        const { currentIndex, imageList } = get();
        let prevIndex = currentIndex - 1;

        // Find the previous existing image
        while (prevIndex >= 0 && !imageList[prevIndex].exists) {
          prevIndex--;
        }

        if (prevIndex >= 0) {
          set({ currentIndex: prevIndex });
        }
      },

      goToFirst: () => {
        const { imageList } = get();
        let firstExistingIndex = 0;

        // Find the first existing image
        while (firstExistingIndex < imageList.length && !imageList[firstExistingIndex].exists) {
          firstExistingIndex++;
        }

        if (firstExistingIndex < imageList.length) {
          set({ currentIndex: firstExistingIndex });
        }
      },

      goToLast: () => {
        const { imageList } = get();
        let lastExistingIndex = imageList.length - 1;

        // Find the last existing image
        while (lastExistingIndex >= 0 && !imageList[lastExistingIndex].exists) {
          lastExistingIndex--;
        }

        if (lastExistingIndex >= 0) {
          set({ currentIndex: lastExistingIndex });
        }
      },

      goToImage: (index) => {
        const { imageList } = get();
        if (index >= 0 && index < imageList.length) {
          set({ currentIndex: index });
        }
      },

      // List management
      setImageList: (images) => {
        set({
          imageList: images,
          currentIndex: 0,
        });
      },

      updateImageStatus: (index, status) => {
        const { imageList } = get();
        const updatedList = [...imageList];
        if (index >= 0 && index < updatedList.length) {
          updatedList[index] = { ...updatedList[index], ...status };
          set({ imageList: updatedList });
        }
      },

      clearImageList: () => {
        set({
          imageList: [],
          currentIndex: 0,
        });
      },

      setSelectedFolderPath: (path) => {
        set({ selectedFolderPath: path });
        if (path) {
          set({ navigationMode: 'folder' });
        }
      },

      setNavigationMode: (mode) => {
        set({ navigationMode: mode });
      },

      resetToSingleMode: () => {
        // Clear all navigation state
        set({
          navigationMode: 'single',
          selectedFolderPath: null,
          imageList: [],
          currentIndex: 0,
        });
      },

      // Filtering - placeholder for future implementation
      filterByCategory: (_categoryIds) => {
        // Not implemented yet
      },

      filterByExistence: (_existsOnly) => {
        // Not implemented yet
      },

      clearFilters: () => {
        // Not implemented yet
      },
    }),
    {
      name: 'navigation-store',
    }
  )
);
