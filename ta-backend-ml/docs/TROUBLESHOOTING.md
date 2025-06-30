# トラブルシューティングガイド

このドキュメントでは、ta-backend-mlプロジェクトで発生する可能性のある一般的な問題と、その解決方法について説明します。

## 目次

- [トラブルシューティングガイド](#トラブルシューティングガイド)
  - [目次](#目次)
  - [1. 環境構築の問題](#1-環境構築の問題)
  - [2. Dockerの問題](#2-dockerの問題)
  - [3. データベース接続の問題](#3-データベース接続の問題)
  - [4. API関連の問題](#4-api関連の問題)
  - [5. LLM（質問応答）の問題](#5-llm質問応答の問題)
  - [6. GitHub API関連の問題](#6-github-api関連の問題)
  - [7. PDF処理の問題](#7-pdf処理の問題)
  - [8. Webクローリングの問題](#8-webクローリングの問題)
  - [9. Prisma ORM関連の問題](#9-prisma-orm関連の問題)
  - [10. その他の問題](#10-その他の問題)
  - [その他の参考情報](#その他の参考情報)

## 1. 環境構築の問題

**症状**: 環境構築時にエラーが発生する

**解決策**:
1. Pythonのバージョンが3.9以上であることを確認
   ```bash
   python --version
   ```
2. 必要なパッケージが正しくインストールされているか確認
   ```bash
   pip list
   ```
3. 依存関係を再インストール
   ```bash
   pip install -r requirements.txt
   ```
4. 環境変数が正しく設定されているか確認
   ```bash
   cat .env
   ```

## 2. Dockerの問題

**症状**: Dockerコンテナの起動に失敗する、コンテナが正常に動作しない

**解決策**:
1. Dockerデーモンが動作していることを確認
   ```bash
   docker info
   ```
2. イメージを再ビルド
   ```bash
   docker compose build --no-cache
   ```
3. コンテナのログを確認
   ```bash
   docker logs ta-backend-ml
   ```
4. Dockerのリソース設定を確認・調整
   ```bash
   docker stats
   ```

## 3. データベース接続の問題

**症状**: データベースに接続できない、クエリがタイムアウトする

**解決策**:
1. 環境変数の設定を確認
   ```bash
   cat .env | grep MYSQL
   ```
2. ta-frontendのデータベースコンテナが起動しているか確認
   ```bash
   docker ps | grep mysql_db
   ```
3. ネットワーク接続を確認
   ```bash
   docker exec -it ta-backend-ml ping mysql_db
   ```
4. MySQLサーバーの状態を確認
   ```bash
   docker exec -it mysql_db mysqladmin status
   ```
5. Prismaスキーマを最新バージョンで生成し直す
   ```bash
   make generate
   ```

## 4. API関連の問題

**症状**: API呼び出しが失敗する、タイムアウトする

**解決策**:
1. 各サービスのAPIキーが有効であることを確認
2. APIの使用制限を確認（レート制限、課金状況など）
3. リクエストの形式とパラメータを確認
4. ネットワーク接続を確認
   ```bash
   curl -I https://api.openai.com
   ```
5. ログでエラーメッセージを確認
   ```bash
   tail -f output.log
   ```

## 5. LLM（質問応答）の問題

**症状**: 質問応答機能が動作しない、遅い、不正確

**解決策**:
1. OpenAI APIキーが有効であることを確認
2. APIの使用制限やクォータを確認
3. プロンプトの形式とパラメータを確認
4. レスポンスのタイムアウト設定を調整
5. 大きなコンテキストの場合はチャンクに分割して処理

## 6. GitHub API関連の問題

**症状**: GitHub活動分析が失敗する、データが不完全

**解決策**:
1. GitHub APIトークンが有効であることを確認
2. APIの使用制限を確認（GitHub APIは時間あたりのリクエスト数に制限があります）
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit
   ```
3. リポジトリへのアクセス権限を確認
4. 解析対象の期間やパラメータを調整
5. ネットワーク接続を確認

## 7. PDF処理の問題

**症状**: PDFの処理が失敗する、テキスト抽出が不正確

**解決策**:
1. PDFライブラリが正しくインストールされているか確認
2. PDFファイルが破損していないか確認
3. PDF形式が標準に準拠しているか確認
4. メモリ使用量を監視し、大きなPDFの場合はリソースを増やす
5. Google Vertex AI APIの設定と権限を確認

## 8. Webクローリングの問題

**症状**: クローリングが失敗する、コンテンツが正しく抽出されない

**解決策**:
1. URLが有効であるか確認
2. ウェブサイトがロボット制限を設けていないか確認
   ```bash
   curl -A "Mozilla/5.0" https://example.com/robots.txt
   ```
3. 必要なヘッダー（User-Agentなど）を設定
4. リクエスト間の遅延を増やしてレート制限を回避
5. JavaScript重視のサイトの場合、ヘッドレスブラウザを検討

## 9. Prisma ORM関連の問題

**症状**: Prismaクライアント生成エラー、データベースクエリエラー

**解決策**:
1. スキーマ定義を確認
   ```bash
   cat schema.prisma
   ```
2. Prismaクライアントを再生成
   ```bash
   python -m prisma generate
   ```
3. データベースマイグレーション状態を確認
4. トランザクション内のクエリ数を減らす
5. 大きなデータセットの場合はページネーションを使用

## 10. その他の問題

**症状**: メモリ不足、CPU使用率が高い、システムが遅い

**解決策**:
1. システムリソースをモニタリング
   ```bash
   htop
   ```
2. 不要なプロセスを終了
3. ログレベルを調整してディスク使用量を削減
4. 一時ファイルを定期的にクリーンアップ
5. 並列処理の設定を調整

## その他の参考情報

問題が解決しない場合は、以下のリソースを参照してください：

- プロジェクトのIssueトラッカー
- 関連するライブラリのドキュメント:
  - [Django](https://docs.djangoproject.com/)
  - [OpenAI API](https://platform.openai.com/docs/introduction)
  - [Prisma Client Python](https://prisma-client-py.readthedocs.io/) 
  - [Google Vertex AI](https://cloud.google.com/vertex-ai/docs) 
