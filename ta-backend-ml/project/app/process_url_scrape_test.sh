curl -X POST http://localhost:8081/api/v1/dify/process_url_scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{"url": "https://www.microsoft.com/licensing/terms/productoffering/microsoftteams/MCA"}' | jq .
