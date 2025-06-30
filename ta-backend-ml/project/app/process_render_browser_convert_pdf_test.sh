# curl -X POST http://localhost:8081/api/v1/dify/process_render_browser_convert_pdf \
#      -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
#      -H "Content-Type: application/json" \
#      -d '{
#            "url": "https://www.microsoft.com/licensing/terms/productoffering/microsoftteams/MCA"
#          }' > output.pdf

curl -X POST http://localhost:8081/api/v1/dify/process_render_browser_convert_pdf \
     -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
     -H "Content-Type: application/json" \
     -d '{
           "url": "https://p0x0q.com"
         }' > output.pdf
