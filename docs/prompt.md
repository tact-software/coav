# AIエージェントプロンプトサンプル

## プロンプトの目的

## 例

### 機能開発開始時

ISSUEから開発仕様書を作成する。

```
ghコマンドで、ISSUE#{issue_number}の内容を取得し、開発仕様書を作成してください。
開発仕様書は、docs/DESIGN_TEMPLATE.mdを参考にしてください。
サンプルとして、docs/template/DESIGN_SAMPLE.mdを参照してください。
```

### 機能開発完了時

開発内容をドキュメントにまとめる。

```
developブランチとの差分をgitコマンドで取得し、本ブランチの変更内容を理解してください。
変更内容をdocs/IMPLEMENTATION_SUMMARY_TEMPLATE.mdを参考にして、docs/dev/にブランチ名を付けてドキュメントを作成してください。
ドキュメントのタイトルは、ブランチ名を使用してください。
その後、その要点をまとめて、CHANGELOG.mdを更新してください。
```
