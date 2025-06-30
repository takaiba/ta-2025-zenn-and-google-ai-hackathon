# ta-backend-ml

## 必要なもの
- Docker
- OpenAI API TOKEN
- AZURE_SUBSCRIPTION_KEY
- AZURE_CONNECTION_KEY

Azure関連のキーの取得方法については、[こちら](https://www.notion.so/and-dot/Azure-Key-0532cabe8d594b728560efd4c7b691e1)を参考にしてください。

## セットアップ

### .envの作成

`.env.example`から`.env`を作成し、以下の項目を埋める

```
OPENAI_API_KEY=
AZURE_SUBSCRIPTION_KEY=
AZURE_CONNECTION_KEY=
```

### イメージ作成

以下のコマンドで、デモアプリ用のイメージをビルドする

```
make build
```

### デモアプリの立ち上げ

以下のコマンドで、デモアプリ用のコンテナを立ち上げる。

```
make run
```

その後、[http://localhost:8501/](http://localhost:8501/)へアクセスする。


## デモアプリ概要

以下の画面が立ち上がる。音声ファイルをアップロードすると処理が開始する。

実験管理のため、prefixにバージョンを追記できるようにしている。

outputs/配下に新規ディレクトリと生成結果が作成される。空白でも問題なし。


![Alt text](assets/screenshot_1.png)

![Alt text](assets/screenshot_2.png)

![Alt text](assets/screenshot_3.png)


---

## 生成結果

### 歌舞伎町タワー商談（10分12秒）

[議事録結果](results/kabukicho-tower.txt)

※評価のため、話者ラベルを固有名詞に手作業で変換済み。またxは話者ラベルミス、wは誤字をマークしている

```
話者セグメント66件中
- 話者ラベルミス 8件（12%）
- 誤字 24件（36%）
誤字はあるものの可読性は結構高い。

かかった時間: 256 秒

APIコスト
合計：59.97円

Whisper
1min=$0.006 -> 1h=$0.36
10m12s -> 0.170h => 0.170 * 0.36 * 150 = 9.18円

Azure
1h=$1 -> 約150円
0.170h => 0.170 * 150円 = 25.5円

ChatGPT
gpt-3.5-turbo: $0.0015/1Ktokens
112,415 [tokens] -> 25.29円（$1=150円換算)
※9割以上はInput Tokenなので、簡略化のため全部Input料金で換算
```


### 対談動画（古坂、ひろゆき、茂木、佐藤ママ）動画（10分34秒）

[議事録結果](results/taidan.txt)

※評価のため、話者ラベルを固有名詞に手作業で変換済み。またxは話者ラベルミス、wは誤字をマークしている

```
97セグメント中
- 話者ラベルミス 9件（9%）
- 誤字 11件（11%）

かかった時間: 420 秒

APIコスト
合計：75.9円

Whisper
1min=$0.006 -> 1h=$0.36
10m34s -> 0.176h => 0.176 * 0.36 * 150 = 9.5円

Azure
1h=$1 -> 約150円
0.176h => 0.176 * 150円 = 26.4円

ChatGPT
gpt-3.5-turbo: $0.0015/1Ktokens
177,941 [tokens] -> 40円（$1=150円換算)
※9割以上はInput Tokenなので、簡略化のため全部Input料金で換算
```
# ta-backend-ml
