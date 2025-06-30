urls=(
  "https://www.pref.fukuoka.lg.jp/"
)

API_URL="https://dev-ta-backend-ml.p0x0q.com/api/v1/dify/process_crawler"

for url in "${urls[@]}"; do
  curl -s -X POST $API_URL \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
    -d '{
      "url": "'"$url"'",
      "maxDepth": 10,
      "limit": 1000,
      "scrapeOptions": {
        "formats": ["markdown"],
        "onlyMainContent": true
      }
    }'
done

