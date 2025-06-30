**目的**: プルリクエストの作成

---

## プルリクエスト作成のルール
- featureブランチにチェックアウトしているか確認すること。featureブランチが作成されていなければ{featureブランチ作成コマンド}で作成する
- コミットメッセージは日本語で簡潔に作成すること
- プルリクエスト本文はフォーマットに従うこと
- プルリクエストを作成したら、`gh pr view --web`でブラウザで開くこと
- `origin/release`, `origin/main`, `origin/deploy/prd`へ直接pushすることは**いかなる状況でも厳禁**

## プルリクエスト本文のフォーマット
```markdown
## 概要

## 変更内容

## 考えられるリスク

## 動作確認事項
```

## featureブランチ作成コマンド
```bash
git checkout -b feature/$(date '+%Y%m%d%H%M%S') origin/release
```
