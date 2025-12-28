import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import i18n from '../i18n/config';

export type Language = 'ja' | 'en';
export type Theme = 'light' | 'dark' | 'system';

interface DisplaySettings {
  showAnnotations: boolean;
  showLabels: boolean;
  showBoundingBoxes: boolean;
  lineWidth: number;
}

interface DetailSettings {
  promotedFields: string[]; // Promoted field paths like "option.detection.confidence"
}

export type TabType = 'control' | 'info' | 'detail' | 'files' | 'navigation';
export type PanelSide = 'left' | 'right';

interface PanelLayoutSettings {
  leftPanelTabs: TabType[];
  rightPanelTabs: TabType[];
  defaultLeftTab: TabType;
  defaultRightTab: TabType;
}

interface ColorSettings {
  // Category colors (categoryId -> hex color)
  categoryColors: Record<number, string>;
  // Global opacity settings (0-1)
  fillOpacity: number;
  selectedFillOpacity: number;
  hoverFillOpacity: number;
  strokeOpacity: number;
  // Comparison colors
  comparison: {
    gtColors: {
      tp: string; // True Positive (Ground Truth)
      fn: string; // False Negative
    };
    predColors: {
      tp: string; // True Positive (Prediction)
      fp: string; // False Positive
    };
  };
}

interface SettingsState {
  // General settings
  language: Language;
  theme: Theme;

  // Display settings
  display: DisplaySettings;

  // Detail settings
  detail: DetailSettings;

  // Panel layout settings
  panelLayout: PanelLayoutSettings;

  // Color settings
  colors: ColorSettings;

  // Modal state
  isSettingsModalOpen: boolean;

  // Actions
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  updateDetailSettings: (settings: Partial<DetailSettings>) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  resetSettings: () => void;
  updatePanelLayout: (layout: Partial<PanelLayoutSettings>) => void;
  moveTabToPanel: (tab: TabType, side: PanelSide) => void;
  updateColorSettings: (settings: Partial<ColorSettings>) => void;
  setCategoryColor: (categoryId: number, color: string) => void;
  resetCategoryColors: () => void;
  toggleAnnotations: () => void;
  toggleLabels: () => void;
  toggleBoundingBoxes: () => void;
}

// Helper function to generate color from category ID
export const generateCategoryColor = (categoryId: number): string => {
  const hue = (categoryId * 137.5) % 360;
  return `hsl(${hue}, 50%, 50%)`;
};

const defaultSettings: Omit<
  SettingsState,
  | 'setLanguage'
  | 'setTheme'
  | 'updateDisplaySettings'
  | 'updateDetailSettings'
  | 'openSettingsModal'
  | 'closeSettingsModal'
  | 'resetSettings'
  | 'updatePanelLayout'
  | 'moveTabToPanel'
  | 'updateColorSettings'
  | 'setCategoryColor'
  | 'resetCategoryColors'
  | 'toggleAnnotations'
  | 'toggleLabels'
  | 'toggleBoundingBoxes'
> = {
  language: 'ja',
  theme: 'system',
  display: {
    showAnnotations: true,
    showLabels: true,
    showBoundingBoxes: true,
    lineWidth: 2,
  },
  detail: {
    promotedFields: [],
  },
  panelLayout: {
    leftPanelTabs: ['control', 'files', 'navigation'],
    rightPanelTabs: ['info', 'detail'],
    defaultLeftTab: 'control',
    defaultRightTab: 'info',
  },
  colors: {
    categoryColors: {},
    fillOpacity: 0.3,
    selectedFillOpacity: 0.5,
    hoverFillOpacity: 0.4,
    strokeOpacity: 1.0,
    comparison: {
      gtColors: {
        tp: '#4caf50', // Green
        fn: '#ff9800', // Orange
      },
      predColors: {
        tp: '#66bb6a', // Light Green
        fp: '#f44336', // Red
      },
    },
  },
  isSettingsModalOpen: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setLanguage: (language) => {
        i18n.changeLanguage(language);
        // Update native menu language
        invoke('set_menu_language', { language }).catch((err) => {
          console.error('Failed to update menu language:', err);
        });
        set({ language });
      },

      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
          document.documentElement.setAttribute('data-theme', theme);
        }
      },

      updateDisplaySettings: (settings) => {
        set((state) => ({
          display: { ...state.display, ...settings },
        }));
      },

      updateDetailSettings: (settings) => {
        set((state) => ({
          detail: { ...state.detail, ...settings },
        }));
      },

      openSettingsModal: () => {
        set({ isSettingsModalOpen: true });
      },

      closeSettingsModal: () => {
        set({ isSettingsModalOpen: false });
      },

      resetSettings: () => {
        set(defaultSettings);
        i18n.changeLanguage(defaultSettings.language);
      },

      updatePanelLayout: (layout) => {
        set((state) => ({
          panelLayout: { ...state.panelLayout, ...layout },
        }));
      },

      moveTabToPanel: (tab, side) => {
        set((state) => {
          const newLayout = { ...state.panelLayout };
          // Remove tab from both panels
          newLayout.leftPanelTabs = newLayout.leftPanelTabs.filter((t) => t !== tab);
          newLayout.rightPanelTabs = newLayout.rightPanelTabs.filter((t) => t !== tab);

          // Add to target panel
          if (side === 'left') {
            newLayout.leftPanelTabs.push(tab);
          } else {
            newLayout.rightPanelTabs.push(tab);
          }

          return { panelLayout: newLayout };
        });
      },

      updateColorSettings: (settings) => {
        set((state) => ({
          colors: { ...state.colors, ...settings },
        }));
      },

      setCategoryColor: (categoryId, color) => {
        set((state) => ({
          colors: {
            ...state.colors,
            categoryColors: {
              ...state.colors.categoryColors,
              [categoryId]: color,
            },
          },
        }));
      },

      resetCategoryColors: () => {
        set((state) => ({
          colors: {
            ...state.colors,
            categoryColors: {},
          },
        }));
      },

      toggleAnnotations: () => {
        set((state) => ({
          display: { ...state.display, showAnnotations: !state.display.showAnnotations },
        }));
      },

      toggleLabels: () => {
        set((state) => ({
          display: { ...state.display, showLabels: !state.display.showLabels },
        }));
      },

      toggleBoundingBoxes: () => {
        set((state) => ({
          display: { ...state.display, showBoundingBoxes: !state.display.showBoundingBoxes },
        }));
      },
    }),
    {
      name: 'coav-settings',
      version: 2, // Bump version to trigger migration
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        display: state.display,
        detail: state.detail,
        panelLayout: state.panelLayout,
        colors: state.colors,
      }),
      migrate: (persistedState: unknown, _version: number) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        const state = persistedState as Record<string, unknown>;

        // Migrate from older versions that don't have comparison colors
        if (
          'colors' in state &&
          state.colors &&
          typeof state.colors === 'object' &&
          !('comparison' in state.colors)
        ) {
          (state.colors as Partial<ColorSettings>).comparison = {
            gtColors: {
              tp: '#4caf50', // Green
              fn: '#ff9800', // Orange
            },
            predColors: {
              tp: '#66bb6a', // Light Green
              fp: '#f44336', // Red
            },
          };
        }

        // Migrate display settings to include showAnnotations
        if ('display' in state && state.display && typeof state.display === 'object') {
          const display = state.display as Record<string, unknown>;
          if (!('showAnnotations' in display)) {
            display.showAnnotations = true;
          }
        }

        return state;
      },
    }
  )
);

// Initialize theme on app start
const initializeTheme = () => {
  const { theme } = useSettingsStore.getState();
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const currentTheme = useSettingsStore.getState().theme;
      if (currentTheme === 'system') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

initializeTheme();

// Initialize menu language on app start
const initializeMenuLanguage = () => {
  const { language } = useSettingsStore.getState();
  invoke('set_menu_language', { language }).catch((err) => {
    console.error('Failed to initialize menu language:', err);
  });
};

initializeMenuLanguage();
