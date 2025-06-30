#!/bin/bash

# user_group_id なし (全社共通ナレッジを検索)
echo "--- Testing without user_group_id (expecting common knowledge) ---"
curl -X POST http://localhost:8081/api/v1/dify/process_knowledge_search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{"query": "a", "tenant_id": "c492efa6-da9a-4aa0-a832-11b4d1dbbe48"}' | jq . 

echo "\n--- Testing with user_group_id: null (expecting common knowledge) ---"
curl -X POST http://localhost:8081/api/v1/dify/process_knowledge_search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{"query": "a", "tenant_id": "c492efa6-da9a-4aa0-a832-11b4d1dbbe48", "user_group_id": null}' | jq . 

echo "\n--- Testing with specific user_group_id ---"
# TODO: 適切なuser_group_idに置き換えてください
TEST_USER_GROUP_ID="your-test-user-group-id"
curl -X POST http://localhost:8081/api/v1/dify/process_knowledge_search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{"query": "a", "tenant_id": "c492efa6-da9a-4aa0-a832-11b4d1dbbe48", "user_group_id": "'$TEST_USER_GROUP_ID'"}' | jq . 
