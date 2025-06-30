curl -X POST http://localhost:8081/api/v1/dify/multimodal/process_gemini_grounding_google \
     -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
     -H "Content-Type: application/json" \
     -d '{
           "prompt": "DMM.comの以下の情報を回答して上場有無上場している市場本社所在地郵便番号ホームページURL代表者名その他役員資本金設立日（西暦）従業員数主要株主"
         }' | jq .
