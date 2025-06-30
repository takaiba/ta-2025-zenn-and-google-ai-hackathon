import asyncio
import os
import sys
import csv
from datetime import datetime
sys.path.append('app')

from prisma import Prisma

preprocessing_replace_content = [
    "[メイン コンテンツにスキップ](#main)",
    "このブラウザーはサポートされなくなりました。",
    "Microsoft Edge にアップグレードすると、最新の機能、セキュリティ更新プログラム、およびテクニカル サポートを利用できます。",
    "[Microsoft Edge をダウンロードする](https://go.microsoft.com/fwlink/p/?LinkID=2092881) [Internet Explorer と Microsoft Edge の詳細情報](https://learn.microsoft.com/en-us/lifecycle/faq/internet-explorer-microsoft-edge)"
]

async def main():
    prisma = Prisma()
    await prisma.connect()
    
    DEFAULT_TENANT_ID = os.environ.get('DEFAULT_TENANT_ID', 'public')
    
    # NOTE: 現在はデフォルトテナントIDしか利用せずにしている。UC案件についてはこのユースケースで事足りているため
    await prisma.execute_raw(f"select set_config('app.current_tenant_id', '{DEFAULT_TENANT_ID}', false);")
    
    output_lines = []
    skip = 0
    maxProcessCount = 50000
    processed_count = 0
    file_count = 0
    
    while True:
        # domain = learn.microsoft.com なものを100件ずつ取得し、処理していく
        total = await prisma.crawldata.find_many(
            where=
            # updatedAtが2025-01-27以降のものを取得する。
            {
                'httpStatusCode': {
                    'equals': 200
                },
                'updatedAt': {
                   'gte': datetime(2025, 1, 27)
                },
            }
            
            # mslearnのものを取得する
            # {
            #     'domain': 
            #     {'equals': "learn.microsoft.com"},
            #     'httpStatusCode': {
            #         'equals': 200
            #     }
            # }
            ,
            take=100,
            skip=skip
        )
        
        if not total or processed_count >= maxProcessCount:
            break
        
        for data in total:
            # print(data)
            
            # markdownDataとurlを組み合わせて表示する
            # preprocessing_replace_contentにある文字列置換を行う(markdownData)
            for replace_content in preprocessing_replace_content:
                data.markdownData = data.markdownData.replace(replace_content, "")
                data.extractPdfAdditionalData = str(data.extractPdfAdditionalData).replace(replace_content, "")
            
            markdownData = data.markdownData.replace(chr(10), " ").replace(chr(13), " ")
            pdfData = data.extractPdfAdditionalData.replace(chr(10), " ").replace(chr(13), " ")
            markdownOutput = f"<content url={data.url}>PDFデータ:{pdfData}\n  HTML構造データ:\n{markdownData}</content url={data.url}>"
            output_lines.append([data.url, data.title, markdownOutput])
        
        skip += 100
        processed_count += len(total)
        
        if processed_count % 5000 == 0:
            with open(f"output-part-{file_count}.csv", "w", newline='') as f:
                writer = csv.writer(f)
                writer.writerow(["url", "title", "content"])
                writer.writerows(output_lines)
            output_lines = []
            file_count += 1

    if output_lines:
        with open(f"output-part-{file_count}.csv", "w", newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["url", "title", "content"])
            writer.writerows(output_lines)
    
if __name__ == "__main__":
    asyncio.run(main())
