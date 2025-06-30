from . import utils
import os, requests


# urlで上記クエリを実行し、/tmp/output-{url_hash}.pdfに保存し、パスを返す
def get_pdf_file_by_render_browser(url):
    headers = {
        'Authorization': 'Bearer ' + utils.TOKEN,
    }
    data = {
        "url": url
    }
    
    url_hash = hash(url)
    pdf_path = f'./output/output-{url_hash}.pdf'
    
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
    # すでにファイル名が保存されていたら、それをそのまま返す
    if os.path.exists(pdf_path):
        return pdf_path

    try:
        response = requests.post('http://localhost/api/v1/dify/process_render_browser_convert_pdf', headers=headers, json=data)
        response.raise_for_status()
        
        with open(pdf_path, 'wb') as f:
            f.write(response.content)
        
        return pdf_path

    except Exception as e:
        # 例外スロー
        raise e

# 以下のクエリを実行し、必要情報を抽出する。
# curl -X POST http://localhost/api/v1/dify/multimodal/process_pdf_multiple_local \
#      -H "Authorization: Bearer 39069151-81e1-4725-bcf8-1b0a65ae6b9c" \
#      -H "Content-Type: application/json" \
#      -d '{
#            "pdf_path": "./output/output-2647792559145097887.pdf",
#            "prompt": "このページの情報（テキストではなく、表や図からわかる情報）を詳細にまとめてください。例えばチェックマークが入っていたら、これは「できる」ということがわかります。"
#          }' | jq .

def extract_pdf_additional_data(pdf_path, prompt):
    headers = {
        'Authorization': 'Bearer ' + utils.TOKEN,
    }
    data = {
        "pdf_path": pdf_path,
        "prompt": prompt
    }
    
    try:
        response = requests.post('http://localhost/api/v1/dify/multimodal/process_pdf_multiple_local', headers=headers, json=data)
        response.raise_for_status()
    
        return response.json()['result']
    except Exception as e:
        # 例外スロー
        raise e
