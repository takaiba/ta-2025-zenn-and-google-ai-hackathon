
curl -X POST https://dify.p0x0q.com/v1/workflows/run \
  -H "Authorization: Bearer app-2dUTH05t93yxHSKBViuMA6eS" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "inputs": {
        "text": "こんにちは"
    },
    "response_mode": "blocking",
    "user": "abc-123"
}' | jq .data.outputs.text
