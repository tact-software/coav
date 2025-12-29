# 状態管理設計書

## 概要

既存のZustandストアパターンに従い、アノテーションエディタ機能に必要な新しいストアを追加する。
モード管理を統合し、通常・比較・アノテーションの3モードを管理する。

## ストア一覧

### 新規追加ストア

| ストア名 | 責務 | 永続化 |
|---------|------|--------|
| useProjectStore | プロジェクト管理 | ○（最近のプロジェクト） |
| useModeStore | アプリケーションモード管理 | - |
| useEditorStore | アノテーション編集状態管理 | - |
| useHistoryStore | Undo/Redo履歴 | - |

### 既存ストアの拡張

| ストア名 | 拡張内容 |
|---------|---------|
| useAnnotationStore | 編集用アクションの追加 |
| useSettingsStore | エディタ設定、タブ設定の追加 |

## useModeStore（新規）

アプリケーション全体のモードを管理する。

### 状態

| 状態 | 型 | 説明 |
|------|-----|------|
| mode | "normal" \| "comparison" \| "annotation" | 現在のモード |
| previousMode | "normal" \| "comparison" \| "annotation" | 前回のモード（戻る用） |

### アクション

| アクション | 引数 | 説明 |
|-----------|------|------|
| setMode | mode | モードを切り替え |
| enterComparisonMode | - | 比較モードに入る |
| exitComparisonMode | - | 比較モードを終了 |
| enterAnnotationMode | - | アノテーションモードに入る |
| exitAnnotationMode | - | アノテーションモードを終了 |

### 計算プロパティ（セレクタ）

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| isNormalMode | boolean | 通常モードか |
| isComparisonMode | boolean | 比較モードか |
| isAnnotationMode | boolean | アノテーションモードか |
| canEnterComparisonMode | boolean | 比較モードに入れるか（アノテーションモード中は不可） |
| canEnterAnnotationMode | boolean | アノテーションモードに入れるか（プロジェクトが必要） |

### モード切替ロジック

1. **通常 → 比較**
   - 比較ファイルが選択されていれば可能
   - アノテーションモード中は不可

2. **通常 → アノテーション**
   - プロジェクトが開いていれば可能
   - 比較モード中は不可

3. **比較/アノテーション → 通常**
   - 常に可能
   - 未保存の変更がある場合は確認ダイアログ

## useProjectStore

### 状態

| 状態 | 型 | 説明 |
|------|-----|------|
| currentProject | Project \| null | 現在開いているプロジェクト |
| isProjectLoaded | boolean | プロジェクトが読み込み済みか |
| isDirty | boolean | 未保存の変更があるか |
| recentProjects | RecentProject[] | 最近のプロジェクト一覧 |
| categories | ProjectCategory[] | 現在のプロジェクトのカテゴリ |
| selectedCategoryId | number | 選択中のカテゴリID |

### アクション

| アクション | 引数 | 説明 |
|-----------|------|------|
| createProject | config: ProjectConfig | 新規プロジェクト作成 |
| openProject | path: string | プロジェクトを開く |
| saveProject | - | プロジェクトを保存 |
| closeProject | - | プロジェクトを閉じる |
| updateProjectSettings | settings: Partial\<ProjectSettings\> | 設定を更新 |
| addCategory | category: ProjectCategory | カテゴリを追加 |
| updateCategory | id: number, updates: Partial\<ProjectCategory\> | カテゴリを更新 |
| deleteCategory | id: number | カテゴリを削除 |
| reorderCategories | ids: number[] | カテゴリの順序を変更 |
| selectCategory | id: number | カテゴリを選択 |
| setDirty | dirty: boolean | 変更フラグを設定 |
| addRecentProject | project: RecentProject | 最近のプロジェクトに追加 |

### 永続化

- `recentProjects` のみ localStorage に永続化
- キー: `coav-recent-projects`
- 最大保持数: 10件

## useEditorStore

アノテーションモード時の編集状態を管理。

### 状態

| 状態 | 型 | 説明 |
|------|-----|------|
| activeTool | EditorTool | 選択中のツール |
| isDrawing | boolean | 描画中フラグ |
| drawingState | DrawingState \| null | 描画中の状態 |
| selectedAnnotationIds | number[] | 選択中のアノテーションID |
| hoveredAnnotationId | number \| null | ホバー中のアノテーションID |
| clipboard | ClipboardData \| null | クリップボード |
| editingVertexIndex | number \| null | 編集中の頂点インデックス |

### アクション

| アクション | 引数 | 説明 |
|-----------|------|------|
| setActiveTool | tool: EditorTool | ツールを選択 |
| startDrawing | point: Point | 描画を開始 |
| updateDrawing | point: Point | 描画を更新 |
| finishDrawing | - | 描画を完了 |
| cancelDrawing | - | 描画をキャンセル |
| addPolygonPoint | point: Point | ポリゴンに頂点を追加 |
| selectAnnotation | id: number, additive?: boolean | アノテーションを選択 |
| selectAnnotations | ids: number[] | 複数アノテーションを選択 |
| deselectAll | - | 選択を解除 |
| setHoveredAnnotation | id: number \| null | ホバー状態を設定 |
| copyToClipboard | - | 選択をコピー |
| cutToClipboard | - | 選択を切り取り |
| pasteFromClipboard | imageId: number | ペースト |
| setEditingVertex | index: number \| null | 編集中の頂点を設定 |
| reset | - | 状態をリセット（モード終了時） |

### 計算プロパティ（セレクタ）

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| hasSelection | boolean | 選択があるか |
| canPaste | boolean | ペースト可能か |
| selectedAnnotations | EditableAnnotation[] | 選択中のアノテーション |

## useHistoryStore

### 状態

| 状態 | 型 | 説明 |
|------|-----|------|
| past | HistoryEntry[] | 過去の履歴（最大20） |
| future | HistoryEntry[] | 未来の履歴（Redo用） |
| maxHistorySize | number | 最大履歴数（20） |

### アクション

| アクション | 引数 | 説明 |
|-----------|------|------|
| pushHistory | entry: HistoryEntry | 履歴を追加 |
| undo | - | 元に戻す |
| redo | - | やり直す |
| clearHistory | - | 履歴をクリア |

### 計算プロパティ（セレクタ）

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| canUndo | boolean | Undo可能か |
| canRedo | boolean | Redo可能か |
| undoDescription | string \| null | 次のUndo操作の説明 |
| redoDescription | string \| null | 次のRedo操作の説明 |

### 履歴管理ロジック

1. **履歴追加時**
   - futureをクリア
   - pastの先頭に追加
   - pastが20を超えたら古いものを削除

2. **Undo実行時**
   - pastから最新のエントリを取得
   - 逆操作を実行
   - エントリをfutureに移動

3. **Redo実行時**
   - futureから最新のエントリを取得
   - 操作を再実行
   - エントリをpastに移動

## useAnnotationStoreの拡張

### 追加状態

| 状態 | 型 | 説明 |
|------|-----|------|
| editableAnnotations | Map\<number, EditableAnnotation\> | 編集可能なアノテーション（画像IDでグループ化） |
| maxAnnotationId | number | 最大アノテーションID |

### 追加アクション

| アクション | 引数 | 説明 |
|-----------|------|------|
| addAnnotation | annotation: EditableAnnotation | アノテーションを追加 |
| updateAnnotation | id: number, updates: Partial\<EditableAnnotation\> | アノテーションを更新 |
| deleteAnnotation | id: number | アノテーションを削除 |
| deleteAnnotations | ids: number[] | 複数アノテーションを削除 |
| moveAnnotation | id: number, dx: number, dy: number | アノテーションを移動 |
| resizeAnnotation | id: number, bbox: BoundingBox | サイズを変更 |
| updatePolygonVertex | id: number, vertexIndex: number, point: Point | 頂点を更新 |
| addPolygonVertex | id: number, afterIndex: number, point: Point | 頂点を追加 |
| deletePolygonVertex | id: number, vertexIndex: number | 頂点を削除 |
| changeCategory | ids: number[], categoryId: number | カテゴリを変更 |
| setAnnotationZIndex | id: number, zIndex: number | Z-Indexを変更 |
| generateAnnotationId | - | 新しいアノテーションIDを生成 |
| loadAnnotationsForProject | annotations: EditableAnnotation[] | プロジェクトのアノテーションを読み込み |
| clearEditableAnnotations | - | 編集可能アノテーションをクリア |

## useSettingsStoreの拡張

### 追加タブタイプ

既存の TabType を拡張:

```
既存: 'control' | 'info' | 'detail' | 'files' | 'navigation'
追加: 'comparison' | 'annotation'
```

### モード別タブ設定

| 状態 | 型 | 説明 |
|------|-----|------|
| normalModeTabs | TabType[] | 通常モードで表示するタブ |
| comparisonModeTabs | TabType[] | 比較モードで表示するタブ |
| annotationModeTabs | TabType[] | アノテーションモードで表示するタブ |

### デフォルト設定

**通常モード**: control, info, detail, files, navigation
**比較モード**: comparison, info, detail, files, navigation
**アノテーションモード**: annotation, control, info, detail, files, navigation

### 追加状態

| 状態 | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| editorSettings | EditorSettings | - | エディタ設定 |

### EditorSettings

| フィールド | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| minAnnotationSize | number | 5 | 最小アノテーションサイズ |
| snapToGrid | boolean | false | グリッドスナップ |
| gridSize | number | 10 | グリッドサイズ |
| showCrosshair | boolean | true | クロスヘア表示 |
| confirmDelete | boolean | true | 削除確認 |
| shortcuts | ShortcutSettings | - | ショートカット設定 |

## ストア間の連携

### データフロー

```
ユーザー操作（モード切替）
    ↓
useModeStore (モード状態)
    ↓
useSettingsStore (表示タブ切替)
    ↓
各パネルコンポーネント
```

```
ユーザー操作（アノテーション編集）
    ↓
useEditorStore (ツール・選択状態)
    ↓
useAnnotationStore (アノテーションデータ)
    ↓
useHistoryStore (履歴記録)
    ↓
useProjectStore (変更フラグ)
```

### 連携パターン

1. **モード切替（通常 → アノテーション）**
   - useModeStore: モードを annotation に変更
   - useSettingsStore: タブ表示を annotationModeTabs に切替
   - useEditorStore: ツールを select に初期化

2. **モード切替（アノテーション → 通常）**
   - useProjectStore: isDirty をチェック
   - useModeStore: モードを normal に変更
   - useSettingsStore: タブ表示を normalModeTabs に切替
   - useEditorStore: 状態をリセット

3. **アノテーション作成**
   - useEditorStore: 描画状態を管理
   - useAnnotationStore: アノテーションを追加
   - useHistoryStore: 履歴にCREATEを記録
   - useProjectStore: isDirtyをtrueに

4. **Undo実行**
   - useHistoryStore: 履歴からエントリを取得
   - useAnnotationStore: 逆操作を実行
   - useEditorStore: 選択状態をクリア

5. **プロジェクト保存**
   - useProjectStore: 保存処理を実行
   - useAnnotationStore: 現在のアノテーションを取得
   - useProjectStore: isDirtyをfalseに

## ミドルウェア

### devtools

すべての新規ストアに devtools ミドルウェアを適用（開発時のデバッグ用）

### persist

- useProjectStore の recentProjects に persist ミドルウェアを適用
- useSettingsStore の editorSettings に persist ミドルウェアを適用

### subscribeWithSelector

- useModeStore に適用し、モード変更を監視可能に
- useHistoryStore に適用し、canUndo/canRedo の変更を監視可能に

## パフォーマンス考慮

### セレクタの最適化

- 頻繁にアクセスされる派生データはセレクタとして定義
- useMemo / useCallback との併用

### 不要な再レンダリング防止

- 状態の分割（必要な部分だけsubscribe）
- shallow比較の活用
- モード状態は独立したストアで管理

### バッチ更新

- 複数のアノテーション操作はバッチとして1つの履歴エントリに
