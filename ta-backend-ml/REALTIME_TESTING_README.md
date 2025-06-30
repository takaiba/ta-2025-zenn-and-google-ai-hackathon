# 🤖 リアルタイム10回ループテスト機能

## 概要

ウェブサイトに対して10回のループを実行し、異なるパターンでテストを行い、問題を検知してリアルタイムで結果を監視できる機能を実装しました。

## 実装された機能

### ✅ 1. ページ開く＆スクリーンショット機能
- Playwrightを使用したページアクセス
- フルページスクリーンショットの自動取得
- 複数のブラウザエンジン対応（Chrome, Firefox, Safari）
- モバイル・タブレット・デスクトップビューポート対応

### ✅ 2. テストケース作成機能
- Gemini AIを使用した動的テストケース生成
- インタラクティブ要素の自動検出
- フォームバリデーションテスト
- アクセシビリティチェック
- パフォーマンス分析

### ✅ 3. 10回ループテスト実行機能
- **デスクトップChrome**: 標準的なデスクトップ環境
- **モバイルChrome**: モバイル環境でのレスポンシブテスト
- **デスクトップFirefox**: ブラウザ互換性テスト
- **タブレット(iPad)**: タブレット環境でのタッチ操作テスト
- **高負荷テスト**: サーバー負荷下でのパフォーマンステスト
- **アクセシビリティ重点**: キーボードナビゲーション、コントラスト等
- **パフォーマンス重点**: ロード時間、リソース使用量の詳細分析
- **インタラクション重点**: 全てのクリック可能要素のテスト
- **フォームバリデーション**: 入力フィールドの詳細検証
- **ナビゲーション深度**: サイト内リンクの網羅的テスト

### ✅ 4. 問題検知＆ログ機能
- Gemini AIによる視覚的バグ検知
- JavaScriptエラーの検出
- HTTP ステータスエラーの監視
- レイアウト崩れの検出
- ブロークンリンクの発見
- アクセシビリティ問題の特定
- パフォーマンス問題の分析

### ✅ 5. データベース格納機能
- `TestSession`: テストセッション管理
- `TestResult`: 各テストの実行結果
- `BugTicket`: 発見されたバグの詳細情報
- `TestSessionLog`: リアルタイムログとスクリーンショット
- `ActivityLog`: システム全体のアクティビティ追跡

### ✅ 6. リアルタイム監視機能
- WebSocketによるリアルタイム通信
- 進捗状況のライブ更新
- バグ発見のリアルタイム通知
- スクリーンショット付きログ
- テスト停止機能

### ✅ 7. フロントエンド表示機能
- リアルタイム監視ダッシュボード
- プログレスバーと統計表示
- バグレポートの可視化
- ログストリーミング表示
- レスポンシブWebデザイン

## アーキテクチャ

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend UI       │    │   Django Backend    │    │   WebSocket Server  │
│   (HTML/JS)         │◄──►│   (REST API)        │◄──►│   (Real-time)       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                       │
                           ┌─────────────────────┐
                           │   Test Executors    │
                           │                     │
                           │ ┌─────────────────┐ │
                           │ │ Continuous      │ │
                           │ │ Test Executor   │ │
                           │ └─────────────────┘ │
                           │ ┌─────────────────┐ │
                           │ │ Enhanced        │ │
                           │ │ Test Executor   │ │
                           │ └─────────────────┘ │
                           │ ┌─────────────────┐ │
                           │ │ Gemini Page     │ │
                           │ │ Analyzer        │ │
                           │ └─────────────────┘ │
                           └─────────────────────┘
                                       │
                           ┌─────────────────────┐
                           │   Playwright        │
                           │   Browser Engines   │
                           │   (Chrome/Firefox/  │
                           │    Safari)          │
                           └─────────────────────┘
```

## 主要ファイル

### 新規作成されたファイル

1. **`continuous_test_executor.py`** - 10回ループテスト実行エンジン
2. **`test_runner.py`** - リアルタイムテスト管理
3. **`websocket_server.py`** - WebSocketサーバー
4. **`realtime_test_monitor.html`** - 監視ダッシュボード
5. **`start_websocket_server.py`** - Django管理コマンド

### 拡張されたファイル

1. **`views.py`** - リアルタイムAPI エンドポイント追加
2. **`urls.py`** - 新しいルーティング追加

## 使用方法

### 1. システム起動

```bash
# Django サーバー起動
cd project
python manage.py runserver

# WebSocketサーバー起動（別ターミナル）
python manage.py start_websocket_server
```

### 2. リアルタイム監視ページへアクセス

```
http://localhost:8000/realtime/monitor
```

### 3. テスト実行

1. セッションID を入力 (例: `test-session-001`)
2. テスト対象URL を入力 (例: `https://example.com`)
3. ループ回数を指定 (デフォルト: 10回)
4. 「テスト開始」ボタンをクリック

### 4. リアルタイム監視

- 🔄 **進捗状況**: 現在のループ回数とプログレスバー
- 🐛 **バグ発見**: リアルタイムでのバグ検知と表示
- 📊 **統計情報**: スキャンしたページ数、実行時間
- 📝 **ログ**: 詳細な実行ログとスクリーンショット
- ⏹️ **停止機能**: 必要に応じてテストを途中停止

## API エンドポイント

### リアルタイムテスト API

- `POST /api/v1/realtime/test/start` - テスト開始
- `GET /api/v1/realtime/test/status/{session_id}` - ステータス取得
- `POST /api/v1/realtime/test/stop` - テスト停止
- `GET /api/v1/realtime/session/{session_id}/logs` - ログ取得
- `GET /api/v1/realtime/session/{session_id}/bugs` - バグ一覧取得

### WebSocket エンドポイント

- `ws://localhost:8765` - リアルタイム通信

## テストパターン詳細

| ループ | パターン | 説明 |
|--------|----------|------|
| 1 | Desktop Chrome | 標準デスクトップ環境での基本テスト |
| 2 | Mobile Chrome | モバイル環境、タッチ操作、レスポンシブデザイン |
| 3 | Desktop Firefox | ブラウザ互換性、異なるレンダリングエンジン |
| 4 | Tablet iPad | タブレット環境、中間サイズでの表示確認 |
| 5 | High Load | 低速実行でサーバー負荷テスト |
| 6 | Accessibility Focus | キーボードナビゲーション、セマンティックHTML |
| 7 | Performance Focus | ロード時間、リソース使用量の詳細分析 |
| 8 | Interaction Heavy | 全インタラクティブ要素の網羅テスト |
| 9 | Form Validation | フォーム入力、バリデーション機能 |
| 10 | Navigation Deep | サイト内リンクの深い探索 |

## データベーススキーマ

### TestSessionLog
```sql
- id: UUID
- test_session_id: String
- log_level: String (info/warning/error)
- message: Text
- metadata: JSON
- screenshot: Base64 String
- created_at: DateTime
```

### BugTicket  
```sql
- id: UUID
- project_id: String
- test_session_id: String
- title: String
- description: Text
- severity: String (high/medium/low)
- bug_type: String
- affected_url: String
- screenshot: Base64 String
- ai_confidence_score: Float
- created_at: DateTime
```

## 検出可能な問題

### 視覚的問題
- レイアウト崩れ
- テキストの読みにくさ
- ボタンサイズの問題
- 色のコントラスト不足

### 機能的問題  
- ブロークンリンク
- JavaScript エラー
- フォームバリデーション不備
- ナビゲーション問題

### アクセシビリティ問題
- alt属性の欠如
- キーボードナビゲーション不能
- 見出し階層の問題
- ランドマーク要素の不足

### パフォーマンス問題
- ページロード時間超過
- 大量リソース読み込み
- First Contentful Paint 遅延

## 今後の拡張可能性

1. **AI分析の高度化**: より詳細なバグ分析
2. **自動修復提案**: 発見されたバグの修正案提示  
3. **CI/CD統合**: 自動テスト実行パイプライン
4. **レポート生成**: PDF/HTML形式の詳細レポート
5. **テストシナリオ学習**: 過去のテスト結果からの学習

## 技術スタック

- **Backend**: Django, Python, AsyncIO
- **Browser Automation**: Playwright
- **AI Analysis**: Google Gemini API
- **Real-time Communication**: WebSocket
- **Database**: PostgreSQL (Prisma ORM)
- **Frontend**: HTML5, JavaScript, CSS3
- **Concurrent Processing**: ThreadPoolExecutor, AsyncIO

---

この実装により、ウェブサイトの品質を多角的に検証し、問題を早期発見できる包括的なテストシステムが完成しました。🚀