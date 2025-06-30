# mslearnの情報収集を行う。

urls=(
  "https://docs.microsoft.com/ja-jp/deployoffice/install-different-office-visio-and-project-versions-on-the-same-computer"
  "https://docs.microsoft.com/ja-jp/deployoffice/use-the-office-deployment-tool-to-install-volume-licensed-editions-of-visio-2016"
  "https://docs.microsoft.com/ja-jp/deployoffice/overview-office-deployment-tool"
  "https://learn.microsoft.com/ja-jp/microsoft-365-apps/deploy/deployment-guide-for-visio#deploy-visio-ltsc-2021"
  "https://www.microsoft.com/en-us/download/details.aspx?id=49117"
  "https://learn.microsoft.com/ja-jp/microsoft-365/commerce/subscriptions/what-if-my-subscription-expires?view=o365-worldwide"
  "https://www.microsoft.com/licensing/terms/productoffering/Microsoft365/EAEAS"
  "https://learn.microsoft.com/ja-jp/microsoft-365/commerce/licenses/product-keys-faq?view=o365-worldwide"
  "https://www.microsoft.com/licensing/terms/ja-JP/productoffering/Microsoft365Applications/EAEAS"
  "https://www.microsoft.com/licensing/terms/productoffering/microsoftteams/MCA"
  "https://www.microsoft.com/licensing/terms/product/ForallSoftware/all"
  "https://www.microsoft.com/ja-jp/licensing/existing-customer/activation-centers"
  "https://www.microsoft.com/ja-jp/microsoft-365/enterprise/microsoft365-plans-and-pricing"
  "https://www.microsoft.com/ja-jp/microsoft-365/enterprise/microsoft-office-volume-licensing-suites-comparison"
  "https://learn.microsoft.com/ja-jp"
  "https://microsoft.com/licensing/terms"
)

API_URL="https://dev-ta-backend-ml.p0x0q.com/api/v1/dify/process_crawler"
# API_URL="http://localhost:8081/api/v1/dify/process_crawler"

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

