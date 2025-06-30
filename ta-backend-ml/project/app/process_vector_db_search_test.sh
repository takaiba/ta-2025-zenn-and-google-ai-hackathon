curl -X POST http://localhost:8081/api/v1/dify/process_vector_db_search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
  -d '{"domain_name": "mslearn", "query": "How to deploy Azure Functions?"}' | jq .
