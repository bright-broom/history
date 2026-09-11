# 自動化と実行コスト

確認日: 2026-09-11。追加契約・従量課金の有効化を行わない構成。

## 実行するもの

| 対象 | 実行条件 | 節約策 |
|---|---|---|
| CI / verify | mainへのpush、main向けの非Draft PR、手動実行 | 作業ブランチのpushでは動かさず、PRとの二重実行を防ぐ。古い実行をキャンセル。最大15分 |
| ドキュメントだけの変更 | 同じverifyチェックで差分判定のみ | npmのインストール・テスト・ビルドを省略。必須チェックをPendingにしない |
| テスト・開発ツールの変更 | lint・型・テスト・データ検証 | アプリビルドを省略。CI/デプロイ判定スクリプトの変更はビルドも実施 |
| アプリ・YAML・依存・未知のパス | 全チェック＋本番ビルド | 未知のファイルや履歴不足は省略せず検証する |
| Dependency Review | 依存ファイルを変更したPR | 新たなhigh/critical脆弱性を拒否。追加コメント・Scorecard取得を省略 |
| CodeQL | コード変更時、手動実行、毎月2日05:17 JST | 検証成功後に実行。JavaScript/TypeScriptのみ、アプリビルド不要。最大20分 |
| Dependabot | 通常更新は毎月、脆弱性修正は検知時 | npmのminor/patchとActions更新をまとめ、通常更新は7日待つ。セキュリティ修正は別グループ |
| Vercel | アプリに影響する変更 | 前回成功デプロイとの差分がドキュメント／テストだけならビルドを省略 |

PR後のmain検証は統合結果を確認するため維持します。PRの説明やベースの編集も検証対象です。
毎月のセキュリティ再検査は、アプリが変わらなくても新しい検査ルールを適用するため残します。
`verify` はPRで安定したチェック名です。月次の計画ジョブは `Security plan` として分離します。
成果物のアップロード・定期的なAI実行・大規模ランナーは使いません。npmダウンロードキャッシュのみ利用します。

Vercelは履歴が浅く前回のSHAが見つからない場合や初回デプロイでは必ずビルドします。
`ignoreCommand` はビルドの省略であり、デプロイ要求そのものをゼロにはしません。
既存のVercel Git連携を利用する設定で、新規のVercelプロジェクトや別のCDサービスは作成しません。

## AI レビューの接続状態

**AIサービスの接続・自動レビュー有効化は未確認です。設定ファイルだけでサービスがインストールされるわけではありません。**

1. Codex: この環境ではChatGPTでのCLIログインを確認済み。クラウド連携は別設定です。
   [CodexのGitHub設定手順](https://learn.chatgpt.com/docs/third-party/github)に従い、historyだけを接続してCode reviewとAutomatic reviewsを有効化します。
   `AGENTS.md`にレビュー基準を用意しました。新しいPRのレビューを基本にし、修正ごとの再レビューは必要なときだけ `@codex review` で依頼します。既存プランの利用枠・予算は設定画面で確認してください。
2. CodeRabbit: `.coderabbit.yaml`は手動用の準備です。自動レビュー、各pushの再レビュー、Draftレビュー、チャット自動応答は無効。
   [現行プラン](https://docs.coderabbit.ai/management/plans)では、公開リポジトリが10スター未満の場合は手動トリガーが必要です。
   historyは確認時0スター、ライセンス未設定のため、無料OSS枠への適格性を推測して契約しません。
3. Copilot: `.github/copilot-instructions.md`は将来連携時の指示のみです。
   [現行仕様](https://docs.github.com/en/copilot/concepts/agents/code-review)ではAIクレジットとActionsの利用が発生するため、有効化していません。

Codex / CodeRabbit / Copilotを同時に自動起動しません。AIによる自動修正の繰り返しや自動マージも設定しません。
RenovateはDependabotと重複するため追加しません。APIキーや別契約が必要なエージェントのために新しい課金枠を作成しません。
[GitHub Modelsは2026-07-30に終了](https://github.blog/changelog/2026-07-01-github-models-is-being-fully-retired-on-july-30-2026/)したため、旧来の無料Models APIによるレビュー構成は採用しません。

## 運用

- 作業中はDraft PR。レビュー準備ができてからReady for reviewにする。
- 不要な手動rerunは避ける。全確認が必要ならActionsのCI → Run workflowを使う。
- Dependabotのsecurity PRは通常の月次更新を待たずに確認する。major更新は別PRになるため個別に判断する。
- 自動生成PRもCIを通し、人がマージする。新たな有料予算や外部アプリの権限追加は個別に判断する。
- Actionsに追加される権限・トリガー・キャッシュはテスト対象。差分判定は `tests/automation.test.ts` で確認する。
- 脆弱性アラート／Dependabot自動修正のGitHub側スイッチは、設定ファイルとは別に有効化が必要。
- ブラウザ操作がこの環境では起動できず、外部AIアプリの認可は利用者の設定操作が必要。

## 根拠

- [GitHub Actions料金](https://docs.github.com/en/billing/concepts/product-billing/github-actions): 公開リポジトリの標準ランナーは無料。大規模ランナーや保存容量の追加利用は別条件。
- [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax): workflow自体をpathsで省略すると必須チェックがPendingになるため、CI内部で必要な処理を選択する。
- [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference): グループ・月次スケジュール・cooldownを使用。セキュリティ更新は通常更新のcooldownとは独立。
- [Vercel ignoreCommand](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand): exit 0で省略、exit 1でビルド。
