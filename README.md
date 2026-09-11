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
npm run check-all  # lint・型チェック・回帰テスト・全 YAML の配置とスキーマ検証
npm run build     # 本番ビルドと静的ページ生成
npm start
```

CI は main への push と非Draft PRで、変更内容に応じて必要な検証だけを実行します。
実行条件・Dependabot・自動レビューの接続手順は [自動化とコスト](docs/automation.md) を参照してください。
lint は警告も失敗として扱います。集計や年の存在判定の変更は `tests/history-service.test.ts` で検証してください。
ビルド時は `next/font/google` のフォント取得のため外部ネットワークが必要です。

## アーキテクチャ

- `src/app` / `src/components`: ルーティング・画面表示。
- `src/server/history.ts`: サーバー専用の組み立て箇所。サービスとファイル実装を接続。
- `src/services`: ストレージを注入して利用するユースケースと統計計算。
  `getCatalog()` は年一覧と合計件数、`getYearOverview()` は年の概要と月別件数を返します。
  ページ側でデータ取得・件数集計・年の存在判定を再実装せず、これらを利用してください。
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

## データ品質と回帰テスト

- 日付表示は UTC に固定し、閲覧環境のタイムゾーンによる前日へのずれを防ぎます。
- テキストは前後の空白を除去してから検証します。タイトル・説明・カテゴリ・国名・出典、および指定した概要は空白だけでは登録できません。概要そのものの省略は可能です。
- `validate:data` はデータディレクトリを再帰走査します。表示対象にならない YAML も検査し、年の範囲・配置・拡張子・月のゼロ埋めの誤りをエラーにします。シンボリックリンクは許可しません。
- `tooling/eslint-architecture.mjs` は `@/` と相対パスを正規化して依存方向を検査します。静的な import、再 export、文字列の動的 import、require、型 import が対象です。実行時に組み立てるモジュールパスは検査対象外です。別のパスエイリアスを導入する場合はルールとテストも更新してください。
- 見出しの ID は [React useId](https://react.dev/reference/react/useId) を使い、同じイベントを複数表示しても重複を防ぎます。
- `test:unit` はサーバー条件でデータ／サービス／lint を検証し、`test:ui` は通常の React 環境でカードの生成 HTML を検証します。`npm test` で両方実行します。
