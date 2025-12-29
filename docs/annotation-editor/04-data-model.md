# データモデル設計書

## 概要

アノテーションエディタ機能で使用するデータモデルを定義する。
既存のCOCO型定義を活用しつつ、プロジェクト管理に必要な型を追加する。

## プロジェクト関連

### Project（プロジェクト）

プロジェクトの基本情報を保持する。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | ○ | プロジェクトの一意識別子（UUID） |
| name | string | ○ | プロジェクト名 |
| description | string | - | プロジェクトの説明 |
| imageFolderPath | string | ○ | 画像フォルダのパス |
| projectFolderPath | string | ○ | プロジェクトファイルの保存先パス |
| createdAt | string (ISO 8601) | ○ | 作成日時 |
| updatedAt | string (ISO 8601) | ○ | 更新日時 |
| settings | ProjectSettings | ○ | プロジェクト設定 |

### ProjectSettings（プロジェクト設定）

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| autoSave | boolean | ○ | true | 自動保存の有効/無効 |
| autoSaveInterval | number | ○ | 60 | 自動保存間隔（秒） |
| backupCount | number | ○ | 10 | バックアップ保持数 |
| defaultCategoryId | number | - | - | デフォルトカテゴリID |
| showLabels | boolean | ○ | true | ラベル表示 |
| showBoundingBoxes | boolean | ○ | true | BBox表示 |
| showPolygons | boolean | ○ | true | ポリゴン表示 |

### ProjectMetadata（プロジェクトメタデータ）

COCO出力時のinfo部分に対応。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| version | string | - | データセットバージョン |
| description | string | - | データセットの説明 |
| contributor | string | - | 作成者名 |
| url | string | - | 関連URL |
| dateCreated | string | - | 作成日 |

## カテゴリ関連

### ProjectCategory（プロジェクトカテゴリ）

COCOCategoryを拡張し、エディタ固有の情報を追加。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | number | ○ | カテゴリID（1以上） |
| name | string | ○ | カテゴリ名 |
| supercategory | string | - | 親カテゴリ名 |
| color | string | ○ | 表示色（HEX形式、例: "#FF5733"） |
| shortcutKey | string | - | ショートカットキー（"1"-"9", "a"-"z"） |
| visible | boolean | ○ | 表示/非表示 |
| order | number | ○ | 表示順序 |

### CategoryTemplate（カテゴリテンプレート）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | ○ | テンプレートID |
| name | string | ○ | テンプレート名（例: "COCO 80", "VOC 20"） |
| description | string | - | テンプレートの説明 |
| categories | ProjectCategory[] | ○ | カテゴリ一覧 |

## アノテーション関連

### EditableAnnotation（編集可能アノテーション）

COCOAnnotationを拡張し、編集状態を追加。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | number | ○ | アノテーションID |
| image_id | number | ○ | 画像ID |
| category_id | number | ○ | カテゴリID |
| bbox | [number, number, number, number] | ○ | バウンディングボックス [x, y, width, height] |
| segmentation | number[][] | ○ | ポリゴン座標（空配列の場合はBBoxのみ） |
| area | number | ○ | 面積（自動計算） |
| iscrowd | 0 \| 1 | ○ | 群衆フラグ |
| zIndex | number | ○ | 描画順序 |
| isSelected | boolean | - | 選択状態（実行時のみ） |
| isVisible | boolean | - | 表示状態（実行時のみ） |

### AnnotationType（アノテーション種別）

| 値 | 説明 |
|----|------|
| "bbox" | バウンディングボックスのみ |
| "polygon" | ポリゴン（segmentationが空でない） |

## 編集操作関連

### EditAction（編集アクション）

Undo/Redo用の操作記録。

| タイプ | ペイロード | 説明 |
|--------|-----------|------|
| CREATE | annotation: EditableAnnotation | アノテーション作成 |
| DELETE | annotation: EditableAnnotation | アノテーション削除 |
| UPDATE | id: number, before: Partial, after: Partial | アノテーション更新 |
| BATCH | actions: EditAction[] | 複数操作のバッチ |

### HistoryEntry（履歴エントリ）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | エントリID |
| timestamp | number | タイムスタンプ |
| action | EditAction | 実行されたアクション |
| description | string | 操作の説明（UI表示用） |

## ツール関連

### EditorTool（エディタツール）

| 値 | 説明 |
|----|------|
| "select" | 選択ツール |
| "bbox" | BBox描画ツール |
| "polygon" | ポリゴン描画ツール |

### DrawingState（描画状態）

描画中の一時的な状態を保持。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| isDrawing | boolean | 描画中フラグ |
| tool | EditorTool | 使用中のツール |
| startPoint | Point | 開始点（BBox用） |
| currentPoint | Point | 現在のマウス位置 |
| points | Point[] | 頂点リスト（ポリゴン用） |

### Point（座標）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| x | number | X座標 |
| y | number | Y座標 |

## 選択関連

### SelectionState（選択状態）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| selectedIds | number[] | 選択中のアノテーションID |
| activeVertexIndex | number \| null | 編集中の頂点インデックス（ポリゴン用） |
| selectionBox | BoundingBox \| null | 範囲選択中の矩形 |

### BoundingBox（矩形）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| x | number | 左上X座標 |
| y | number | 左上Y座標 |
| width | number | 幅 |
| height | number | 高さ |

## クリップボード関連

### ClipboardData（クリップボードデータ）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| annotations | EditableAnnotation[] | コピーされたアノテーション |
| sourceImageId | number | コピー元の画像ID |

## ファイル形式

### project.json

プロジェクト設定ファイルの構造。

```
{
  "id": "<UUID>",
  "name": "<プロジェクト名>",
  "description": "<説明>",
  "imageFolderPath": "<画像フォルダパス>",
  "createdAt": "<ISO 8601>",
  "updatedAt": "<ISO 8601>",
  "settings": {
    "autoSave": true,
    "autoSaveInterval": 60,
    "backupCount": 10,
    "defaultCategoryId": 1
  },
  "metadata": {
    "version": "1.0",
    "contributor": "<作成者>"
  },
  "categories": [
    {
      "id": 1,
      "name": "人物",
      "supercategory": "person",
      "color": "#FF5733",
      "shortcutKey": "1",
      "visible": true,
      "order": 0
    }
  ]
}
```

### annotations.json

COCO形式のアノテーションファイル。標準COCO形式に準拠。

```
{
  "info": {
    "version": "1.0",
    "description": "<説明>",
    "contributor": "<作成者>",
    "date_created": "<作成日>"
  },
  "images": [
    {
      "id": 1,
      "file_name": "image001.jpg",
      "width": 1920,
      "height": 1080
    }
  ],
  "annotations": [
    {
      "id": 1,
      "image_id": 1,
      "category_id": 1,
      "bbox": [100, 200, 300, 400],
      "segmentation": [[100, 200, 400, 200, 400, 600, 100, 600]],
      "area": 120000,
      "iscrowd": 0
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "人物",
      "supercategory": "person"
    }
  ]
}
```

## データ変換

### ProjectCategory → COCOCategory

エクスポート時の変換。

- color, shortcutKey, visible, order フィールドを除外
- id, name, supercategory のみを出力

### EditableAnnotation → COCOAnnotation

エクスポート時の変換。

- isSelected, isVisible, zIndex フィールドを除外
- 標準COCOフィールドのみを出力

### COCOAnnotation → EditableAnnotation

インポート時の変換。

- zIndex: インポート順に自動割り当て
- isSelected: false
- isVisible: true

## ID管理

### アノテーションID

- プロジェクト内で一意
- 1から始まる連番
- 削除されたIDは再利用しない
- 新規作成時は最大ID + 1

### 画像ID

- COCOファイルから読み込み、または自動割り当て
- ファイル名から決定論的に生成可能

### カテゴリID

- プロジェクト内で一意
- 1から始まる連番
- ユーザーが任意に設定可能
