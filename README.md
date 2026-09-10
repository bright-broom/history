# 世界史年表

1800–2025 年の歴史を、年・月ごとに閲覧する Next.js App Router アプリです。
歴史データは `src/data/{year}/{year}.yaml` と `{year}-{month:02}.yaml` で管理します。

## 開発

Node.js 22 LTS と npm を使用します。依存関係の正本は `package-lock.json` です。

```sh
npm ci
npm run dev
```

## 検証

```sh
npm run check-all  # lint・型チェック・回帰テスト・全カタログのスキーマ検証
npm run build     # 本番ビルドと静的ページ生成
npm start
```

CI は push / pull request 時に同じ検証とビルドを実行します。
ビルド時は `next/font/google` のフォント取得のため外部ネットワークが必要です。

## アーキテクチャ

- `src/app` / `src/components`: ルーティング・画面表示。
- `src/server/history.ts`: サーバー専用の組み立て箇所。サービスとファイル実装を接続。
- `src/services`: ストレージを注入して利用するユースケースと統計計算。
- `src/domain`: 型・検証・エラー・ストレージのインターフェース。
- `src/infrastructure`: YAML ファイル実装と、インスタンスごとのメモリキャッシュ。

サービスは具体的なファイル実装を import しません。画面は `@/server/history` を通じてデータを取得します。
サーバー用モジュールのクライアントへの取り込みは `server-only`、ドメイン／サービスの逆向き依存は ESLint で検出します。
[設計判断とトレードオフ](docs/adr/0001-history-data-boundaries.md)を参照してください。

## データの更新

年ディレクトリは4桁、月ファイルは年と2桁の月を使用します。
YAML の `year` / `month` とイベント日付はファイルパスと一致させます。
`related_countries` は省略時に空配列、`sources` は任意の文字列配列です。

追加・編集後に `npm run validate:data` と `npm run build` を実行し、再デプロイしてください。
現在の検証は形式・日付・配置の整合性を対象とし、歴史的記述の正確性は別途レビューが必要です。
主要イベントは概要表示用で、件数には月別イベントだけを数えます。

存在しない年／月の文書は `null`（画面では404）ですが、不正な YAML・権限エラー・データルートの欠落は例外です。
キャッシュはプロセス内・リポジトリインスタンス単位、TTL 10分・最大512件です。
静的生成ページの更新はこの TTL では行われません。Git 管理データをビルド・デプロイする運用を前提にしています。
