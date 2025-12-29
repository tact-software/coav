import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectCategory, ProjectSettings, RecentProject } from '../types';

interface ProjectState {
  /** 現在開いているプロジェクト */
  currentProject: Project | null;
  /** プロジェクトが読み込み済みか */
  isProjectLoaded: boolean;
  /** 未保存の変更があるか */
  isDirty: boolean;
  /** 最近のプロジェクト一覧 */
  recentProjects: RecentProject[];
  /** 選択中のカテゴリID */
  selectedCategoryId: number | null;

  // アクション
  setCurrentProject: (project: Project | null) => void;
  setProjectLoaded: (loaded: boolean) => void;
  setDirty: (dirty: boolean) => void;
  closeProject: () => void;
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
  addCategory: (category: ProjectCategory) => void;
  updateCategory: (id: number, updates: Partial<ProjectCategory>) => void;
  deleteCategory: (id: number) => void;
  reorderCategories: (ids: number[]) => void;
  selectCategory: (id: number) => void;
  addRecentProject: (project: RecentProject) => void;
  removeRecentProject: (id: string) => void;
  getCategories: () => ProjectCategory[];
}

const MAX_RECENT_PROJECTS = 10;

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      isProjectLoaded: false,
      isDirty: false,
      recentProjects: [],
      selectedCategoryId: null,

      setCurrentProject: (project) => {
        set({
          currentProject: project,
          isProjectLoaded: project !== null,
          isDirty: false,
          selectedCategoryId: project?.categories[0]?.id ?? null,
        });
      },

      setProjectLoaded: (loaded) => {
        set({ isProjectLoaded: loaded });
      },

      setDirty: (dirty) => {
        set({ isDirty: dirty });
      },

      closeProject: () => {
        set({
          currentProject: null,
          isProjectLoaded: false,
          isDirty: false,
          selectedCategoryId: null,
        });
      },

      updateProjectSettings: (settings) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            settings: { ...currentProject.settings, ...settings },
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        });
      },

      addCategory: (category) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const newCategory: ProjectCategory = {
          ...category,
          order: currentProject.categories.length,
        };

        set({
          currentProject: {
            ...currentProject,
            categories: [...currentProject.categories, newCategory],
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        });
      },

      updateCategory: (id, updates) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            categories: currentProject.categories.map((cat) =>
              cat.id === id ? { ...cat, ...updates } : cat
            ),
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        });
      },

      deleteCategory: (id) => {
        const { currentProject, selectedCategoryId } = get();
        if (!currentProject) return;

        const newCategories = currentProject.categories
          .filter((cat) => cat.id !== id)
          .map((cat, index) => ({ ...cat, order: index }));

        set({
          currentProject: {
            ...currentProject,
            categories: newCategories,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
          selectedCategoryId:
            selectedCategoryId === id ? (newCategories[0]?.id ?? null) : selectedCategoryId,
        });
      },

      reorderCategories: (ids) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const categoryMap = new Map(currentProject.categories.map((cat) => [cat.id, cat]));
        const reorderedCategories = ids
          .map((id, index) => {
            const cat = categoryMap.get(id);
            return cat ? { ...cat, order: index } : null;
          })
          .filter((cat): cat is ProjectCategory => cat !== null);

        set({
          currentProject: {
            ...currentProject,
            categories: reorderedCategories,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        });
      },

      selectCategory: (id) => {
        set({ selectedCategoryId: id });
      },

      addRecentProject: (project) => {
        set((state) => {
          const filtered = state.recentProjects.filter((p) => p.id !== project.id);
          const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);
          return { recentProjects: updated };
        });
      },

      removeRecentProject: (id) => {
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.id !== id),
        }));
      },

      getCategories: () => {
        const { currentProject } = get();
        return currentProject?.categories ?? [];
      },
    }),
    {
      name: 'coav-projects',
      partialize: (state) => ({
        recentProjects: state.recentProjects,
      }),
    }
  )
);

// セレクタ
export const selectCurrentProject = (state: ProjectState) => state.currentProject;
export const selectIsProjectLoaded = (state: ProjectState) => state.isProjectLoaded;
export const selectIsDirty = (state: ProjectState) => state.isDirty;
export const selectCategories = (state: ProjectState) => state.currentProject?.categories ?? [];
export const selectSelectedCategoryId = (state: ProjectState) => state.selectedCategoryId;
export const selectSelectedCategory = (state: ProjectState) => {
  if (!state.currentProject || state.selectedCategoryId === null) return null;
  return state.currentProject.categories.find((cat) => cat.id === state.selectedCategoryId) ?? null;
};
