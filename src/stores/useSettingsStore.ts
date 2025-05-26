import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/config';

export type Language = 'ja' | 'en';
export type Theme = 'light' | 'dark' | 'system';

interface DisplaySettings {
  showLabels: boolean;
  showBoundingBoxes: boolean;
  annotationOpacity: number;
  lineWidth: number;
}

interface DetailSettings {
  promotedFields: string[]; // Promoted field paths like "option.detection.confidence"
}

interface SettingsState {
  // General settings
  language: Language;
  theme: Theme;

  // Display settings
  display: DisplaySettings;

  // Detail settings
  detail: DetailSettings;

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
}

const defaultSettings: Omit<
  SettingsState,
  | 'setLanguage'
  | 'setTheme'
  | 'updateDisplaySettings'
  | 'updateDetailSettings'
  | 'openSettingsModal'
  | 'closeSettingsModal'
  | 'resetSettings'
> = {
  language: 'ja',
  theme: 'system',
  display: {
    showLabels: true,
    showBoundingBoxes: true,
    annotationOpacity: 0.6,
    lineWidth: 2,
  },
  detail: {
    promotedFields: [],
  },
  isSettingsModalOpen: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setLanguage: (language) => {
        i18n.changeLanguage(language);
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
    }),
    {
      name: 'coav-settings',
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        display: state.display,
        detail: state.detail,
      }),
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
