// プロジェクト関連の型定義

import type { COCOCategory } from './coco';

/** プロジェクト設定 */
export interface ProjectSettings {
  /** 自動保存の有効/無効 */
  autoSave: boolean;
  /** 自動保存間隔（秒） */
  autoSaveInterval: number;
  /** バックアップ保持数 */
  backupCount: number;
  /** デフォルトカテゴリID */
  defaultCategoryId?: number;
  /** ラベル表示 */
  showLabels: boolean;
  /** バウンディングボックス表示 */
  showBoundingBoxes: boolean;
  /** ポリゴン表示 */
  showPolygons: boolean;
}

/** プロジェクトメタデータ（COCO出力時のinfo部分） */
export interface ProjectMetadata {
  /** データセットバージョン */
  version?: string;
  /** データセットの説明 */
  description?: string;
  /** 作成者名 */
  contributor?: string;
  /** 関連URL */
  url?: string;
  /** 作成日 */
  dateCreated?: string;
}

/** プロジェクトカテゴリ（COCOCategoryを拡張） */
export interface ProjectCategory extends COCOCategory {
  /** 表示色（HEX形式） */
  color: string;
  /** ショートカットキー */
  shortcutKey?: string;
  /** 表示/非表示 */
  visible: boolean;
  /** 表示順序 */
  order: number;
}

/** プロジェクト */
export interface Project {
  /** プロジェクトID（UUID） */
  id: string;
  /** プロジェクト名 */
  name: string;
  /** プロジェクトの説明 */
  description?: string;
  /** 画像フォルダのパス */
  imageFolderPath: string;
  /** プロジェクトファイルの保存先パス */
  projectFolderPath: string;
  /** 作成日時（ISO 8601） */
  createdAt: string;
  /** 更新日時（ISO 8601） */
  updatedAt: string;
  /** プロジェクト設定 */
  settings: ProjectSettings;
  /** メタデータ */
  metadata?: ProjectMetadata;
  /** カテゴリ一覧 */
  categories: ProjectCategory[];
}

/** プロジェクト作成時の設定 */
export interface ProjectConfig {
  name: string;
  description?: string;
  imageFolderPath: string;
  projectFolderPath: string;
  categories: Omit<ProjectCategory, 'order'>[];
  metadata?: ProjectMetadata;
  settings?: Partial<ProjectSettings>;
}

/** 最近のプロジェクト */
export interface RecentProject {
  /** プロジェクトID */
  id: string;
  /** プロジェクト名 */
  name: string;
  /** プロジェクトファイルのパス */
  path: string;
  /** 最終アクセス日時（ISO 8601） */
  lastAccessedAt: string;
}

/** デフォルトのプロジェクト設定 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  autoSave: true,
  autoSaveInterval: 60,
  backupCount: 10,
  showLabels: true,
  showBoundingBoxes: true,
  showPolygons: true,
};

/** カテゴリテンプレート */
export interface CategoryTemplate {
  id: string;
  name: string;
  description?: string;
  categories: Omit<ProjectCategory, 'order' | 'visible'>[];
}
