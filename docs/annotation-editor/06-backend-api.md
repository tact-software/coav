# バックエンドAPI設計書

## 概要

Tauriのコマンドシステムを使用して、フロントエンドとRustバックエンド間の通信を行う。
既存のコマンドパターンに従い、プロジェクト管理とアノテーション保存のためのコマンドを追加する。

## 既存コマンド（参考）

| コマンド | 機能 |
|---------|------|
| load_annotations | COCOファイル読み込み |
| load_image | 画像ファイル読み込み |
| scan_folder | フォルダスキャン |
| generate_sample_data | サンプルデータ生成 |

## 新規コマンド

### プロジェクト管理

#### create_project

新規プロジェクトを作成する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| name | string | プロジェクト名 |
| description | string (optional) | プロジェクトの説明 |
| image_folder_path | string | 画像フォルダのパス |
| project_folder_path | string | プロジェクト保存先パス |
| categories | ProjectCategory[] | カテゴリ定義 |
| metadata | ProjectMetadata (optional) | メタデータ |
| settings | ProjectSettings (optional) | 設定（省略時はデフォルト） |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| project | Project | 作成されたプロジェクト |

**処理**

1. プロジェクトIDを生成（UUID）
2. プロジェクトフォルダを作成
3. project.json を作成
4. 空の annotations.json を作成
5. backups フォルダを作成
6. プロジェクトオブジェクトを返す

**エラー**

- 保存先フォルダへのアクセス権限がない
- 画像フォルダが存在しない
- プロジェクト名が空

---

#### load_project

既存プロジェクトを読み込む。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| project_path | string | project.json のパス |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| project | Project | プロジェクト情報 |
| annotations | COCOData | アノテーションデータ |
| image_list | ImageMetadata[] | 画像一覧 |

**処理**

1. project.json を読み込み
2. annotations.json を読み込み
3. 画像フォルダをスキャン（既存の scan_folder を内部利用）
4. データを返す

**エラー**

- ファイルが存在しない
- JSONパースエラー
- 画像フォルダが見つからない（警告として返す）

---

#### save_project

プロジェクト設定を保存する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| project | Project | プロジェクト情報 |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | 成功フラグ |

**処理**

1. updatedAt を更新
2. project.json を上書き保存

**エラー**

- 書き込み権限がない
- ディスク容量不足

---

#### delete_project

プロジェクトを削除する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| project_folder_path | string | プロジェクトフォルダのパス |
| delete_files | boolean | ファイルも削除するか |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | 成功フラグ |

**処理**

- delete_files=true: フォルダごと削除
- delete_files=false: 削除せず成功を返す（UIでの確認用）

---

### アノテーション管理

#### save_annotations

アノテーションを保存する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| project_folder_path | string | プロジェクトフォルダのパス |
| coco_data | COCOData | COCOフォーマットのデータ |
| create_backup | boolean | バックアップを作成するか |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | 成功フラグ |
| backup_path | string (optional) | バックアップファイルパス |

**処理**

1. create_backup=true の場合、既存ファイルをバックアップ
2. annotations.json を上書き保存
3. 古いバックアップを削除（設定の保持数に従う）

---

#### export_coco

COCO形式でエクスポートする。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| coco_data | COCOData | COCOフォーマットのデータ |
| output_path | string | 出力先パス |
| options | ExportOptions | エクスポートオプション |

**ExportOptions**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| include_images_without_annotations | boolean | アノテーションなし画像を含むか |
| category_ids | number[] (optional) | 出力するカテゴリ（省略時は全て） |
| image_ids | number[] (optional) | 出力する画像（省略時は全て） |
| pretty_print | boolean | 整形出力するか |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | 成功フラグ |
| annotation_count | number | 出力されたアノテーション数 |
| image_count | number | 出力された画像数 |

---

#### import_annotations

既存のCOCOファイルをインポートする。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| coco_path | string | インポート元のCOCOファイルパス |
| category_mapping | Map\<number, number\> | カテゴリIDのマッピング |
| create_missing_categories | boolean | 不足カテゴリを自動作成するか |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| annotations | COCOAnnotation[] | インポートされたアノテーション |
| new_categories | COCOCategory[] | 新規作成されたカテゴリ |
| skipped_count | number | スキップされたアノテーション数 |
| warnings | string[] | 警告メッセージ |

---

### バックアップ管理

#### list_backups

バックアップ一覧を取得する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| project_folder_path | string | プロジェクトフォルダのパス |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| backups | BackupInfo[] | バックアップ一覧 |

**BackupInfo**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| path | string | バックアップファイルパス |
| created_at | string | 作成日時（ISO 8601） |
| size | number | ファイルサイズ（バイト） |
| annotation_count | number | アノテーション数 |

---

#### restore_backup

バックアップから復元する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| backup_path | string | バックアップファイルパス |
| project_folder_path | string | プロジェクトフォルダのパス |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | 成功フラグ |
| coco_data | COCOData | 復元されたデータ |

**処理**

1. 現在のファイルをバックアップ（上書き防止）
2. バックアップファイルを annotations.json にコピー
3. データを読み込んで返す

---

#### delete_backup

バックアップを削除する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| backup_path | string | バックアップファイルパス |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | 成功フラグ |

---

### ユーティリティ

#### validate_project_path

プロジェクトパスの妥当性を検証する。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| path | string | 検証するパス |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| is_valid | boolean | 有効か |
| error_message | string (optional) | エラーメッセージ |
| existing_project | boolean | 既存プロジェクトがあるか |

---

#### get_image_metadata

画像のメタデータを取得する（サイズなど）。

**入力**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| image_path | string | 画像ファイルパス |

**出力**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| width | number | 画像幅 |
| height | number | 画像高さ |
| file_size | number | ファイルサイズ |
| format | string | 画像フォーマット |

---

## エラーハンドリング

### エラーレスポンス形式

すべてのコマンドは Result 型を返す。

**成功時**: データを直接返す

**失敗時**: エラーメッセージを文字列で返す

### エラーコード体系

| プレフィックス | 意味 |
|---------------|------|
| PROJECT_ | プロジェクト関連エラー |
| FILE_ | ファイル操作エラー |
| PARSE_ | パースエラー |
| VALIDATION_ | バリデーションエラー |

### エラー例

- `PROJECT_NOT_FOUND`: プロジェクトが見つからない
- `FILE_PERMISSION_DENIED`: ファイル権限エラー
- `FILE_DISK_FULL`: ディスク容量不足
- `PARSE_INVALID_JSON`: JSON形式エラー
- `VALIDATION_EMPTY_NAME`: 名前が空

## ファイルモジュール構成

### 追加ファイル

```
src-tauri/src/
├── commands/
│   ├── mod.rs           # 既存（プロジェクト系を追加）
│   ├── project.rs       # プロジェクト管理コマンド（新規）
│   └── backup.rs        # バックアップ管理コマンド（新規）
└── models/
    ├── mod.rs           # 既存
    └── project.rs       # プロジェクト型定義（新規）
```

## セキュリティ考慮

### ファイルアクセス

- Tauriの allowlist を適切に設定
- プロジェクトフォルダ外へのアクセスを制限

### パス検証

- パストラバーサル攻撃の防止
- シンボリックリンクの適切な処理

### データ検証

- 入力データのバリデーション
- 不正なCOCOデータの拒否
