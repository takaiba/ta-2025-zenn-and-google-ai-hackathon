# ta-frontend

## 環境構築手順

### 前提条件

- Node.js (v20 以上)
- pnpm v9.12.0

### インストール手順

1. 依存パッケージをインストールする

```bash
pnpm install
```

2. 環境変数を設定する

以下の URL から環境変数の内容をコピーして、プロジェクトルートに`.env`ファイルとして保存してください：

```
https://github.com/takaiba/all-repos-tasks
```

3. DB の起動

```bash
make serve-db
```

4. RLS 用ユーザー追加

```bash
make setup-db
```

5. DB マイグレーション

```bash
make migrate
```

6. 初期アカウント、初期テナントの追加

```bash
make cronjob
```

7. 開発サーバーの起動

```bash
make serve
```

https://localhost:3000 でアプリケーションにアクセスできます。

# ta-frontend
