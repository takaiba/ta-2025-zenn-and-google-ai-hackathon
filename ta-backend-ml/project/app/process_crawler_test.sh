#!/bin/bash

# Test script for process_crawler API endpoint

API_URL="http://localhost:8081/api/v1/dify/process_crawler"

TEST_URL="https://p0x0q.com"

# Test basic request
echo "Testing basic request..."
response=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{
    "url": "'"$TEST_URL"'",
    "maxDepth": 1,
    "limit": 10,
    "scrapeOptions": {
      "formats": ["markdown"],
      "onlyMainContent": true
    }
  }')

echo "Response:"
echo $response | jq

# Test error handling - missing URL
echo "Testing error handling - missing URL..."
response=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{
    "maxDepth": 1,
    "limit": 10
  }')

echo "Response:"
echo $response | jq

# Test path filtering
echo "Testing path filtering..."
response=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{
    "url": "'"$TEST_URL"'",
    "excludePaths": ["/about"],
    "maxDepth": 1,
    "limit": 10
  }')

echo "Response:"
echo $response | jq

echo "All tests completed"
