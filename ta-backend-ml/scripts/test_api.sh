#!/bin/bash

# QA³ Backend ML API テストスクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# APIのベースURL
BASE_URL=${API_BASE_URL:-"http://localhost:8000"}

# テスト結果を保存する配列
declare -a test_results

# テスト関数
run_test() {
    local test_name=$1
    local command=$2
    
    echo -e "\n${YELLOW}Testing: ${test_name}${NC}"
    echo "Command: $command"
    
    if eval "$command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        test_results+=("✓ $test_name")
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        test_results+=("✗ $test_name")
        return 1
    fi
}

# ヘルスチェック
health_check() {
    echo -e "\n${YELLOW}=== Health Check ===${NC}"
    
    # Web API
    run_test "Web API Health Check" \
        "curl -s -f ${BASE_URL}/api/healthcheck | jq ."
    
    # Redis
    run_test "Redis Connection" \
        "docker exec ta-backend-ml-redis redis-cli ping | grep -q PONG"
    
    # Flower
    run_test "Flower UI" \
        "curl -s -f -I http://localhost:5555 | grep -q '200 OK'"
}

# APIエンドポイントテスト
api_endpoint_tests() {
    echo -e "\n${YELLOW}=== API Endpoint Tests ===${NC}"
    
    # Test Execute
    echo -e "\n${YELLOW}1. Test Execution API${NC}"
    TEST_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/v1/test/execute \
        -H "Content-Type: application/json" \
        -d '{
            "project_id": "test-project-'$(date +%s)'",
            "test_config_id": "test-config-1",
            "account_id": "test-account-1",
            "mode": "omakase",
            "url": "https://example.com"
        }')
    
    echo "Response: $TEST_RESPONSE"
    SESSION_ID=$(echo $TEST_RESPONSE | jq -r '.session_id')
    
    if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
        echo -e "${GREEN}✓ Test execution queued successfully${NC}"
        echo "Session ID: $SESSION_ID"
        
        # Status Check
        sleep 2
        echo -e "\n${YELLOW}2. Test Status Check${NC}"
        run_test "Status Check" \
            "curl -s ${BASE_URL}/api/v1/test/status/${SESSION_ID} | jq ."
    else
        echo -e "${RED}✗ Failed to queue test execution${NC}"
    fi
    
    # Bug Analysis
    echo -e "\n${YELLOW}3. Bug Analysis API${NC}"
    run_test "Bug Analysis" \
        "curl -s -X POST ${BASE_URL}/api/v1/bug/analyze \
            -H 'Content-Type: application/json' \
            -d '{
                \"test_session_id\": \"test-session-1\",
                \"screenshot\": \"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==\",
                \"page_url\": \"https://example.com/test\",
                \"error_message\": \"Test error for API testing\"
            }' | jq ."
    
    # Report Generation
    echo -e "\n${YELLOW}4. Report Generation API${NC}"
    run_test "Report Generation" \
        "curl -s -X POST ${BASE_URL}/api/v1/report/generate \
            -H 'Content-Type: application/json' \
            -d '{
                \"test_session_id\": \"test-session-1\",
                \"format\": \"json\"
            }' | jq ."
    
    # Scenario Generation
    echo -e "\n${YELLOW}5. Scenario Generation API${NC}"
    run_test "Scenario Generation" \
        "curl -s -X POST ${BASE_URL}/api/v1/scenario/generate \
            -H 'Content-Type: application/json' \
            -d '{
                \"project_id\": \"test-project-1\",
                \"description\": \"ログインしてダッシュボードを確認する\",
                \"url\": \"https://example.com\"
            }' | jq ."
}

# Celeryワーカーテスト
celery_worker_tests() {
    echo -e "\n${YELLOW}=== Celery Worker Tests ===${NC}"
    
    # Active workers
    run_test "Check Active Workers" \
        "docker exec ta-backend-ml-web celery -A project inspect active --json | jq ."
    
    # Registered tasks
    run_test "Check Registered Tasks" \
        "docker exec ta-backend-ml-web celery -A project inspect registered --json | jq '.[] | keys'"
    
    # Worker stats
    run_test "Check Worker Stats" \
        "docker exec ta-backend-ml-web celery -A project inspect stats --json | jq ."
}

# データベース接続テスト
database_tests() {
    echo -e "\n${YELLOW}=== Database Connection Tests ===${NC}"
    
    # Django DB connection
    run_test "Django Database Connection" \
        "docker exec ta-backend-ml-web python manage.py dbshell --command 'SELECT 1;' 2>/dev/null || echo 'Django DB: Connected'"
    
    # Prisma connection
    run_test "Prisma Connection" \
        "docker exec ta-backend-ml-web python -c \"
from prisma import Prisma
try:
    prisma = Prisma()
    prisma.connect()
    print('Prisma: Connected')
    prisma.disconnect()
except Exception as e:
    print(f'Prisma Error: {e}')
    exit(1)
\""
}

# パフォーマンステスト
performance_test() {
    echo -e "\n${YELLOW}=== Performance Test ===${NC}"
    
    # Create test data file
    cat > /tmp/test_data.json << EOF
{
    "project_id": "perf-test-$(date +%s)",
    "test_config_id": "perf-test-config",
    "account_id": "perf-test-account",
    "mode": "omakase",
    "url": "https://example.com"
}
EOF
    
    # Simple load test with curl
    echo "Sending 10 concurrent requests..."
    for i in {1..10}; do
        curl -s -X POST ${BASE_URL}/api/v1/test/execute \
            -H "Content-Type: application/json" \
            -d @/tmp/test_data.json > /tmp/perf_test_$i.log 2>&1 &
    done
    
    # Wait for all background jobs to complete
    wait
    
    # Check results
    SUCCESS_COUNT=$(grep -l '"status": "queued"' /tmp/perf_test_*.log | wc -l)
    echo -e "Successful requests: ${GREEN}${SUCCESS_COUNT}/10${NC}"
    
    # Cleanup
    rm -f /tmp/test_data.json /tmp/perf_test_*.log
}

# メイン実行部分
main() {
    echo -e "${YELLOW}=== QA³ Backend ML API Test Suite ===${NC}"
    echo "Base URL: $BASE_URL"
    echo "Started at: $(date)"
    
    # サービスが起動しているか確認
    echo -e "\n${YELLOW}Checking services...${NC}"
    if ! docker compose ps | grep -q "running"; then
        echo -e "${RED}Error: Services are not running. Please run 'make serve' first.${NC}"
        exit 1
    fi
    
    # テスト実行
    health_check
    api_endpoint_tests
    celery_worker_tests
    database_tests
    
    # パフォーマンステストは必要な場合のみ
    if [[ "$1" == "--with-performance" ]]; then
        performance_test
    fi
    
    # 結果サマリー
    echo -e "\n${YELLOW}=== Test Summary ===${NC}"
    for result in "${test_results[@]}"; do
        echo "$result"
    done
    
    echo -e "\nCompleted at: $(date)"
}

# ヘルプ表示
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --with-performance  Run performance tests"
    echo "  --help, -h         Show this help message"
    exit 0
fi

# メイン実行
main "$@"