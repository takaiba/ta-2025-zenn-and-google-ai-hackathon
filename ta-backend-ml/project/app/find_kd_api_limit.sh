#!/bin/bash

# 色の定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Dify APIのエンドポイントとAPIキー
DIFY_ENDPOINT="https://dify.p0x0q.com/v1/workflows/run"

# https://dify.p0x0q.com/app/04056bdd-fba4-45fd-8088-0a4c8bd07f6c/overview
DIFY_API_KEY_HEARING="app-2Qv4TnQK6THHEwDY6TLNxnVT"
# https://dify.p0x0q.com/app/efce4670-f840-43e2-b62d-39782f13d7e1/overview
DIFY_API_KEY_TITLE="app-aW9UGdOLS3sJU5QKAWtkHCDw"
# https://dify.p0x0q.com/app/aa48027a-33bd-4653-8839-55f7c7176f05/overview
DIFY_API_KEY_FAQ="app-BsJVqAMrY1eDTj8ZPvMPxKsg"
# https://dify.p0x0q.com/app/a9145442-1f39-4448-b114-ab99bf4e45ca/workflow
DIFY_API_KEY_KEYWORD="app-iGYtjCEqoN3OHHpny2QJfF0J"

# テナントID（テスト用）
TENANT_ID="c492efa6-da9a-4aa0-a832-11b4d1dbbe48"
# ユーザーグループID（テスト用、必要に応じて変更）
USER_GROUP_ID=""

# 限界探索テスト設定のデフォルト値
START_CONCURRENCY=10        # 開始同時実行数
MAX_CONCURRENCY=30         # 最大同時実行数
CONCURRENCY_STEP=5         # 同時実行数の増加ステップ
NUM_REQUESTS=50            # 各段階でのリクエスト数
SUCCESS_THRESHOLD=80       # 成功率の閾値（%）- これを下回ると限界と判断
TIMEOUT_THRESHOLD=60000    # タイムアウト閾値（ミリ秒）- これを超えると限界と判断
COOLDOWN_TIME=120            # テスト間の休止時間（秒）

# 一時ファイル
TMP_FILE="/tmp/dify_request.json"
CURL_RESP_FILE="/tmp/dify_curl_response.json"

# レポート関連の設定
REPORT_DIR="./reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${REPORT_DIR}/limit_test_report_${TIMESTAMP}.md"
HEY_OUTPUT_FILE="/tmp/hey_output.txt"

# 使用方法を表示
function show_usage {
  echo -e "${BLUE}使用方法:${NC}"
  echo -e "  ./$(basename $0) [オプション]"
  echo -e "\n${BLUE}オプション:${NC}"
  echo -e "  -m, --mode MODE       テストモード (hearing, title, faq, keyword, all のいずれか)"
  echo -e "  -s, --start N         開始同時実行数 (デフォルト: ${START_CONCURRENCY})"
  echo -e "  -x, --max N           最大同時実行数 (デフォルト: ${MAX_CONCURRENCY})"
  echo -e "  -t, --step N          同時実行数の増加ステップ (デフォルト: ${CONCURRENCY_STEP})"
  echo -e "  -n, --number N        各段階でのリクエスト数 (デフォルト: ${NUM_REQUESTS})"
  echo -e "  -p, --success N       成功率の閾値 % (デフォルト: ${SUCCESS_THRESHOLD})"
  echo -e "  -o, --timeout N       タイムアウト閾値 ミリ秒 (デフォルト: ${TIMEOUT_THRESHOLD})"
  echo -e "  -d, --cooldown N      テスト間の休止時間 秒 (デフォルト: ${COOLDOWN_TIME})"
  echo -e "  -h, --help            このヘルプを表示"
  echo -e "\n${BLUE}例:${NC}"
  echo -e "  ./$(basename $0) -m all -s 5 -x 100 -t 10 -n 30"
  echo -e "  ./$(basename $0) -m faq -s 1 -x 20 -t 2 -p 90"
}

# コマンドライン引数の解析
MODE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -m|--mode)
      MODE="$2"
      shift 2
      ;;
    -s|--start)
      START_CONCURRENCY="$2"
      shift 2
      ;;
    -x|--max)
      MAX_CONCURRENCY="$2"
      shift 2
      ;;
    -t|--step)
      CONCURRENCY_STEP="$2"
      shift 2
      ;;
    -n|--number)
      NUM_REQUESTS="$2"
      shift 2
      ;;
    -p|--success)
      SUCCESS_THRESHOLD="$2"
      shift 2
      ;;
    -o|--timeout)
      TIMEOUT_THRESHOLD="$2"
      shift 2
      ;;
    -d|--cooldown)
      COOLDOWN_TIME="$2"
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

# 必要なコマンドの存在確認
for cmd in hey curl jq bc; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${RED}エラー: '$cmd' コマンドが見つかりません。インストールしてください。${NC}"
    exit 1
  fi
done

# レポートディレクトリの作成
mkdir -p $REPORT_DIR

# レポートの初期化
function init_report {
  cat > $REPORT_FILE << EOF
# ta API 限界探索テストレポート

**実行日時:** $(date "+%Y年%m月%d日 %H:%M:%S")
**開始同時実行数:** $START_CONCURRENCY
**最大同時実行数:** $MAX_CONCURRENCY
**同時実行数増加ステップ:** $CONCURRENCY_STEP
**各段階でのリクエスト数:** $NUM_REQUESTS
**成功率閾値:** ${SUCCESS_THRESHOLD}%
**タイムアウト閾値:** ${TIMEOUT_THRESHOLD}ms
**テスト間休止時間:** ${COOLDOWN_TIME}秒
**エンドポイント:** $DIFY_ENDPOINT

## 目次

1. [テスト概要](#テスト概要)
2. [テスト環境](#テスト環境)
3. [テスト結果サマリー](#テスト結果サマリー)
EOF

  # モード別の目次項目を追加
  if [[ "$MODE" == "all" || "$MODE" == "hearing" ]]; then
    echo "4. [ヒアリング応答 API 限界テスト結果](#ヒアリング応答-api-限界テスト結果)" >> $REPORT_FILE
  fi
  if [[ "$MODE" == "all" || "$MODE" == "title" ]]; then
    echo "5. [チケットタイトル生成 API 限界テスト結果](#チケットタイトル生成-api-限界テスト結果)" >> $REPORT_FILE
  fi
  if [[ "$MODE" == "all" || "$MODE" == "faq" ]]; then
    echo "6. [FAQ応答 API 限界テスト結果](#faq応答-api-限界テスト結果)" >> $REPORT_FILE
  fi
  if [[ "$MODE" == "all" || "$MODE" == "keyword" ]]; then
    echo "7. [検索キーワード生成 API 限界テスト結果](#検索キーワード生成-api-限界テスト結果)" >> $REPORT_FILE
  fi

  # テスト概要セクション
  cat >> $REPORT_FILE << EOF

## テスト概要

このレポートはKD APIの限界を探るテストの結果をまとめたものです。このテストでは同時実行数を徐々に増やしながら、APIの応答性能が閾値を下回るポイントを特定します。

テスト対象のモード：
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
- **開始同時実行数:** $START_CONCURRENCY
- **最大同時実行数:** $MAX_CONCURRENCY
- **増加ステップ:** $CONCURRENCY_STEP
- **各段階リクエスト数:** $NUM_REQUESTS
- **成功率閾値:** ${SUCCESS_THRESHOLD}%
- **タイムアウト閾値:** ${TIMEOUT_THRESHOLD}ms
- **実行日時:** $(date "+%Y年%m月%d日 %H:%M:%S")

## テスト結果サマリー

| API | 限界同時実行数 | 限界時の成功率 | 限界時の応答時間 | 限界の要因 |
|-----|--------------|--------------|---------------|---------|
EOF

  echo -e "${GREEN}レポートファイルを初期化しました: $REPORT_FILE${NC}"
}

# サマリーテーブルに結果を追加する関数
function add_summary_to_report {
  local mode=$1
  local mode_name=$2
  local limit=$3
  local success_rate=$4
  local response_time=$5
  local limit_factor=$6
  
  echo "| $mode_name | $limit | $success_rate% | $response_time | $limit_factor |" >> $REPORT_FILE
}

# cURLでAPIの正常性を確認する関数
function check_api_health {
  local api_key=$1
  local payload=$2
  local mode=$3
  
  echo -e "\n${BLUE}[事前確認] $mode モードのAPIが正常に応答するか確認しています...${NC}"
  
  # curlでAPIリクエストを送信
  local start_time=$(date +%s.%N)
  local http_code=$(curl -s -o $CURL_RESP_FILE -w "%{http_code}\n%{time_total}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $api_key" \
    -d "$payload" \
    $DIFY_ENDPOINT)
  local end_time=$(date +%s.%N)
  
  # curlの詳細情報を解析
  local status_code=$(echo "$http_code" | head -1)
  local curl_time=$(echo "$http_code" | head -2 | tail -1)
  
  # 実行時間を計算
  local exec_time=$(echo "$end_time - $start_time" | bc)
  
  echo -e "${YELLOW}[API応答情報]${NC}"
  echo -e "  ステータスコード: ${YELLOW}$status_code${NC}"
  echo -e "  応答時間: ${YELLOW}${curl_time}秒${NC}"
  
  # レスポンスコードを確認
  if [[ "$status_code" -eq 200 ]]; then
    echo -e "${GREEN}[成功] APIは正常に応答しました (HTTP $status_code)${NC}"
    return 0
  else
    echo -e "${RED}[エラー] APIリクエストが失敗しました (HTTP $status_code)${NC}"
    echo -e "${BLUE}[エラーレスポンス]${NC}"
    cat $CURL_RESP_FILE
    echo
    return 1
  fi
}

# ペイロードの生成関数
function generate_payload {
  local test_mode=$1
  
  case "$test_mode" in
    hearing)
      echo '{
        "inputs": {
          "text": "SmartGeasyとは何ですか？",
          "hearingReason": "テスト用のヒアリング依頼",
          "humanResources": "",
          "knowledgeData": "",
          "tenantId": "'"$TENANT_ID"'",
          "userGroupId": "'"$USER_GROUP_ID"'"
        },
        "response_mode": "blocking",
        "user": "limit-test-user"
      }'
      ;;
    title)
      echo '{
        "inputs": {
          "question": "AWSのEC2インスタンスについて教えてください",
          "tenantId": "'"$TENANT_ID"'",
          "userGroupId": "'"$USER_GROUP_ID"'"
        },
        "response_mode": "blocking",
        "user": "limit-test-user"
      }'
      ;;
    faq)
      echo '{
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
        "user": "limit-test-user"
      }'
      ;;
    keyword)
      echo '{
        "inputs": {
          "q": "AWSのEC2インスタンスについて教えてください",
          "tenantId": "'"$TENANT_ID"'",
          "userGroupId": "'"$USER_GROUP_ID"'"
        },
        "response_mode": "blocking",
        "user": "limit-test-user"
      }'
      ;;
  esac
}

# APIキーの取得関数
function get_api_key {
  local test_mode=$1
  
  case "$test_mode" in
    hearing)
      echo "$DIFY_API_KEY_HEARING"
      ;;
    title)
      echo "$DIFY_API_KEY_TITLE"
      ;;
    faq)
      echo "$DIFY_API_KEY_FAQ"
      ;;
    keyword)
      echo "$DIFY_API_KEY_KEYWORD"
      ;;
  esac
}

# モード名の取得関数
function get_mode_display_name {
  local test_mode=$1
  
  case "$test_mode" in
    hearing)
      echo "ヒアリング応答 API"
      ;;
    title)
      echo "チケットタイトル生成 API"
      ;;
    faq)
      echo "FAQ応答 API"
      ;;
    keyword)
      echo "検索キーワード生成 API"
      ;;
  esac
}

# Heyの出力から成功率を抽出する関数
function extract_success_rate {
  local output_file=$1
  
  # ステータスコード分布セクションを確認
  if grep -q "Status code distribution:" "$output_file"; then
    # 2xxのステータスコードを持つレスポンスを検索
    local success_responses=0
    if grep -q "\[2[0-9][0-9]\]" "$output_file"; then
      success_responses=$(grep "\[2[0-9][0-9]\]" "$output_file" | awk '{print $2}')
    fi
    
    # 総リクエスト数を計算
    local total_responses=0
    if grep -q "\[[0-9]" "$output_file"; then
      total_responses=$(grep "\[[0-9]" "$output_file" | awk '{sum += $2} END {print sum}')
    fi
    
    # 成功率を計算 (0除算を防止)
    if [ "$total_responses" -gt 0 ]; then
      echo $((success_responses * 100 / total_responses))
    else
      echo "0"
    fi
  else
    # 旧メソッドをフォールバックとして保持
    local success_rate=$(grep "Success" "$output_file" | awk '{gsub(/%/, ""); print $2}')
    if [[ -z "$success_rate" ]]; then
      echo "0"
    else
      echo "$success_rate"
    fi
  fi
}

# Heyの出力から平均応答時間を抽出する関数
function extract_avg_response_time {
  local output_file=$1
  local avg_time=$(grep "Average:" $output_file | awk '{print $2}')
  if [[ -z "$avg_time" ]]; then
    echo "0"
  else
    echo "$avg_time"
  fi
}

# 単一モードの限界テスト実行関数
function run_limit_test {
  local test_mode=$1
  local api_key=$(get_api_key "$test_mode")
  local mode_name=$(get_mode_display_name "$test_mode")
  local payload=$(generate_payload "$test_mode")
  
  echo -e "\n${GREEN}$mode_name の限界テストを開始します...${NC}"
  echo "$payload" > $TMP_FILE
  
  # 事前確認
  if ! check_api_health "$api_key" "$payload" "$test_mode"; then
    echo -e "${RED}[中断] API事前確認に失敗したため、限界テストを実行しません${NC}"
    return 1
  fi
  
  echo -e "\n${BLUE}同時実行数を徐々に増やしながらテストしています...${NC}"
  
  local limit_found=false
  local max_successful_concurrency=0
  local limit_success_rate=0
  local limit_response_time=0
  local limit_factor=""
  
  # 詳細結果を格納する配列
  declare -a test_results
  
  # 同時実行数を徐々に増やしてテスト
  for ((concurrency = START_CONCURRENCY; concurrency <= MAX_CONCURRENCY; concurrency += CONCURRENCY_STEP)); do
    echo -e "\n${YELLOW}同時実行数 $concurrency でテスト中...${NC}"
    
    # hey コマンドで負荷テスト実行
    hey -n $NUM_REQUESTS -c $concurrency -m POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $api_key" \
      -d "$payload" \
      $DIFY_ENDPOINT > $HEY_OUTPUT_FILE
    
    # 結果の抽出
    local success_rate=$(extract_success_rate $HEY_OUTPUT_FILE)
    local avg_time=$(extract_avg_response_time $HEY_OUTPUT_FILE)
    local avg_time_ms=$(echo "$avg_time * 1000" | bc | sed 's/\..*$//')
    
    # デバッグ用に結果を一時的に表示
    echo -e "${GREEN}[デバッグ] HEY出力:${NC}"
    cat $HEY_OUTPUT_FILE | grep -A 10 "Status code distribution" || echo "ステータスコード分布なし"
    
    echo -e "${BLUE}結果: 成功率 ${success_rate}%, 平均応答時間 ${avg_time_ms}ms${NC}"
    
    # テスト結果を配列に追加
    test_results+=("$concurrency,$success_rate,$avg_time_ms")
    
    # 成功率またはタイムアウトを基準に限界を判断
    if (( $(echo "$success_rate < $SUCCESS_THRESHOLD" | bc -l) )); then
      echo -e "${RED}成功率が閾値 ${SUCCESS_THRESHOLD}% を下回りました。限界を検出しました。${NC}"
      limit_found=true
      limit_factor="成功率低下"
      limit_success_rate=$success_rate
      limit_response_time="${avg_time_ms}ms"
      break
    elif (( avg_time_ms > TIMEOUT_THRESHOLD )); then
      echo -e "${RED}応答時間が閾値 ${TIMEOUT_THRESHOLD}ms を超えました。限界を検出しました。${NC}"
      limit_found=true
      limit_factor="応答時間超過"
      limit_success_rate=$success_rate
      limit_response_time="${avg_time_ms}ms"
      break
    else
      # 成功したテストの同時実行数を記録
      max_successful_concurrency=$concurrency
    fi
    
    # テスト間に休止を入れる
    if (( concurrency + CONCURRENCY_STEP <= MAX_CONCURRENCY )); then
      echo -e "${BLUE}次のテスト前に${COOLDOWN_TIME}秒休止します...${NC}"
      sleep $COOLDOWN_TIME
    fi
  done
  
  # 限界を検出できなかった場合
  if ! $limit_found; then
    echo -e "${GREEN}最大同時実行数 $MAX_CONCURRENCY まで限界を検出できませんでした。${NC}"
    max_successful_concurrency=$MAX_CONCURRENCY
    
    # 最後のテスト結果を取得（配列が空でないことを確認）
    if [ ${#test_results[@]} -gt 0 ]; then
      # 配列の最後の要素を取得
      local last_result="${test_results[0]}"
      IFS=',' read -r _ last_success_rate last_avg_time <<< "$last_result"
      # 値が空の場合はデフォルト値を設定
      if [ -z "$last_success_rate" ]; then last_success_rate="100"; fi
      if [ -z "$last_avg_time" ]; then last_avg_time="0"; fi
    else
      last_success_rate="100"
      last_avg_time="0"
    fi
    
    limit_success_rate=$last_success_rate
    limit_response_time="${last_avg_time}ms"
    limit_factor="限界未検出"
  fi
  
  # レポートに結果を追加
  echo -e "${GREEN}$mode_name のレポートを生成しています...${NC}"
  
  # サマリーテーブルに追加
  add_summary_to_report "$test_mode" "$mode_name" "$max_successful_concurrency" "$limit_success_rate" "$limit_response_time" "$limit_factor"
  
  # モード詳細セクションをレポートに追加
  cat >> $REPORT_FILE << EOF

## ${mode_name}限界テスト結果

### 概要

- **限界同時実行数:** $max_successful_concurrency
- **限界時の成功率:** ${limit_success_rate}%
- **限界時の応答時間:** $limit_response_time
- **限界の要因:** $limit_factor

### 詳細結果

| 同時実行数 | 成功率 (%) | 平均応答時間 (ms) |
|-----------|-----------|-----------------|
EOF

  # 詳細結果をテーブルに追加
  for result in "${test_results[@]}"; do
    IFS=',' read -r c_val s_val t_val <<< "$result"
    echo "| $c_val | $s_val | $t_val |" >> $REPORT_FILE
  done
  
  # グラフ用のデータポイントを追加
  cat >> $REPORT_FILE << EOF

### 性能グラフデータ

\`\`\`
# 同時実行数,成功率(%),応答時間(ms)
EOF

  for result in "${test_results[@]}"; do
    echo "$result" >> $REPORT_FILE
  done
  
  echo -e "\`\`\`\n" >> $REPORT_FILE
  
  echo -e "${GREEN}$mode_name の限界テストが完了しました！${NC}"
}

# レポートの初期化
init_report

# 小文字に変換
MODE=$(echo "$MODE" | tr '[:upper:]' '[:lower:]')

# ALL モードの場合はすべてのモードを順番に実行
if [[ "$MODE" == "all" ]]; then
  echo -e "${GREEN}すべてのモードの限界テストを順番に実行します...${NC}"
  
  run_limit_test "hearing"
  run_limit_test "title"
  run_limit_test "faq"
  run_limit_test "keyword"
  
  echo -e "\n${GREEN}すべてのモードの限界テストが完了しました！${NC}"
else
  # 個別モードの限界テスト
  case "$MODE" in
    hearing|title|faq|keyword)
      run_limit_test "$MODE"
      ;;
    *)
      echo -e "${RED}エラー: 無効なモード '$MODE'${NC}"
      show_usage
      exit 1
      ;;
  esac
fi

# レポートの最終セクション
cat >> $REPORT_FILE << EOF

## 結論と推奨事項

このテストの結果から、以下の推奨事項が導き出されます：

1. **推奨同時実行数**: 各APIの限界同時実行数の80%程度を目安とすることで、安定した運用が期待できます。
2. **スケーリング検討**: 特に高い同時実行数が期待されるAPIについては、インフラのスケーリングを検討してください。
3. **モニタリング強化**: 実運用時には、応答時間と成功率を継続的にモニタリングし、限界に近づいた際に対応できるようにしてください。

このテストは実際の本番環境の負荷とは異なる可能性があります。実際のトラフィックパターンを考慮した運用計画を立てることをお勧めします。
EOF

# 一時ファイルの削除
rm -f $TMP_FILE $CURL_RESP_FILE $HEY_OUTPUT_FILE

echo -e "\n${GREEN}限界テストが完了しました！${NC}"
echo -e "${GREEN}レポートが作成されました: $REPORT_FILE${NC}" 
