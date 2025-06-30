curl -X POST http://localhost:8081/api/v1/dify/process_vertex_ai_agent_builder \
  -H "Content-Type: application/json" \
  -d '{"q": "契約", "engine_id": "uc-project-demo_1733837716716"}' | jq .
