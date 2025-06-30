# テスト用のファイルを作成
TEST_FILE="test_upload.txt"
echo "This is a test file" > $TEST_FILE

# ファイルアップロードのテスト
curl -s -F "file=@$TEST_FILE" http://localhost:8081/api/v1/dify/upload | jq .

# テストファイルを削除
rm $TEST_FILE
