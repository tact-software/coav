import { create } from 'zustand';
import { COCOData, COCOAnnotation, COCOCategory } from '../types/coco';

interface AnnotationState {
  cocoData: COCOData | null;
  selectedAnnotationIds: number[];
  visibleCategoryIds: number[];
  hoveredAnnotationId: number | null;

  // Detail panel state
  isDetailPanelOpen: boolean;
  detailPanelWidth: number;

  // Search state
  searchQuery: string;
  searchResults: number[];
  currentSearchIndex: number;
  shouldCenterOnSelection: boolean;

  // Actions
  setCocoData: (data: COCOData) => void;
  clearCocoData: () => void;
  selectAnnotation: (id: number, multiSelect?: boolean) => void;
  clearSelection: () => void;
  toggleCategoryVisibility: (categoryId: number) => void;
  showAllCategories: () => void;
  hideAllCategories: () => void;
  setHoveredAnnotation: (id: number | null) => void;

  // Detail panel actions
  setDetailPanelOpen: (open: boolean) => void;
  setDetailPanelWidth: (width: number) => void;

  // Search actions
  setSearchQuery: (query: string) => void;
  searchAnnotations: (query: string) => void;
  selectSearchResult: (index: number) => void;
  nextSearchResult: () => void;
  prevSearchResult: () => void;
  clearSearch: () => void;

  // Getters
  getVisibleAnnotations: () => COCOAnnotation[];
  getSelectedAnnotations: () => COCOAnnotation[];
  getCategoryById: (id: number) => COCOCategory | undefined;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  cocoData: null,
  selectedAnnotationIds: [],
  visibleCategoryIds: [],
  hoveredAnnotationId: null,
  isDetailPanelOpen: false,
  detailPanelWidth: 350,
  searchQuery: '',
  searchResults: [],
  currentSearchIndex: -1,
  shouldCenterOnSelection: false,

  setCocoData: (data) => {
    set({
      cocoData: data,
      visibleCategoryIds: data.categories.map((cat) => cat.id),
      selectedAnnotationIds: [],
      hoveredAnnotationId: null,
    });
  },

  clearCocoData: () => {
    set({
      cocoData: null,
      selectedAnnotationIds: [],
      visibleCategoryIds: [],
      hoveredAnnotationId: null,
    });
  },

  selectAnnotation: (id, multiSelect = false) => {
    set((state) => {
      if (multiSelect) {
        const isSelected = state.selectedAnnotationIds.includes(id);
        return {
          selectedAnnotationIds: isSelected
            ? state.selectedAnnotationIds.filter((aid) => aid !== id)
            : [...state.selectedAnnotationIds, id],
          isDetailPanelOpen: true, // Open panel when selecting
          shouldCenterOnSelection: false, // Don't center on normal selection
        };
      }
      return {
        selectedAnnotationIds: [id],
        isDetailPanelOpen: true, // Open panel when selecting
        shouldCenterOnSelection: false, // Don't center on normal selection
      };
    });
  },

  clearSelection: () => {
    set({ selectedAnnotationIds: [] });
  },

  toggleCategoryVisibility: (categoryId) => {
    set((state) => {
      const isVisible = state.visibleCategoryIds.includes(categoryId);
      return {
        visibleCategoryIds: isVisible
          ? state.visibleCategoryIds.filter((id) => id !== categoryId)
          : [...state.visibleCategoryIds, categoryId],
      };
    });
  },

  showAllCategories: () => {
    set((state) => ({
      visibleCategoryIds: state.cocoData?.categories.map((cat) => cat.id) || [],
    }));
  },

  hideAllCategories: () => {
    set({ visibleCategoryIds: [] });
  },

  setHoveredAnnotation: (id) => {
    set({ hoveredAnnotationId: id });
  },

  setDetailPanelOpen: (open) => {
    set({ isDetailPanelOpen: open });
  },

  setDetailPanelWidth: (width) => {
    set({ detailPanelWidth: width });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().searchAnnotations(query);
  },

  searchAnnotations: (query) => {
    const state = get();
    if (!state.cocoData || !query.trim()) {
      set({ searchResults: [], currentSearchIndex: -1 });
      return;
    }

    const results: number[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    // Search by annotation ID
    if (/^\d+$/.test(normalizedQuery)) {
      const targetId = parseInt(normalizedQuery);
      const annotation = state.cocoData.annotations.find((ann) => ann.id === targetId);
      if (annotation) {
        results.push(annotation.id);
      }
    } else {
      // Search by category name
      state.cocoData.annotations.forEach((annotation) => {
        const category = state.cocoData?.categories.find(
          (cat) => cat.id === annotation.category_id
        );
        if (category && category.name.toLowerCase().includes(normalizedQuery)) {
          results.push(annotation.id);
        }
      });
    }

    set({
      searchResults: results,
      currentSearchIndex: results.length > 0 ? 0 : -1,
    });

    // Auto-select first result
    if (results.length > 0) {
      get().selectSearchResult(0);
    }
  },

  selectSearchResult: (index) => {
    const state = get();
    if (index >= 0 && index < state.searchResults.length) {
      const annotationId = state.searchResults[index];
      set({
        currentSearchIndex: index,
        selectedAnnotationIds: [annotationId],
        isDetailPanelOpen: true,
        shouldCenterOnSelection: true, // Center on search result
      });
    }
  },

  nextSearchResult: () => {
    const state = get();
    if (state.searchResults.length > 0) {
      const nextIndex = (state.currentSearchIndex + 1) % state.searchResults.length;
      get().selectSearchResult(nextIndex);
    }
  },

  prevSearchResult: () => {
    const state = get();
    if (state.searchResults.length > 0) {
      const prevIndex =
        state.currentSearchIndex <= 0
          ? state.searchResults.length - 1
          : state.currentSearchIndex - 1;
      get().selectSearchResult(prevIndex);
    }
  },

  clearSearch: () => {
    set({
      searchQuery: '',
      searchResults: [],
      currentSearchIndex: -1,
    });
  },

  getVisibleAnnotations: () => {
    const state = get();
    if (!state.cocoData) return [];

    return state.cocoData.annotations.filter((ann) =>
      state.visibleCategoryIds.includes(ann.category_id)
    );
  },

  getSelectedAnnotations: () => {
    const state = get();
    if (!state.cocoData) return [];

    return state.cocoData.annotations.filter((ann) => state.selectedAnnotationIds.includes(ann.id));
  },

  getCategoryById: (id) => {
    const state = get();
    return state.cocoData?.categories.find((cat) => cat.id === id);
  },
}));
