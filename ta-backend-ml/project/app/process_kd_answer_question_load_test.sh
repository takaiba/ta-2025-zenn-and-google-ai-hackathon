#!/bin/bash

# 色の定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Dify APIのエンドポイントとAPIキー
DIFY_ENDPOINT="https://dify.p0x0q.com/v1/workflows/run"
DIFY_API_KEY_HEARING="app-2Qv4TnQK6THHEwDY6TLNxnVT"
DIFY_API_KEY_TITLE="app-aW9UGdOLS3sJU5QKAWtkHCDw"
DIFY_API_KEY_FAQ="app-BsJVqAMrY1eDTj8ZPvMPxKsg"
DIFY_API_KEY_KEYWORD="app-iGYtjCEqoN3OHHpny2QJfF0J"

# テナントID（テスト用）
TENANT_ID="c492efa6-da9a-4aa0-a832-11b4d1dbbe48"
# ユーザーグループID（テスト用、必要に応じて変更）
USER_GROUP_ID=""

# 負荷テスト設定
NUM_REQUESTS=10  # リクエスト数
CONCURRENCY=2    # 同時実行数

# 一時ファイル
TMP_FILE="/tmp/dify_request.json"
CURL_RESP_FILE="/tmp/dify_curl_response.json"

# レポート関連の設定
REPORT_DIR="./reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${REPORT_DIR}/load_test_report_${TIMESTAMP}.md"
HEY_OUTPUT_FILE="/tmp/hey_output.txt"

# 使用方法を表示
function show_usage {
  echo -e "${BLUE}使用方法:${NC}"
  echo -e "  ./$(basename $0) [オプション]"
  echo -e "\n${BLUE}オプション:${NC}"
  echo -e "  -m, --mode MODE    テストモード (hearing, title, faq, keyword, all のいずれか)"
  echo -e "  -n, --number N     リクエスト数 (デフォルト: ${NUM_REQUESTS})"
  echo -e "  -c, --concurrency C  同時実行数 (デフォルト: ${CONCURRENCY})"
  echo -e "  -h, --help         このヘルプを表示"
  echo -e "\n${BLUE}例:${NC}"
  echo -e "  ./$(basename $0) -m faq -n 20 -c 5"
  echo -e "  ./$(basename $0) -m all -n 10 -c 2"
}

# コマンドライン引数の解析
MODE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -m|--mode)
      MODE="$2"
      shift 2
      ;;
    -n|--number)
      NUM_REQUESTS="$2"
      shift 2
      ;;
    -c|--concurrency)
      CONCURRENCY="$2"
      shift 2
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      echo -e "${RED}エラー: 不明なオプション $1${NC}"
      show_usage
      exit 1
      ;;
  esac
done

# モードが指定されていない場合はヘルプを表示
if [[ -z "$MODE" ]]; then
  echo -e "${RED}エラー: モードを指定してください (-m または --mode)${NC}"
  show_usage
  exit 1
fi

# Heyコマンドが存在するか確認
if ! command -v hey &> /dev/null; then
  echo -e "${RED}エラー: 'hey' コマンドが見つかりません。インストールしてください。${NC}"
  echo -e "インストール方法: go install github.com/rakyll/hey@latest"
  exit 1
fi

# curlが存在するか確認
if ! command -v curl &> /dev/null; then
  echo -e "${RED}エラー: 'curl' コマンドが見つかりません。インストールしてください。${NC}"
  exit 1
fi

# jqが存在するか確認
if ! command -v jq &> /dev/null; then
  echo -e "${RED}エラー: 'jq' コマンドが見つかりません。インストールしてください。${NC}"
  exit 1
fi

# レポートディレクトリの作成
mkdir -p $REPORT_DIR

# レポートの初期化
function init_report {
  cat > $REPORT_FILE << EOF
# ta API 負荷テストレポート

**実行日時:** $(date "+%Y年%m月%d日 %H:%M:%S")
**リクエスト数:** $NUM_REQUESTS
**同時実行数:** $CONCURRENCY
**エンドポイント:** $DIFY_ENDPOINT

## 目次

1. [テスト概要](#テスト概要)
2. [テスト環境](#テスト環境)
3. [テスト結果サマリー](#テスト結果サマリー)
EOF

  # モード別の目次項目を追加
  if [[ "$MODE" == "all" || "$MODE" == "hearing" ]]; then
    echo "4. [ヒアリング応答 API テスト結果](#ヒアリング応答-api-テスト結果)" >> $REPORT_FILE
  fi
  if [[ "$MODE" == "all" || "$MODE" == "title" ]]; then
    echo "5. [チケットタイトル生成 API テスト結果](#チケットタイトル生成-api-テスト結果)" >> $REPORT_FILE
  fi
  if [[ "$MODE" == "all" || "$MODE" == "faq" ]]; then
    echo "6. [FAQ応答 API テスト結果](#faq応答-api-テスト結果)" >> $REPORT_FILE
  fi
  if [[ "$MODE" == "all" || "$MODE" == "keyword" ]]; then
    echo "7. [検索キーワード生成 API テスト結果](#検索キーワード生成-api-テスト結果)" >> $REPORT_FILE
  fi

  # テスト概要セクション
  cat >> $REPORT_FILE << EOF

## テスト概要

このレポートはKD APIに対する負荷テストの結果をまとめたものです。テストは以下のモードで実行されました：

EOF

  if [[ "$MODE" == "all" ]]; then
    echo "- ヒアリング応答 API" >> $REPORT_FILE
    echo "- チケットタイトル生成 API" >> $REPORT_FILE
    echo "- FAQ応答 API" >> $REPORT_FILE
    echo "- 検索キーワード生成 API" >> $REPORT_FILE
  else
    case "$MODE" in
      hearing)
        echo "- ヒアリング応答 API" >> $REPORT_FILE
        ;;
      title)
        echo "- チケットタイトル生成 API" >> $REPORT_FILE
        ;;
      faq)
        echo "- FAQ応答 API" >> $REPORT_FILE
        ;;
      keyword)
        echo "- 検索キーワード生成 API" >> $REPORT_FILE
        ;;
    esac
  fi

  # テスト環境セクション
  cat >> $REPORT_FILE << EOF

## テスト環境

- **OS:** $(uname -a)
- **テストツール:** hey
- **リクエスト数:** $NUM_REQUESTS
- **同時実行数:** $CONCURRENCY
- **ベンチマーク実行日時:** $(date "+%Y年%m月%d日 %H:%M:%S")

## テスト結果サマリー

| API | 平均応答時間 | リクエスト/秒 | 最速応答 | 最遅応答 | 成功率 |
|-----|-------------|-------------|---------|---------|--------|
EOF

  echo -e "${GREEN}レポートファイルを初期化しました: $REPORT_FILE${NC}"
}

# heyの出力を解析してMarkdownレポートに追記する関数
function parse_hey_output {
  local mode=$1
  local mode_name=$2
  
  # heyの出力からパフォーマンス指標を抽出
  local total_requests=$(grep "Total:" $HEY_OUTPUT_FILE | awk '{print $2}')
  local success_rate=$(grep "Success" $HEY_OUTPUT_FILE | awk '{print $2}')
  local avg_time=$(grep "Average:" $HEY_OUTPUT_FILE | awk '{print $2" "$3}')
  local fastest=$(grep "Fastest:" $HEY_OUTPUT_FILE | awk '{print $2" "$3}')
  local slowest=$(grep "Slowest:" $HEY_OUTPUT_FILE | awk '{print $2" "$3}')
  local req_per_sec=$(grep "Requests/sec:" $HEY_OUTPUT_FILE | awk '{print $2}')
  
  # サマリーテーブルに行を追加
  echo "| $mode_name | $avg_time | $req_per_sec | $fastest | $slowest | $success_rate |" >> $REPORT_FILE
  
  # モード別の詳細セクションを追加
  cat >> $REPORT_FILE << EOF

## ${mode_name}テスト結果

### 概要

- **テスト実施日時:** $(date "+%Y年%m月%d日 %H:%M:%S")
- **総リクエスト数:** $total_requests
- **成功率:** $success_rate
- **リクエスト/秒:** $req_per_sec
- **平均応答時間:** $avg_time
- **最速応答時間:** $fastest
- **最遅応答時間:** $slowest

### 詳細指標

\`\`\`
$(cat $HEY_OUTPUT_FILE)
\`\`\`

### リクエストペイロード

\`\`\`json
$(cat $TMP_FILE | jq .)
\`\`\`

### APIレスポンスサンプル

\`\`\`json
$(cat $CURL_RESP_FILE | jq .)
\`\`\`

EOF
}

# cURLでAPIの正常性を確認する関数
function check_api_health {
  local api_key=$1
  local payload=$2
  local mode=$3
  
  echo -e "\n${BLUE}[事前確認] $mode モードのAPIが正常に応答するか確認しています...${NC}"
  
  # curlでAPIリクエストを送信（詳細な情報を取得）
  echo -e "${BLUE}[API呼び出し] リクエスト送信中...${NC}"
  
  local start_time=$(date +%s.%N)
  local http_code=$(curl -s -o $CURL_RESP_FILE -w "%{http_code}\n%{time_total}\n%{size_download}\n%{content_type}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $api_key" \
    -d "$payload" \
    $DIFY_ENDPOINT)
  local end_time=$(date +%s.%N)
  
  # curlの詳細情報を解析
  local status_code=$(echo "$http_code" | head -1)
  local curl_time=$(echo "$http_code" | head -2 | tail -1)
  local response_size=$(echo "$http_code" | head -3 | tail -1)
  local content_type=$(echo "$http_code" | head -4 | tail -1)
  
  # 実行時間を計算（バックアップとして）
  local exec_time=$(echo "$end_time - $start_time" | bc)
  
  echo -e "${YELLOW}[API応答情報]${NC}"
  echo -e "  ステータスコード: ${YELLOW}$status_code${NC}"
  echo -e "  応答時間: ${YELLOW}${curl_time}秒${NC}"
  echo -e "  応答サイズ: ${YELLOW}${response_size}バイト${NC}"
  echo -e "  コンテンツタイプ: ${YELLOW}${content_type}${NC}"
  
  # レスポンスコードを確認
  if [[ "$status_code" -eq 200 ]]; then
    echo -e "${GREEN}[成功] APIは正常に応答しました (HTTP $status_code)${NC}"
    
    # レスポンスの全文を表示
    echo -e "${BLUE}[レスポンス] 生レスポンス:${NC}"
    cat $CURL_RESP_FILE
    echo
    
    # JSONとして正しくパースできるか確認
    if jq empty $CURL_RESP_FILE 2>/dev/null; then
      echo -e "${GREEN}[チェック] JSONとして正しくパースできました${NC}"
      
      # 各フィールドの存在確認
      echo -e "${BLUE}[レスポンス構造チェック]${NC}"
      
      # answer フィールドの存在確認
      if jq -e '.answer' $CURL_RESP_FILE > /dev/null 2>&1; then
        echo -e "  - ${GREEN}answer フィールドが存在します${NC}"
        
        # answer.answer フィールドの存在確認（主要なテキスト応答）
        if jq -e '.answer.answer' $CURL_RESP_FILE > /dev/null 2>&1; then
          echo -e "  - ${GREEN}answer.answer フィールドが存在します${NC}"
          echo -e "${BLUE}[応答内容] 最初の5行:${NC}"
          jq -r '.answer.answer' $CURL_RESP_FILE | head -n 5
          echo "..."
        else
          echo -e "  - ${YELLOW}answer.answer フィールドが見つかりません${NC}"
        fi
        
        # モード別のフィールドチェック
        case "$mode" in
          hearing)
            # ヒアリング特有のフィールドチェック
            if jq -e '.answer.hearing' $CURL_RESP_FILE > /dev/null 2>&1; then
              echo -e "  - ${GREEN}answer.hearing フィールドが存在します${NC}"
            else
              echo -e "  - ${YELLOW}answer.hearing フィールドが見つかりません（warning）${NC}"
            fi
            ;;
          faq)
            # FAQ特有のフィールド確認
            if jq -e '.answer.references' $CURL_RESP_FILE > /dev/null 2>&1; then
              echo -e "  - ${GREEN}answer.references フィールドが存在します${NC}"
              echo -e "${BLUE}[参照情報]${NC}"
              jq -r '.answer.references | length' $CURL_RESP_FILE | xargs -I{} echo "  参照数: {}"
            else
              echo -e "  - ${YELLOW}answer.references フィールドが見つかりません（warning）${NC}"
            fi
            ;;
          title)
            # タイトル特有のフィールドチェック
            if jq -e '.answer.title' $CURL_RESP_FILE > /dev/null 2>&1; then
              echo -e "  - ${GREEN}answer.title フィールドが存在します${NC}"
              echo -e "${BLUE}[生成タイトル]${NC}"
              jq -r '.answer.title' $CURL_RESP_FILE
            else
              echo -e "  - ${YELLOW}answer.title フィールドが見つかりません${NC}"
            fi
            ;;
          keyword)
            # キーワード特有のフィールドチェック
            if jq -e '.answer.keywords' $CURL_RESP_FILE > /dev/null 2>&1; then
              echo -e "  - ${GREEN}answer.keywords フィールドが存在します${NC}"
              echo -e "${BLUE}[生成キーワード]${NC}"
              jq -r '.answer.keywords' $CURL_RESP_FILE
            else
              echo -e "  - ${YELLOW}answer.keywords フィールドが見つかりません${NC}"
            fi
            ;;
        esac
        
      fi
      
      # task_id フィールドの存在確認
      if jq -e '.task_id' $CURL_RESP_FILE > /dev/null 2>&1; then
        echo -e "  - ${GREEN}task_id フィールドが存在します: $(jq -r '.task_id' $CURL_RESP_FILE)${NC}"
      else
        echo -e "  - ${YELLOW}task_id フィールドが見つかりません（warning）${NC}"
      fi
      
      echo -e "${GREEN}[結論] APIは期待通りに動作しています${NC}"
      return 0
    else
      echo -e "${RED}[エラー] レスポンスが有効なJSONではありません${NC}"
      return 1
    fi
  else
    echo -e "${RED}[エラー] APIリクエストが失敗しました (HTTP $status_code)${NC}"
    echo -e "${BLUE}[エラーレスポンス]${NC}"
    cat $CURL_RESP_FILE
    echo
    
    # JSONとしてパースできるかチェック
    if jq empty $CURL_RESP_FILE 2>/dev/null; then
      echo -e "${YELLOW}[エラー詳細] JSONフォーマットのエラーメッセージ:${NC}"
      jq . $CURL_RESP_FILE
    else
      echo -e "${RED}[エラー詳細] レスポンスは有効なJSONではありません${NC}"
    fi
    
    return 1
  fi
}

# 単一モードのテスト実行関数
function run_test {
  local test_mode=$1
  local api_key=$2
  local description=$3
  local payload=$4
  
  echo -e "\n${GREEN}${description} をテストします...${NC}"
  echo "$payload" > $TMP_FILE
  
  echo -e "${YELLOW}テスト設定:${NC}"
  echo -e "  モード: ${YELLOW}$test_mode${NC}"
  echo -e "  リクエスト数: ${YELLOW}$NUM_REQUESTS${NC}"
  echo -e "  同時実行数: ${YELLOW}$CONCURRENCY${NC}"
  echo -e "  エンドポイント: ${YELLOW}$DIFY_ENDPOINT${NC}"
  echo
  
  # ペイロードの内容を確認
  echo -e "${BLUE}リクエストペイロード:${NC}"
  cat $TMP_FILE | jq .
  echo
  
  # cURLで事前確認
  if ! check_api_health "$api_key" "$payload" "$test_mode"; then
    echo -e "${RED}[中断] API事前確認に失敗したため、負荷テストを実行しません${NC}"
    return 1
  fi
  
  # 負荷テストの実行
  echo -e "${GREEN}負荷テストを開始します...${NC}"
  hey -n $NUM_REQUESTS -c $CONCURRENCY -m POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $api_key" \
    -d "$payload" \
    $DIFY_ENDPOINT > $HEY_OUTPUT_FILE
  
  # heyの出力を表示
  cat $HEY_OUTPUT_FILE
  
  # モード名の設定
  local mode_display_name=""
  case "$test_mode" in
    hearing)
      mode_display_name="ヒアリング応答 API "
      ;;
    title)
      mode_display_name="チケットタイトル生成 API "
      ;;
    faq)
      mode_display_name="FAQ応答 API "
      ;;
    keyword)
      mode_display_name="検索キーワード生成 API "
      ;;
  esac
  
  # レポートにテスト結果を追記
  parse_hey_output "$test_mode" "$mode_display_name"
  
  echo -e "\n${GREEN}${test_mode}モードのテストが完了しました！${NC}"
}

# レポートの初期化
init_report

# 小文字に変換
MODE=$(echo "$MODE" | tr '[:upper:]' '[:lower:]')

# ALL モードの場合はすべてのモードを順番に実行
if [[ "$MODE" == "all" ]]; then
  echo -e "${GREEN}すべてのテストモードを順番に実行します...${NC}"
  
  # ヒアリング応答テスト
  hearing_payload='{
    "inputs": {
      "text": "SmartGeasyとは何ですか？",
      "hearingReason": "テスト用のヒアリング依頼",
      "humanResources": "",
      "knowledgeData": "",
      "tenantId": "'"$TENANT_ID"'",
      "userGroupId": "'"$USER_GROUP_ID"'"
    },
    "response_mode": "blocking",
    "user": "load-test-user"
  }'
  run_test "hearing" "$DIFY_API_KEY_HEARING" "ヒアリング応答 API" "$hearing_payload"
  
  # チケットタイトル生成テスト
  title_payload='{
    "inputs": {
      "question": "AWSのEC2インスタンスについて教えてください",
      "tenantId": "'"$TENANT_ID"'",
      "userGroupId": "'"$USER_GROUP_ID"'"
    },
    "response_mode": "blocking",
    "user": "load-test-user"
  }'
  run_test "title" "$DIFY_API_KEY_TITLE" "チケットタイトル生成 API" "$title_payload"
  
  # FAQ応答テスト
  faq_payload='{
    "inputs": {
      "text": "<conversation>\\ntext: AWSのEC2インスタンスについて教えてください\\nquestionType: question\\ncreator: user\\n</conversation>",
      "humanResources": "",
      "knowledgeData": "",
      "defaultHearingEmail": "default@and-dot.co.jp",
      "hearingCount": 3,
      "tenantId": "'"$TENANT_ID"'",
      "userGroupId": "'"$USER_GROUP_ID"'"
    },
    "response_mode": "blocking",
    "user": "load-test-user"
  }'
  run_test "faq" "$DIFY_API_KEY_FAQ" "FAQ応答 API" "$faq_payload"
  
  # 検索キーワード生成テスト
  keyword_payload='{
    "inputs": {
      "q": "AWSのEC2インスタンスについて教えてください",
      "tenantId": "'"$TENANT_ID"'",
      "userGroupId": "'"$USER_GROUP_ID"'"
    },
    "response_mode": "blocking",
    "user": "load-test-user"
  }'
  run_test "keyword" "$DIFY_API_KEY_KEYWORD" "検索キーワード生成 API" "$keyword_payload"
  
  echo -e "\n${GREEN}すべてのテストモードの実行が完了しました！${NC}"
  
  # 一時ファイルの削除
  rm -f $TMP_FILE $CURL_RESP_FILE $HEY_OUTPUT_FILE
  
  echo -e "${GREEN}レポートが作成されました: $REPORT_FILE${NC}"
  exit 0
fi

# 個別モードのAPIキーとペイロードの設定
case "$MODE" in
  hearing)
    API_KEY="$DIFY_API_KEY_HEARING"
    PAYLOAD='{
      "inputs": {
        "text": "SmartGeasyとは何ですか？",
        "hearingReason": "テスト用のヒアリング依頼",
        "humanResources": "",
        "knowledgeData": "",
        "tenantId": "'"$TENANT_ID"'",
        "userGroupId": "'"$USER_GROUP_ID"'"
      },
      "response_mode": "blocking",
      "user": "load-test-user"
    }'
    DESCRIPTION="ヒアリング応答 API"
    ;;
  title)
    API_KEY="$DIFY_API_KEY_TITLE"
    PAYLOAD='{
      "inputs": {
        "question": "AWSのEC2インスタンスについて教えてください",
        "tenantId": "'"$TENANT_ID"'",
        "userGroupId": "'"$USER_GROUP_ID"'"
      },
      "response_mode": "blocking",
      "user": "load-test-user"
    }'
    DESCRIPTION="チケットタイトル生成 API"
    ;;
  faq)
    API_KEY="$DIFY_API_KEY_FAQ"
    PAYLOAD='{
      "inputs": {
        "text": "<conversation>\\ntext: AWSのEC2インスタンスについて教えてください\\nquestionType: question\\ncreator: user\\n</conversation>",
        "humanResources": "",
        "knowledgeData": "",
        "defaultHearingEmail": "default@and-dot.co.jp",
        "hearingCount": 3,
        "tenantId": "'"$TENANT_ID"'",
        "userGroupId": "'"$USER_GROUP_ID"'"
      },
      "response_mode": "blocking",
      "user": "load-test-user"
    }'
    DESCRIPTION="FAQ応答 API"
    ;;
  keyword)
    API_KEY="$DIFY_API_KEY_KEYWORD"
    PAYLOAD='{
      "inputs": {
        "q": "AWSのEC2インスタンスについて教えてください",
        "tenantId": "'"$TENANT_ID"'",
        "userGroupId": "'"$USER_GROUP_ID"'"
      },
      "response_mode": "blocking",
      "user": "load-test-user"
    }'
    DESCRIPTION="検索キーワード生成 API"
    ;;
  *)
    echo -e "${RED}エラー: 無効なモード '$MODE'${NC}"
    show_usage
    exit 1
    ;;
esac

echo -e "${GREEN}${DESCRIPTION} をテストします...${NC}"

# 一時ファイルに保存（ペイロード確認用）
echo "$PAYLOAD" > $TMP_FILE

echo -e "${YELLOW}テスト設定:${NC}"
echo -e "  モード: ${YELLOW}$MODE${NC}"
echo -e "  リクエスト数: ${YELLOW}$NUM_REQUESTS${NC}"
echo -e "  同時実行数: ${YELLOW}$CONCURRENCY${NC}"
echo -e "  エンドポイント: ${YELLOW}$DIFY_ENDPOINT${NC}"
echo

# ペイロードの内容を確認
echo -e "${BLUE}リクエストペイロード:${NC}"
cat $TMP_FILE | jq .
echo

# curl で事前確認
if ! check_api_health "$API_KEY" "$PAYLOAD" "$MODE"; then
  echo -e "${RED}[中断] API事前確認に失敗したため、負荷テストを実行しません${NC}"
  # 一時ファイルの削除
  rm -f $TMP_FILE $CURL_RESP_FILE $HEY_OUTPUT_FILE
  exit 1
fi

# 負荷テストの実行
echo -e "${GREEN}負荷テストを開始します...${NC}"
hey -n $NUM_REQUESTS -c $CONCURRENCY -m POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$PAYLOAD" \
  $DIFY_ENDPOINT > $HEY_OUTPUT_FILE

# heyの出力を表示
cat $HEY_OUTPUT_FILE

# レポートにテスト結果を追記
parse_hey_output "$MODE" "$DESCRIPTION"

# 一時ファイルの削除
rm -f $TMP_FILE $CURL_RESP_FILE $HEY_OUTPUT_FILE

echo -e "\n${GREEN}テストが完了しました！${NC}"
echo -e "${GREEN}レポートが作成されました: $REPORT_FILE${NC}" 
