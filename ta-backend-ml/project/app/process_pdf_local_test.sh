
curl -X POST http://localhost:8081/api/v1/dify/multimodal/process_pdf_multiple_local \
     -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
     -H "Content-Type: application/json" \
     -d '{
           "pdf_path": "./output/output-2647792559145097887.pdf",
           "prompt": "このページの情報（テキストではなく、表や図からわかる情報）を詳細にまとめてください。例えばチェックマークが入っていたら、これは「できる」ということがわかります。"
         }' | jq .
