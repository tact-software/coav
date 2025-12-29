import { create } from 'zustand';
import { COCOData, COCOAnnotation, COCOCategory } from '../types/coco';
import { DiffResult, DiffStatistics, DiffFilter, ComparisonSettings } from '../types/diff';

interface AnnotationState {
  cocoData: COCOData | null;
  selectedAnnotationIds: (number | string)[];
  visibleCategoryIds: number[];
  hoveredAnnotationId: number | string | null;
  currentImageId: number | null;

  // Detail panel state
  isDetailPanelOpen: boolean;
  detailPanelWidth: number;

  // Search state
  searchQuery: string;
  searchResults: number[];
  currentSearchIndex: number;
  shouldCenterOnSelection: boolean;

  // Comparison state
  comparisonData: COCOData | null;
  originalComparisonData: COCOData | null; // Store original unfiltered data
  isComparing: boolean;
  comparisonSettings: ComparisonSettings | null;
  diffResults: Map<number, DiffResult>;
  diffStatistics: DiffStatistics | null;
  diffFilters: Set<DiffFilter>;

  // Actions
  setCocoData: (data: COCOData) => void;
  clearCocoData: () => void;
  selectAnnotation: (id: number | string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  toggleCategoryVisibility: (categoryId: number) => void;
  showAllCategories: () => void;
  hideAllCategories: () => void;
  setHoveredAnnotation: (id: number | string | null) => void;

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

  // Image actions
  setCurrentImageId: (id: number | null) => void;

  // Getters
  getVisibleAnnotations: () => COCOAnnotation[];
  getSelectedAnnotations: () => COCOAnnotation[];
  getCategoryById: (id: number) => COCOCategory | undefined;
  getAnnotationsForCurrentImage: () => COCOAnnotation[];

  // Annotation editing actions
  addAnnotation: (annotation: COCOAnnotation) => void;
  updateAnnotation: (id: number, updates: Partial<COCOAnnotation>) => void;
  deleteAnnotation: (id: number) => void;
  deleteAnnotations: (ids: number[]) => void;

  // Comparison actions
  setComparisonData: (
    originalData: COCOData,
    filteredData: COCOData,
    settings: ComparisonSettings
  ) => void;
  clearComparison: () => void;
  calculateDiff: () => void;
  toggleDiffFilter: (filter: DiffFilter) => void;
  setDiffFilters: (filters: Set<DiffFilter>) => void;
  updateComparisonSettings: (settings: ComparisonSettings) => void;
  updateComparisonForCurrentImage: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  cocoData: null,
  selectedAnnotationIds: [],
  visibleCategoryIds: [],
  hoveredAnnotationId: null,
  currentImageId: null,
  isDetailPanelOpen: false,
  detailPanelWidth: 350,
  searchQuery: '',
  searchResults: [],
  currentSearchIndex: -1,
  shouldCenterOnSelection: false,
  comparisonData: null,
  originalComparisonData: null,
  isComparing: false,
  comparisonSettings: null,
  diffResults: new Map(),
  diffStatistics: null,
  diffFilters: new Set<DiffFilter>(),

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
      currentImageId: null,
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

    return state.cocoData.annotations.filter((ann) => {
      // Filter by category visibility
      const categoryVisible = state.visibleCategoryIds.includes(ann.category_id);

      // Filter by current image if set
      const imageMatch = state.currentImageId ? ann.image_id === state.currentImageId : true;

      return categoryVisible && imageMatch;
    });
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

  setCurrentImageId: (id) => {
    set({ currentImageId: id });
    // If in comparison mode, update comparison annotations for the new image
    get().updateComparisonForCurrentImage();
  },

  getAnnotationsForCurrentImage: () => {
    const state = get();
    if (!state.cocoData || !state.currentImageId) return [];

    return state.cocoData.annotations.filter((ann) => ann.image_id === state.currentImageId);
  },

  // Annotation editing actions
  addAnnotation: (annotation) => {
    set((state) => {
      if (!state.cocoData) return state;

      return {
        cocoData: {
          ...state.cocoData,
          annotations: [...state.cocoData.annotations, annotation],
        },
      };
    });
  },

  updateAnnotation: (id, updates) => {
    set((state) => {
      if (!state.cocoData) return state;

      return {
        cocoData: {
          ...state.cocoData,
          annotations: state.cocoData.annotations.map((ann) =>
            ann.id === id ? { ...ann, ...updates } : ann
          ),
        },
      };
    });
  },

  deleteAnnotation: (id) => {
    set((state) => {
      if (!state.cocoData) return state;

      return {
        cocoData: {
          ...state.cocoData,
          annotations: state.cocoData.annotations.filter((ann) => ann.id !== id),
        },
        selectedAnnotationIds: state.selectedAnnotationIds.filter((aid) => aid !== id),
      };
    });
  },

  deleteAnnotations: (ids) => {
    set((state) => {
      if (!state.cocoData) return state;

      const idSet = new Set(ids);
      return {
        cocoData: {
          ...state.cocoData,
          annotations: state.cocoData.annotations.filter((ann) => !idSet.has(ann.id)),
        },
        selectedAnnotationIds: state.selectedAnnotationIds.filter(
          (aid) => typeof aid !== 'number' || !idSet.has(aid)
        ),
      };
    });
  },

  // Comparison actions
  setComparisonData: (originalData, filteredData, settings) => {
    set({
      originalComparisonData: originalData,
      comparisonData: filteredData,
      comparisonSettings: settings,
      isComparing: true,
      diffFilters: new Set(['tp-gt', 'tp-pred', 'fp', 'fn']), // Show all result types by default
    });
    get().calculateDiff();
  },

  clearComparison: () => {
    const currentState = get();

    set({
      comparisonData: null,
      originalComparisonData: null,
      comparisonSettings: null,
      isComparing: false,
      diffResults: new Map(),
      diffStatistics: null,
      diffFilters: new Set<DiffFilter>(),
      // Auto-enable all categories when exiting comparison mode
      visibleCategoryIds:
        currentState.cocoData?.categories.map((cat) => cat.id) || currentState.visibleCategoryIds,
    });

    // Force a re-calculation of visible annotations by triggering a state update
    const state = get();
    if (state.cocoData) {
      set({ selectedAnnotationIds: [...state.selectedAnnotationIds] });
    }
  },

  calculateDiff: () => {
    const state = get();
    if (!state.cocoData || !state.comparisonData || !state.comparisonSettings) return;

    // Import diff calculation logic dynamically to avoid circular dependencies
    import('../utils/diffCalculator').then(({ calculateDiff }) => {
      // Use role-agnostic approach: always pass primary data as first parameter
      const { results, statistics } = calculateDiff(
        state.cocoData!, // dataA (primary)
        state.comparisonData!, // dataB (comparison)
        state.comparisonSettings!
      );
      set({
        diffResults: results,
        diffStatistics: statistics,
      });
    });
  },

  toggleDiffFilter: (filter) => {
    set((state) => {
      const newFilters = new Set(state.diffFilters);

      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }

      return { diffFilters: newFilters };
    });
  },

  setDiffFilters: (filters) => {
    set({ diffFilters: filters });
  },

  updateComparisonSettings: (settings) => {
    set({ comparisonSettings: settings });
    get().calculateDiff();
  },

  updateComparisonForCurrentImage: (() => {
    let lastToastImageId: number | null = null;
    let toastTimeout: NodeJS.Timeout | null = null;

    return () => {
      const state = get();
      if (
        !state.isComparing ||
        !state.originalComparisonData ||
        !state.comparisonSettings ||
        !state.currentImageId
      ) {
        return;
      }

      // Check if there are annotations for the current image ID in ORIGINAL comparison data
      const correspondingAnnotations = state.originalComparisonData.annotations.filter(
        (ann) => ann.image_id === state.currentImageId
      );

      if (correspondingAnnotations.length === 0) {
        // Prevent duplicate toasts for the same image ID
        if (lastToastImageId !== state.currentImageId) {
          lastToastImageId = state.currentImageId;

          // Clear any pending toast
          if (toastTimeout) {
            clearTimeout(toastTimeout);
          }

          // Import toast to show info
          import('../stores/useToastStore').then(({ toast }) => {
            toast.info(
              '比較情報',
              `画像ID ${state.currentImageId} にはペアアノテーションがありません`
            );
          });

          // Reset toast ID after a delay
          toastTimeout = setTimeout(() => {
            lastToastImageId = null;
          }, 1000);
        }

        // Set empty comparison data but keep comparison mode active
        const emptyComparisonData: COCOData = {
          ...state.originalComparisonData,
          annotations: [],
          images: state.originalComparisonData.images.filter(
            (img) => img.id === state.currentImageId
          ),
        };

        set({ comparisonData: emptyComparisonData });
        get().calculateDiff();
        return;
      } else {
        // Reset last toast ID when annotations are found
        lastToastImageId = null;
      }

      // Find corresponding image metadata (optional - may not exist in images array)
      const correspondingImage = state.originalComparisonData.images.find(
        (img) => img.id === state.currentImageId
      );

      // Filter comparison data to only include annotations for the current image
      const filteredComparisonData: COCOData = {
        ...state.originalComparisonData,
        annotations: correspondingAnnotations.map((ann) => ({
          ...ann,
          image_id: state.currentImageId!, // Use the current image ID for comparison
        })),
        images: correspondingImage
          ? [
              {
                ...correspondingImage,
                id: state.currentImageId!, // Use the current image ID for comparison
              },
            ]
          : state.originalComparisonData.images.filter((img) => img.id === state.currentImageId),
      };

      // Update comparison data and recalculate diff
      set({ comparisonData: filteredComparisonData });
      get().calculateDiff();
    };
  })(),
}));
