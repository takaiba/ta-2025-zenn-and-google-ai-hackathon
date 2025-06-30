# スキーマについては、 @schema.prisma を参照

# 以下から、さらに改善すること
# 入力は、texｔに加えて、humanResourcesの人事情報、knowledgeDataの知識データ、defaultHearingEmail: デフォルトヒアリングメールアドレス(今は、default@and-dot.co.jp固定)を渡すこと

# さらに出力は、以下の２パターンになる

# 質問に回答できるケース
# {
#   "text": "QT-GenAIは、法人向けに提供されているAIサービスで、複数のAIモデルを利用できる点が特徴です。特に、Gemini1.5 Flash/ProはマルチモーダルAIとして、テキストだけでなく、画像、PDF、動画、音声の入力にも対応しています。これにより、さまざまな形式のデータを扱うことができ、ビジネスの多様なニーズに応えることが可能です。このサービスは高い柔軟性を持ち、特定の業務プロセスやデータ分析、コンテンツ生成などに活用されることが多いです。",
#   "resultCode": "answered"
# }

# 質問に回答できないケース
# {
#   "text": "申し訳ありませんが、「SmartGeasy」についての情報は私のデータベースには含まれていません。そのため、正確な回答を提供することができませんでした。この件について詳しい方にお問い合わせいただけると幸いです。",
#   "resultCode": "required_hearing",
#   "hearingRealName": "Kosuke Takanezawa",
#   "hearingEmail": "kosuke.takanezawa@and-dot.co.jp",
#   "recommendReasoning": "Kosuke Takanezawaさんは広範な知識を持つ情報システム部門の担当者であり、社内で使用されているソフトウェアやツールについての情報を把握している可能性があります。そのため、SmartGeasyに関する情報を持っているかもしれません。"
# }


# 質問に回答できないケースは、通常通りのConversationの投入処理と、チケットのステータスは、hearing_queueに変更すること

import asyncio
import requests
from prisma import Prisma
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urljoin, urlparse
import os
import django
import json
import copy

# Add the project directory to the Python path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# aiohttpをインポート、requestsの代わりに使用
import aiohttp

# Ensure the DJANGO_SETTINGS_MODULE environment variable is set
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.project.settings')

django.setup()

# 処理ログをDBに記録するための関数
async def append_log_entry(prisma, conversation_id, log_type, log_data):
    """
    指定された形式でログエントリを作成し、DBに保存する関数
    
    Args:
        prisma: Prismaインスタンス
        conversation_id (str): 会話ID
        log_type (str): ログのタイプ (例: "dify", "process", "sse_event")
        log_data (dict): ログに記録するデータ
    """
    try:
        # 会話情報を取得してテナントIDを確認
        conversation = await prisma.conversation.find_unique(
            where={
                'id': conversation_id
            }
        )
        
        if not conversation:
            print(f"[LOG] 会話ID {conversation_id} が見つかりません。ログは記録されません。")
            return
        
        # テナントIDを取得
        tenant_id = conversation.tenantId
        
        # データをJSON文字列に変換
        data_json = json.dumps(log_data, ensure_ascii=False)
        
        # ConversationProcessLogテーブルに保存
        await prisma.conversationprocesslog.create(
            data={
                'conversationId': conversation_id,
                'type': log_type,
                'data': data_json,
                'tenantId': tenant_id
            }
        )
        
        # Debug: ログの記録を確認
        # print(f"[LOG] DEBUG:会話ID {conversation_id} に {log_type} タイプのログを記録しました。")
    except Exception as e:
        print(f"[LOG] ログの記録中にエラーが発生しました: {str(e)}")
        import traceback
        traceback.print_exc()

# Dify API Keyを環境変数として設定。
# TODO: こちら、最新の会話ではデフォルトキーは不要になったので、変数定義そのものを廃止したい。

# kd_hearing: https://dify.p0x0q.com/app/04056bdd-fba4-45fd-8088-0a4c8bd07f6c/workflow
DIFY_API_KEY_HEARING_RESPONSE = os.getenv("DIFY_API_KEY_HEARING_RESPONSE", "app-2Qv4TnQK6THHEwDY6TLNxnVT")
# kd_generate_title: https://dify.p0x0q.com/app/efce4670-f840-43e2-b62d-39782f13d7e1/workflow
DIFY_API_KEY_TICKET_TITLE_GENERATOR = os.getenv("DIFY_API_KEY_TICKET_TITLE_GENERATOR", "app-aW9UGdOLS3sJU5QKAWtkHCDw")
# kd_answer_question v20250402: https://dify.p0x0q.com/app/aa48027a-33bd-4653-8839-55f7c7176f05/workflow
DIFY_API_KEY_FAQ_RESPONSE = os.getenv("DIFY_API_KEY_FAQ_RESPONSE", "app-BsJVqAMrY1eDTj8ZPvMPxKsg")
# kd_generate_search_keywords: https://dify.p0x0q.com/app/a9145442-1f39-4448-b114-ab99bf4e45ca/workflow
DIFY_API_KEY_SEARCH_KEYWORDS_GENERATOR = os.getenv("DIFY_API_KEY_SEARCH_KEYWORDS_GENERATOR", "app-iGYtjCEqoN3OHHpny2QJfF0J")
# アプリのベースURL
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://localhost:3000")

if APP_BASE_URL is None:
    raise Exception("APP_BASE_URL is not set")

# 新しく、ticket.modeがhearingだった時の処理を書いて。 answer_hearing_queued_ticketsとしましょうか。
# 処理の内容は、queuedになっていたら、ヒアリング元のユーザーIDを特定し、回答があったことを報告してください。
# なお、API通信時には、HearingテーブルのHearingReasonとユーザーの回答文章を入力textを追加で与え、それ以外はfaq_queued_ticketsと同じです。

# またAPIキーは、faqと異なり、app-2Qv4TnQK6THHEwDY6TLNxnVTを使ってください。

async def answer_hearing_queued_tickets(prisma, max_concurrent=5):
    """
    Answer hearing queued tickets and update their status.
    
    Args:
        prisma: Prismaインスタンス
        max_concurrent: 最大並列実行数（デフォルト: 5）
    """
    try:
        # Get hearing queued tickets
        hearing_tickets = await prisma.conversationticket.find_many(
            where={
                'status': 'open',
                'aiStatus': 'queued',
                'mode': 'hearing'
            }
        )
        
        if not hearing_tickets:
            # print("[HEARING] 処理対象のヒアリングチケットがありません")
            return
            
        print(f"[HEARING] {len(hearing_tickets)}件のヒアリングチケットを処理します（最大並列数: {max_concurrent}）")
            
        # 全チケットを並列処理するための非同期処理タスクリスト
        tasks = []
        semaphore = asyncio.Semaphore(max_concurrent) # 指定された最大並列数
        
        # 共有するHTTPセッション
        async with aiohttp.ClientSession() as session:
            # 各チケットの処理をタスクとして追加
            for ticket in hearing_tickets:
                tasks.append(process_hearing_ticket_with_semaphore(prisma, session, ticket, semaphore))
            
            # すべてのタスクを並列実行
            await asyncio.gather(*tasks)

    except Exception as e:
        import traceback
        print(traceback.print_exc())
        print(f"[HEARING] Error in answer_hearing_queued_tickets: {str(e)}")

# ヒアリングチケット1件を処理する関数
async def process_hearing_ticket_with_semaphore(prisma, session, ticket, semaphore):
    """
    セマフォを使用して1件のヒアリングチケットを処理するラッパー関数
    """
    async with semaphore:
        return await process_hearing_ticket(prisma, session, ticket)

async def process_hearing_ticket(prisma, session, ticket):
    """
    1件のヒアリングチケットを処理する非同期関数
    
    Args:
        prisma: Prismaインスタンス
        session: 共有aiohttpセッション
        ticket: 処理対象のチケット
    """
    try:
        print(f"[HEARING] 処理中のチケット: {ticket.id}")
        
        # Get the latest question from the conversation
        conversations = await prisma.conversation.find_many(
            where={
                'ticketId': ticket.id,
            },
            order={
                'createdAt': 'asc'
            }
        )

        # 一旦、ヒアリングは一つの会話につき1つまでで想定する
        hearingId = ticket.hearingIds[-1]
        
        if hearingId is None:
            print(f"Error: Original question ticket ID not found for ticket {ticket.id}")
            return
        
        # hearingテーブルから、HearingReasonを取得する
        hearing = await prisma.conversationhearing.find_first(
            where={
                'id': hearingId
            }
        )
        
        if hearing is None:
            print(f"Error: Hearing not found for original question ticket ID {hearingId}")
            return
        
        hearingReason = hearing.hearingReason
        
        # 元の質問者の情報を取得して、Slackメンションを追加
        original_ticket = await prisma.conversationticket.find_first(
            where={
                'id': hearing.ticketId
            }
        )
        
        # 元のチケットがあれば、そのmodeIdを使用する
        original_mode_id = None
        if original_ticket and original_ticket.modeId:
            original_mode_id = original_ticket.modeId
            # 現在のチケットのmodeIdが設定されていない場合は、元のチケットのmodeIdをセットする
            if not ticket.modeId:
                await prisma.conversationticket.update(
                    where={
                        'id': ticket.id
                    },
                    data={
                        'modeId': original_mode_id
                    }
                )
                print(f"[HEARING] チケット {ticket.id} を元のチケットのmodeId: {original_mode_id}で更新しました")
        
        latest_question = ""
        for conversation in conversations:
            latest_question += f"""
<conversation>
text: {conversation.text}
questionType: {conversation.questionType}
creator: {conversation.creator}
</conversation>
"""
        
        print(f"[HEARING] 最新の質問: {latest_question}")
        
        # アカウント一覧を取得
        accounts = []
        
        # チケットにユーザーグループが紐づいている場合は、そのグループのメンバーに限定する
        if ticket.userGroupId:
            # ユーザーグループのメンバーを取得
            group_members = await prisma.usergroupmember.find_many(
                where={
                    'tenantId': ticket.tenantId,
                    'userGroupId': ticket.userGroupId
                },
                include={
                    'account': True
                }
            )
            
            # メンバーのアカウント情報を取得
            accounts = [member.account for member in group_members if member.account]
        else:
            # ユーザーグループが指定されていない場合は全アカウントを取得
            accounts = await prisma.account.find_many(
                where={
                    'tenantId': ticket.tenantId,
                }
            )
        
        # アカウントのメールアドレス一覧を作成
        account_emails = [account.email for account in accounts]
        
        # humanResourcesをアカウントのメールアドレスと一致するものだけに絞り込む
        humanResources = await prisma.humanresource.find_many(
            where={
                'tenantId': ticket.tenantId,
                'email': {
                    'in': account_emails
                }
            }
        )

        # デフォルトヒアリング担当者を検索
        default_hearing_user = await prisma.humanresource.find_first(
            where={
                'tenantId': ticket.tenantId,
                'isDefaultHearing': True
            }
        )

        # デフォルトヒアリング担当者が見つからない場合はエラーを発生させる
        if default_hearing_user is None:
            error_message = "デフォルトヒアリング担当者が設定されていません。humanResourceテーブルでisDefaultHearing=Trueのユーザーを設定してください。"
            print(error_message)
            raise Exception(error_message)
            
        # デフォルトヒアリング担当者のメールアドレスを取得
        default_hearing_email = default_hearing_user.email

        # 質問からキーワードを生成し、関連するナレッジデータを検索
        first_question = ""
        if conversations and len(conversations) > 0:
            first_question = conversations[0].text
        
        knowledgeData = await generate_search_keywords_and_filter_knowledge(
            prisma, 
            first_question, 
            ticket.tenantId,
            ticket.id,
            ticket.userGroupId
        )
        
        humanResourcesStr = ""
        for humanResource in humanResources:
            humanResourcesStr += f"""
<humanResource>
氏名: {humanResource.realName}さん, 
メールアドレス: {humanResource.email}, 
特徴: {humanResource.featureHearingPrompt}
</humanResource>
"""

        knowledgeDataStr = ""
        for knowledge in knowledgeData:
            # 基本情報を追加
            knowledgeEntry = f"""
<knowledgeData>
知識タイトル: {knowledge.title}
知識の説明: {knowledge.description}
知識データ: {knowledge.data}"""
            
            # 各フィールドが存在する場合のみ追加
            if knowledge.crawlerUrl:
                knowledgeEntry += f"""
リンク: {knowledge.crawlerUrl}"""
            
            if knowledge.crawlerData:
                knowledgeEntry += f"""
クローリングデータ: {knowledge.crawlerData}"""
            
            if knowledge.storageFileUrl:
                knowledgeEntry += f"""
ストレージファイルURL: {knowledge.storageFileUrl}"""
            
            if knowledge.storageFileData:
                knowledgeEntry += f"""
ストレージファイルデータ: {knowledge.storageFileData}"""
            
            if knowledge.storageFileName:
                knowledgeEntry += f"""
ストレージファイル名: {knowledge.storageFileName}"""
            
            if knowledge.storageFileMimeType:
                knowledgeEntry += f"""
ストレージファイルMIMEタイプ: {knowledge.storageFileMimeType}"""
            
            knowledgeEntry += "\n</knowledgeData>"
            knowledgeDataStr += knowledgeEntry

        # DIFYの文字数制限（15万文字）をチェック
        MAX_CHARS = 150000
        original_length = len(knowledgeDataStr)
        if original_length > MAX_CHARS:
            knowledgeDataStr = knowledgeDataStr[:MAX_CHARS]
            print(f"[HEARING] 警告: knowledgeDataの文字数が上限を超えています。元の長さ: {original_length}文字、15万文字に切り詰めて送信します。")

        # print(f"humanResourcesStr: {humanResourcesStr}")
        # print(f"knowledgeDataStr: {knowledgeDataStr}")
        # print(f"latest_question: {latest_question}")

        if latest_question != "":
            # APIキーの決定: チケットのmodeIdに紐づくDifyModeQuestionから適切なAPIキーを取得、なければデフォルトを使用
            api_key_to_use = DIFY_API_KEY_HEARING_RESPONSE
            
            # チケットに関連付けられたmodeIdがあるか確認
            if ticket.modeId:
                dify_mode_question = await prisma.difymodequestion.find_unique(
                    where={
                        'id': ticket.modeId
                    }
                )
                if dify_mode_question:
                    # モードに基づいて適切なアプリIDを選択
                    app_id = None
                    if ticket.mode == 'hearing':
                        app_id = dify_mode_question.hearingAppId
                    elif ticket.mode == 'faq':
                        app_id = dify_mode_question.faqAppId
                    
                    # 選択されたアプリIDからDifyAppを取得
                    if app_id:
                        dify_app = await prisma.difyapp.find_unique(
                            where={
                                'id': app_id
                            }
                        )
                        if dify_app and dify_app.apiKey:
                            api_key_to_use = dify_app.apiKey
                            print(f"[HEARING] チケット {ticket.id} に {dify_app.name} のAPIキーを使用します")
            
            # requestsの代わりにaiohttpを使用
            async with session.post(
                'https://dify.p0x0q.com/v1/workflows/run',
                headers={
                    'Authorization': f'Bearer {api_key_to_use}',
                    'Content-Type': 'application/json'
                },
                json={
                    'inputs': {
                        'text': latest_question,
                        'hearingReason': hearingReason,
                        'humanResources': humanResourcesStr,
                        'knowledgeData': knowledgeDataStr,
                        'hearingCount': 3,  # 複数人ヒアリングのデフォルト値
                        'tenantId': ticket.tenantId,  # テナントIDを追加
                        'userGroupId': ticket.userGroupId # ユーザーグループIDを追加
                    },
                    'response_mode': 'blocking',
                    'user': 'abc-123'
                }
            ) as response:
                if response.status == 200:
                    response_json = await response.json()
                    response_data = response_json.get('data', {}).get('outputs', {})
                    answer_text = response_data.get('text', '')
                    result_code = response_data.get('resultCode', '')

                    if result_code == 'requirement-more-answer':
                        # アカウント情報を取得して、ユーザー名を補足する
                        account = await prisma.account.find_first(
                            where={
                                'id': ticket.accountId
                            }
                        )
                        
                        user_name = "不明なユーザー"
                        if account and account.name:
                            user_name = account.name
                        
                        # 元の回答テキストをConversationに保存（リンクや補足情報なし）
                        await prisma.conversation.create(
                            data={
                                'ticketId': ticket.id,
                                'text': answer_text,
                                'questionType': 'answer',
                                'role': 'assistant',
                                'creator': 'ai',
                                'createdAt': datetime.now(),
                                'updatedAt': datetime.now(),
                                'tenantId': ticket.tenantId,
                                'accountId': ticket.accountId
                            }
                        )

                        # Update ticket status
                        await prisma.conversationticket.update(
                            where={
                                'id': ticket.id
                            },
                            data={
                                'aiStatus': 'human_waiting',
                                'cautionMessage': 'AIが追加情報を求めています！\n' + answer_text,
                                'isSlackReply': True
                            }
                        )

                        print(f"[HEARING] チケット {ticket.id} に回答しました")
                        
                    elif result_code == 'answered-callback-fulfilled':
                        # アカウント情報を取得して、ユーザー名を補足する
                        account = await prisma.account.find_first(
                            where={
                                'id': ticket.accountId
                            }
                        )
                        
                        user_name = "不明なユーザー"
                        if account and account.name:
                            user_name = account.name
                        
                        # 元の回答テキストをConversationに保存（リンクや補足情報なし）
                        await prisma.conversation.create(
                            data={
                                'ticketId': ticket.id,
                                'text': answer_text,
                                'questionType': 'answer',
                                'role': 'assistant',
                                'creator': 'ai',
                                'createdAt': datetime.now(),
                                'updatedAt': datetime.now(),
                                'tenantId': ticket.tenantId,
                                'accountId': ticket.accountId
                            }
                        )

                        # Update ticket status
                        await prisma.conversationticket.update(
                            where={
                                'id': ticket.id
                            },
                            data={
                                'aiStatus': 'answered',
                                'isSlackReply': True
                            }
                        )

                        print(f"[HEARING] チケット {ticket.id} に回答しました")
                        
                        # hearing.ticketIdでticketを取得し、conversationを追加する
                        hearing_ticket = await prisma.conversationticket.find_first(
                            where={
                                'id': hearing.ticketId
                            }
                        )
                        # fulfilled_textがNoneの場合にデフォルト値を設定する
                        fulfilled_text = response_data.get('fulfilledText', '') if response_data else '回答が生成できませんでした。'
                        
                        # 元質問者のアカウント情報を取得
                        original_account = await prisma.account.find_first(
                            where={
                                'id': hearing_ticket.accountId
                            }
                        )
                        
                        original_user_name = "不明なユーザー"
                        if original_account and original_account.name:
                            original_user_name = original_account.name
                        
                        # 元の回答テキストをConversationに保存（リンクや補足情報なし）
                        await prisma.conversation.create(
                            data={
                                'ticketId': hearing_ticket.id,
                                'text': fulfilled_text,
                                'questionType': 'answer',
                                'role': 'assistant',
                                'creator': 'ai',
                                'createdAt': datetime.now(),
                                'updatedAt': datetime.now(),
                                'tenantId': hearing_ticket.tenantId,
                                'accountId': hearing_ticket.accountId
                            }
                        )

                        # fulfilled_answerに変更する
                        await prisma.conversationticket.update(
                            where={
                                'id': hearing_ticket.id
                            },
                            data={
                                'aiStatus': 'fulfilled_answer',
                                'isSlackReply': True
                            }
                        )
                        
                        # 回答が完了したことを通知する
                        await prisma.conversation.create(
                            data={
                                'ticketId': ticket.id,
                                'text': f"いただいた回答をもって、元の質問者に回答しました。ご協力ありがとうございました！",
                                'questionType': 'answer',
                                'role': 'assistant',
                                'creator': 'ai',
                                'createdAt': datetime.now(),
                                'updatedAt': datetime.now(),
                                'tenantId': ticket.tenantId,
                                'accountId': ticket.accountId
                            }
                        )

                        # fulfilled_textをナレッジとして登録する
                        # まずはcustomのナレッジツールを取得
                        custom_tool = await prisma.knowledgetool.find_first(
                            where={
                                "type": "custom"
                            }
                        )

                        if custom_tool is None:
                            raise Exception("customのナレッジツールが見つかりません。")

                        # custom_toolのIDを取得
                        knowledge_tool_id = custom_tool.id

                        # ナレッジデータを作成
                        await prisma.knowledgedata.create(
                            data={
                                "title": "ヒアリング回答",
                                "data": fulfilled_text,
                                "status": "processed",
                                "tags": ["hearing", "fulfilled_answer"],
                                "knowledgeToolId": knowledge_tool_id,
                                "tenantId": ticket.tenantId,
                            }
                        )

                else:
                    response_text = await response.text()
                    print(f"[HEARING] Dify API (HEARING_RESPONSE) エラー: ステータスコード {response.status}")
                    print(f"[HEARING] レスポンス内容: {response_text}")
                    print(f"[HEARING] リクエスト内容: {latest_question[:100]}...")
    except Exception as e:
        import traceback
        print(traceback.print_exc())
        print(f"[HEARING] Error in process_hearing_ticket: {str(e)}")

async def answer_faq_queued_tickets(prisma, max_concurrent=5):
    """
    Answer queued tickets and update their status.
    
    Args:
        prisma: Prismaインスタンス
        max_concurrent: 最大並列実行数（デフォルト: 5）
    """
    try:
        # Get queued tickets
        queued_tickets = await prisma.conversationticket.find_many(
            where={
                'status': 'open',
                'aiStatus': 'queued',
                'mode': 'faq'
            }
        )
        
        if not queued_tickets:
            # print("[FAQ] 処理対象のFAQチケットがありません")
            return
            
        print(f"[FAQ] {len(queued_tickets)}件のFAQチケットを処理します（最大並列数: {max_concurrent}）")
            
        # 全チケットを並列処理するための非同期処理タスクリスト
        tasks = []
        semaphore = asyncio.Semaphore(max_concurrent) # 指定された最大並列数
        
        # 共有するHTTPセッション
        async with aiohttp.ClientSession() as session:
            # 各チケットの処理をタスクとして追加
            for ticket in queued_tickets:
                tasks.append(process_faq_ticket_with_semaphore(prisma, session, ticket, semaphore))
            
            # すべてのタスクを並列実行
            await asyncio.gather(*tasks)
            
    except Exception as e:
        import traceback
        print(traceback.print_exc())
        print(f"[FAQ] Error in answer_faq_queued_tickets: {str(e)}")

# FAQチケット1件を処理する関数
async def process_faq_ticket_with_semaphore(prisma, session, ticket, semaphore):
    """
    セマフォを使用して1件のFAQチケットを処理するラッパー関数
    """
    async with semaphore:
        return await process_faq_ticket(prisma, session, ticket)

async def process_faq_ticket(prisma: Prisma, session, ticket):
    """
    1件のFAQチケットを処理する非同期関数
    
    Args:
        prisma: Prismaインスタンス
        session: 共有aiohttpセッション
        ticket: 処理対象のチケット
    """
    try:
        print(f"[FAQ] 処理中のチケット: {ticket.id}")
        # 回答レコードが存在するか確認
        # NOTE：　チケットのステータスがqueuedであることを確認している
        answer_conversation_record = await prisma.conversation.find_first(
            where={
                'ticketId': ticket.id,
                'ticket': {
                    'aiStatus': {
                        'equals': 'queued'
                    }
                },
                'creator': 'ai',
                'questionType': 'answer',
                'role': 'assistant',
                'tenantId': ticket.tenantId,
                'accountId': ticket.accountId,
                'text': ''
            },
            order={
                'createdAt': 'desc'
            }
        )
        
        if answer_conversation_record:
            # print(f"[FAQ] DEBUG:回答レコードが存在します: {answer_conversation_record.id}")
            # 回答レコードが存在する場合、そのレコードを使用
            conversation_id = answer_conversation_record.id
        else:
            # print(f"[FAQ] DEBUG:回答レコードが存在しません: {ticket.id}")
            # 回答レコードが存在しない場合、新しく作成
            answer_conversation_record = await prisma.conversation.create(
                data={
                    'ticketId': ticket.id,
                    'text': "",
                    'questionType': 'answer',
                    'role': 'assistant',
                    'creator': 'ai',
                    'createdAt': datetime.now(),
                    'updatedAt': datetime.now(),
                    'tenantId': ticket.tenantId,
                    'accountId': ticket.accountId
                }
            )
        
        # 会話IDを取得
        conversation_id = answer_conversation_record.id
        
        # プロセス開始ログを記録
        await append_log_entry(prisma, conversation_id, "process", {
            "ticket_id": ticket.id,
            "status": "started",
            "timestamp": datetime.now().isoformat()
        })
        
        # Get the latest question from the conversation
        conversations = await prisma.conversation.find_many(
            where={
                'ticketId': ticket.id,
            },
            order={
                'createdAt': 'asc'
            }
        )
        
        # conversationsが空の場合、警告を表示する
        if not conversations:
            # print("Warning: conversations is empty, ticketId: ", ticket.id)
            return
    
        last_conversation = conversations[-1]
        latest_question = ""
        for conversation in conversations:
            latest_question += f"""
<conversation>
text: {conversation.text}
questionType: {conversation.questionType}
creator: {conversation.creator}
</conversation>
"""
        
        
        # チケットにユーザーグループが紐づいている場合は、そのグループのメンバーに限定する
        if ticket.userGroupId:
            # ユーザーグループのメンバーを取得
            group_members = await prisma.usergroupmember.find_many(
                where={
                    'tenantId': ticket.tenantId,
                    'userGroupId': ticket.userGroupId
                },
                include={
                    'account': True
                }
            )
            
            # メンバーのアカウント情報を取得
            accounts = [member.account for member in group_members if member.account]
        else:
            # ユーザーグループが指定されていない場合は全アカウントを取得
            accounts = await prisma.account.find_many(
                where={
                    'tenantId': ticket.tenantId,
                }
            )

        # デフォルトヒアリング担当者を検索
        default_hearing_user = await prisma.humanresource.find_first(
            where={
                'tenantId': ticket.tenantId,
                'isDefaultHearing': True
            }
        )

        # デフォルトヒアリング担当者が見つからない場合はエラーを発生させる
        if default_hearing_user is None:
            error_message = "デフォルトヒアリング担当者が設定されていません。humanResourceテーブルでisDefaultHearing=Trueのユーザーを設定してください。"
            print(error_message)
            raise Exception(error_message)
            
        # デフォルトヒアリング担当者のメールアドレスを取得
        default_hearing_email = default_hearing_user.email

        if latest_question != "":
            # APIキーの決定: チケットのmodeIdに紐づくDifyModeQuestionから適切なAPIキーを取得、なければデフォルトを使用
            api_key_to_use = DIFY_API_KEY_FAQ_RESPONSE
            
            # チケットに関連付けられたmodeIdがあるか確認
            if ticket.modeId:
                dify_mode_question = await prisma.difymodequestion.find_unique(
                    where={
                        'id': ticket.modeId
                    }
                )
                if dify_mode_question:
                    # モードに基づいて適切なアプリIDを選択
                    app_id = None
                    if ticket.mode == 'hearing':
                        app_id = dify_mode_question.hearingAppId
                    elif ticket.mode == 'faq':
                        app_id = dify_mode_question.faqAppId
                    
                    # 選択されたアプリIDからDifyAppを取得
                    if app_id:
                        dify_app = await prisma.difyapp.find_unique(
                            where={
                                'id': app_id
                            }
                        )
                        if dify_app and dify_app.apiKey:
                            api_key_to_use = dify_app.apiKey
                            print(f"[FAQ] チケット {ticket.id} に {dify_app.name} のAPIキーを使用します")
            
            # requestsの代わりにaiohttpを使用
            async with session.post(
                'https://dify.p0x0q.com/v1/workflows/run',
                headers={
                    'Authorization': f'Bearer {api_key_to_use}',
                    'Content-Type': 'application/json'
                },
                json={
                    'inputs': {
                        'currentMessage': last_conversation.text,
                        'userMessages': latest_question,
                        'title': ticket.title,
                        'defaultHearingEmail': default_hearing_email,
                        'hearingCount': 3,  # 複数人ヒアリングのデフォルト値
                    },
                    'response_mode': 'streaming',
                    'user': 'abc-123'
                }
            ) as response:
                if response.status == 200:
                    # ストリーミングモードでデータを受信
                    full_text_content = ""  # テキストチャンクの累積
                    all_received_data = []  # 受信したすべてのデータを保存
                    final_outputs = {}  # 最終的な出力データ
                    
                    print(f"[FAQ] ストリーミング応答開始: チケットID {ticket.id}")
                    
                    # Dify APIリクエスト開始をログに記録
                    await append_log_entry(prisma, conversation_id, "question_answer_generate_process", {
                        "status": "started",
                        "response_mode": "streaming",
                        "response_status": response.status
                    })
                    
                    # ストリームからデータを読み込む
                    try:
                        buffer = ""
                        # iter_chunked を使用して固定サイズのチャンクで読み込む (2KB単位)
                        chunk_size = 2048  # 2KB
                        # print(f"[FAQ] DEBUG:チャンクサイズ: {chunk_size}バイト単位で読み込みます")
                        
                        async for chunk in response.content.iter_chunked(chunk_size):
                            if not chunk:
                                continue
                                
                            chunk_str = chunk.decode('utf-8', errors='replace')  # デコードエラーを防止
                            buffer += chunk_str
                            
                            # デバッグ: 生のチャンク内容を表示 (最初の50文字だけ)
                            # print(f"[FAQ] DEBUG:生チャンク受信 ({len(chunk_str)}バイト): {repr(chunk_str[:50])}...")
                            
                            # バッファ内の完全なSSEメッセージを処理
                            # SSEメッセージは "data: {json}\n\n" 形式
                            while '\n\n' in buffer:
                                parts = buffer.split('\n\n', 1)
                                if len(parts) == 2:
                                    message, buffer = parts
                                else:
                                    # 何らかの理由で分割に失敗した場合
                                    print(f"[FAQ] バッファ分割エラー: {repr(buffer[:50])}...")
                                    buffer = parts[0]
                                    continue
                                
                                # "data:" プレフィックスを処理
                                if message.startswith('data: '):
                                    json_str = message[6:]  # "data: " の長さは 6
                                    
                                    try:
                                        event_data = json.loads(json_str)
                                        event_type = event_data.get('event')
                                        all_received_data.append(event_data)
                                        
                                        # デバッグ用：イベントをレスポンスファイルに追記
                                        # data.inputsフィールドを除外する
                                        filtered_data = copy.deepcopy(event_data)
                                        if 'data' in filtered_data and isinstance(filtered_data['data'], dict):
                                            if 'inputs' in filtered_data['data']:
                                                del filtered_data['data']['inputs']
                                            # outputsパラメータがある場合のみ削除
                                            if 'outputs' in filtered_data['data']:
                                                del filtered_data['data']['outputs']
                                            # process_dataパラメータがある場合のみ削除
                                            if 'process_data' in filtered_data['data']:
                                                del filtered_data['data']['process_data']
                                            # フィルタリングしたイベントデータをログに記録
                                            await append_log_entry(prisma, conversation_id, "sse_event", filtered_data)
                                        
                                        # print(f"[FAQ] DEBUG:イベント処理: {event_type}")
                                        
                                        # イベントタイプごとの処理
                                        if event_type == 'text_chunk':
                                            # テキストチャンクの処理
                                            text_data = event_data.get('data', {}).get('text', '')
                                            full_text_content += text_data
                                            # print(f"[FAQ] DEBUG:テキストチャンク: {text_data}")
                                            
                                        elif event_type == 'workflow_finished':
                                            # ワークフロー完了イベント
                                            # print(f"[FAQ] DEBUG:ワークフロー完了: {json_str[:100]}...")
                                            
                                            # 最終出力データを取得
                                            outputs = event_data.get('data', {}).get('outputs', {})
                                            if outputs:
                                                final_outputs = outputs
                                                # print(f"[FAQ] DEBUG:最終出力: {outputs}")
                                                
                                        elif event_type == 'node_finished':
                                            # ノード完了イベント - 出力を含む可能性がある
                                            node_outputs = event_data.get('data', {}).get('outputs', {})
                                            if node_outputs:
                                                node_id = event_data.get('data', {}).get('node_id', 'unknown')
                                                # print(f"[FAQ] DEBUG:ノード完了 ID={node_id}, 出力あり: {node_outputs}")
                                                # ノード出力をマージして最終出力を更新
                                                final_outputs.update(node_outputs)
                                                
                                    except json.JSONDecodeError as e:
                                        print(f"[FAQ] JSONデコードエラー: {str(e)}")
                                        print(f"[FAQ] 無効なJSON: {repr(json_str[:100])}...")
                                else:
                                    # print(f"[FAQ] DEBUG:不正なSSEメッセージ形式: {repr(message[:50])}...")
                                    pass
                        
                        # バッファに残ったデータがあれば処理
                        if buffer.strip():
                            print(f"[FAQ] 未処理のバッファデータ: {len(buffer)}バイト")
                            # 可能であれば残りのデータも処理（完全なSSEメッセージでない場合もある）
                            if buffer.startswith('data: '):
                                try:
                                    json_str = buffer[6:].strip()
                                    event_data = json.loads(json_str)
                                    print(f"[FAQ] 残りのバッファからイベント処理: {event_data.get('event')}")
                                    
                                    # 最終出力データを更新
                                    outputs = event_data.get('data', {}).get('outputs', {})
                                    if outputs:
                                        final_outputs.update(outputs)
                                except Exception as e:
                                    print(f"[FAQ] 残りのバッファ処理エラー: {str(e)}")
                        
                        print(f"[FAQ] ストリーミング完了: 累積テキスト長={len(full_text_content)}")
                        
                        # print(f"[FAQ] DEBUG:最終出力データ: {final_outputs}")
                        # 最終出力データが空の場合、テキストから結果を構築
                        if not final_outputs and full_text_content:
                            print("[FAQ] 最終出力が空のため、テキストから結果を構築します")
                            
                            # ノードイベントからresultCodeを探す
                            result_code = None
                            for event_data in all_received_data:
                                if event_data.get('event') == 'node_finished':
                                    node_outputs = event_data.get('data', {}).get('outputs', {})
                                    if 'resultCode' in node_outputs:
                                        result_code = node_outputs['resultCode']
                                        print(f"[FAQ] ノードイベントからresultCodeを取得: {result_code}")
                                        break
                            
                            # 結果を構築（resultCodeが得られた場合のみ設定）
                            final_outputs = {'text': full_text_content}
                            if result_code:
                                final_outputs['resultCode'] = result_code
                                print(f"[FAQ] resultCodeを設定: {result_code}")
                            else:
                                print("[FAQ] resultCodeが見つからないため、設定しません")
                    
                    except ValueError as e:
                        if "Chunk too big" in str(e):
                            print(f"[FAQ] チャンクサイズエラー: {str(e)} - バッファサイズを超えました")
                            print("[FAQ] ブロッキングモードで再試行します")
                            
                            # エラー情報をログに記録
                            error_data = {
                                "event": "error",
                                "data": {
                                    "error_type": "chunk_too_big",
                                    "error_message": str(e)
                                }
                            }
                            await append_log_entry(prisma, conversation_id, "error", error_data)
                            
                            # ブロッキングモードで再試行するためのリクエスト準備
                            try:
                                blocking_response = await session.post(
                                    'https://dify.p0x0q.com/v1/workflows/run',
                                    headers={
                                        'Authorization': f'Bearer {api_key_to_use}',
                                        'Content-Type': 'application/json'
                                    },
                                    json={
                                        'inputs': {
                                            'currentMessage': last_conversation.text,
                                            'userMessages': latest_question,
                                            'title': ticket.title,
                                            'defaultHearingEmail': default_hearing_email,
                                            'hearingCount': 3,
                                        },
                                        'response_mode': 'blocking',  # ブロッキングモードに変更
                                        'user': 'abc-123'
                                    }
                                )
                                
                                if blocking_response.status == 200:
                                    blocking_data = await blocking_response.json()
                                    print(f"[FAQ] ブロッキングモードで成功: {blocking_data.keys()}")
                                    final_outputs = blocking_data.get('data', {}).get('outputs', {})
                                else:
                                    print(f"[FAQ] ブロッキングモード失敗: {blocking_response.status}")
                            except Exception as retry_e:
                                print(f"[FAQ] ブロッキングモード再試行エラー: {str(retry_e)}")
                        else:
                            print(f"[FAQ] ストリーミング処理中のValueError: {str(e)}")
                            import traceback
                            traceback.print_exc()
                            
                            # エラー情報をログに記録
                            error_data = {
                                "event": "error",
                                "data": {
                                    "error_type": "value_error",
                                    "error_message": str(e),
                                    "traceback": traceback.format_exc()
                                }
                            }
                            await append_log_entry(prisma, conversation_id, "error", error_data)
                    except Exception as e:
                        print(f"[FAQ] ストリーミング処理中のエラー: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        
                        # エラー情報をログに記録
                        error_data = {
                            "event": "error",
                            "data": {
                                "error_type": "exception",
                                "error_message": str(e),
                                "traceback": traceback.format_exc()
                            }
                        }
                        await append_log_entry(prisma, conversation_id, "error", error_data)
                    
                    # final_outputsがからの場合はエラーにする
                    if not final_outputs or not final_outputs.get('text'):
                        print("[FAQ] 最終出力が空のため、エラーにします")
                        raise ValueError("最終出力が空です")
                    
                    # 保存処理
                    answer_text = final_outputs.get('text', '')
                    answer_title = final_outputs.get('title', '')
                    result_code = final_outputs.get('resultCode') or ''
                    
                    print(f"[FAQ] 処理結果: result_code={result_code}, answer_text={answer_text[:50]}...")
                    
                    # 処理結果をログに記録
                    await append_log_entry(prisma, conversation_id, "question_answer_generate_process", {
                        "status": "finished",
                        "result_code": result_code,
                        "answer_text_length": len(answer_text),
                        "answer_text_preview": answer_text[:100] if answer_text else ""
                    })
                    
                    # result_codeに応じて処理を分岐
                    if result_code == 'requirement-more-answer':
                        # アカウント情報を取得して、ユーザー名を補足する
                        account = await prisma.account.find_first(
                            where={
                                'id': ticket.accountId
                            }
                        )
                        
                        user_name = "不明なユーザー"
                        if account and account.name:
                            user_name = account.name
                        
                        # 元の回答テキストをConversationに保存（リンクや補足情報なし）
                        await prisma.conversation.update(
                            where={
                                'id': conversation_id
                            },
                            data={
                                'text': answer_text,
                                'updatedAt': datetime.now()
                            }
                        )

                        # Update ticket status
                        await prisma.conversationticket.update(
                            where={
                                'id': ticket.id
                            },
                            data={
                                'title': answer_title,
                                'aiStatus': 'human_waiting',
                                'cautionMessage': 'AIが追加情報を求めています！\n' + answer_text,
                                'isSlackReply': True
                            }
                        )

                        print(f"[FAQ] チケット {ticket.id} に回答しました")

                    elif result_code == 'answered':
                        # アカウント情報を取得して、ユーザー名を補足する
                        account = await prisma.account.find_first(
                            where={
                                'id': ticket.accountId
                            }
                        )
                        
                        user_name = "不明なユーザー"
                        if account and account.name:
                            user_name = account.name
                        
                        # 元の回答テキストをConversationに保存（リンクや補足情報なし）
                        await prisma.conversation.update(
                            where={
                                'id': conversation_id
                            },
                            data={
                                'text': answer_text,
                                'updatedAt': datetime.now()
                            }
                        )

                        # Update ticket status
                        await prisma.conversationticket.update(
                            where={
                                'id': ticket.id
                            },
                            data={
                                'title': answer_title,
                                'aiStatus': 'answered',
                                'isSlackReply': True
                            }
                        )

                        print(f"[FAQ] チケット {ticket.id} に回答しました")

                    elif result_code == 'required_hearing':
                        # Difyからの応答が複数人のヒアリング先を含む形式に変更
                        # 単一の文字列から配列形式に変更
                        hearing_real_names = final_outputs.get('hearingRealNames', [])
                        hearing_emails = final_outputs.get('hearingEmails', [])
                        recommend_reasoning = final_outputs.get('recommendReasoning', '')
                        hearing_reason = final_outputs.get('hearingReason', '')

                        # 後方互換性のため、配列でない場合は配列に変換
                        if not isinstance(hearing_real_names, list):
                            hearing_real_names = [hearing_real_names] if hearing_real_names else []
                        
                        if not isinstance(hearing_emails, list):
                            hearing_emails = [hearing_emails] if hearing_emails else []

                        # ヒアリング対象者のSlack表示名を準備
                        hearing_slack_mentions = []
                        for i, hearing_email in enumerate(hearing_emails):
                            if i < len(hearing_real_names):
                                hearing_real_name = hearing_real_names[i]
                            else:
                                hearing_real_name = "不明"

                            # ヒアリング先のアカウント情報を取得する
                            hearing_account = await prisma.account.find_first(
                                where={
                                    'email': hearing_email
                                }
                            )

                            # Slackユーザー連携されているかを確認
                            if hearing_account and hearing_account.slackUserId:
                                # Slack連携済みの場合は、KnowledgeSlackUserテーブルから実際のSlack IDを取得
                                slack_user = await prisma.knowledgeslackuser.find_first(
                                    where={
                                        'id': hearing_account.slackUserId
                                    }
                                )
                                if slack_user and slack_user.slackId:
                                    # 実際のSlack IDを使用してメンション形式を追加
                                    hearing_slack_mentions.append(f"<@{slack_user.slackId}>")
                                else:
                                    # Slack連携はされているが、slackIdが取得できない場合
                                    hearing_slack_mentions.append(f"（Ork Slack未連携ユーザー）@{hearing_real_name}さん")
                            else:
                                # 未連携の場合は（未連携ユーザー）の表記を追加
                                hearing_slack_mentions.append(f"（Ork Slack未連携ユーザー）@{hearing_real_name}さん")

                        # ヒアリング理由にSlackメンション情報を追加
                        hearing_reason_with_mentions = hearing_reason
                        if hearing_slack_mentions:
                            mentions_text = "、".join(hearing_slack_mentions)
                            hearing_reason_with_mentions = f"{mentions_text}さん。本件について回答いただければなと思いますがいかがでしょうか？\n\n{hearing_reason}\n\n詳細: {APP_BASE_URL}/?ticketId={ticket.id}"

                        # Update answer into Conversation table
                        await prisma.conversation.update(
                            where={
                                'id': conversation_id
                            },
                            data={
                                'text': answer_text,
                                'updatedAt': datetime.now()
                            }
                        )

                        # Update ticket status
                        await prisma.conversationticket.update(
                            where={
                                'id': ticket.id
                            },
                            data={
                                'title': answer_title,
                                'aiStatus': 'hearing_queue',
                                'isSlackReply': True
                            }
                        )

                        # 複数のヒアリング担当者それぞれに対してヒアリングチケットを作成
                        hearing_ids = []
                        hearing_success_count = 0

                        # ヒアリングチケットのタイトルをヒアリング理由から生成
                        hearing_ticket_title = ""

                        # APIキーの決定: チケットのmodeIdに紐づくDifyModeQuestionから適切なAPIキーを取得、なければデフォルトを使用
                        title_api_key_to_use = DIFY_API_KEY_TICKET_TITLE_GENERATOR

                        # チケットに関連付けられたmodeIdがあるか確認
                        if ticket.modeId:
                            dify_mode_question = await prisma.difymodequestion.find_unique(
                                where={
                                    'id': ticket.modeId
                                }
                            )
                            if dify_mode_question:
                                # モードに基づいて適切なアプリIDを選択
                                app_id = None
                                if ticket.mode == 'hearing':
                                    app_id = dify_mode_question.hearingAppId
                                elif ticket.mode == 'faq':
                                    app_id = dify_mode_question.faqAppId

                                # 選択されたアプリIDからDifyAppを取得
                                if app_id:
                                    dify_app = await prisma.difyapp.find_unique(
                                        where={
                                            'id': app_id
                                        }
                                    )
                                    if dify_app and dify_app.apiKey and dify_app.modeType == "title_generator":
                                        title_api_key_to_use = dify_app.apiKey
                                        print(f"[FAQ] タイトル生成に {dify_app.name} のAPIキーを使用します")

                        # aiohttpを使用してタイトル生成リクエストを送信
                        async with session.post(
                            'https://dify.p0x0q.com/v1/workflows/run',
                            headers={
                                'Authorization': f'Bearer {title_api_key_to_use}',
                                'Content-Type': 'application/json'
                            },
                            json={
                                'inputs': {
                                    'question': hearing_reason,
                                    'tenantId': ticket.tenantId,  # テナントIDを追加
                                    'userGroupId': ticket.userGroupId # ユーザーグループIDを追加
                                },
                                'response_mode': 'blocking',
                                'user': 'abc-123'
                            }
                        ) as response:
                            if response.status == 200:
                                response_json = await response.json()
                                response_data = response_json.get('data', {}).get('outputs', {})
                                hearing_ticket_title = response_data.get('title', '')
                            else:
                                print(f"[FAQ] Dify API (TICKET_TITLE_GENERATOR) エラー: ステータスコード {response.status}")
                                response_text = await response.text()
                                print(f"[FAQ] レスポンス内容: {response_text}")
                                print(f"[FAQ] リクエスト内容 (質問): {hearing_reason[:100]}...")

                        for i, hearing_email in enumerate(hearing_emails):
                            if i < len(hearing_real_names):
                                hearing_real_name = hearing_real_names[i]
                            else:
                                hearing_real_name = "不明"

                            # ヒアリング担当者のアカウント情報を取得
                            hearing_account = await prisma.account.find_first(
                                where={
                                    'email': hearing_email
                                }
                            )

                            if hearing_account:
                                # Create a new hearing ticket
                                hearing = await prisma.conversationhearing.create(
                                    data={
                                        'ticketId': ticket.id,
                                        'hearingAccountId': hearing_account.id,
                                        'createdAt': datetime.now(),
                                        'updatedAt': datetime.now(),
                                        'tenantId': ticket.tenantId,
                                        'accountId': ticket.accountId,
                                        'hearingReason': hearing_reason
                                    }
                                )

                                hearing_ids.append(hearing.id)

                                # Create a new conversationTicket for the hearing ticket
                                hearing_ticket = await prisma.conversationticket.create(
                                    data={
                                        'status': 'open',
                                        'aiStatus': 'human_waiting',
                                        'mode': 'hearing',
                                        'createdAt': datetime.now(),
                                        'updatedAt': datetime.now(),
                                        'tenantId': ticket.tenantId,
                                        'accountId': hearing_account.id,
                                        'hearingIds': [hearing.id],
                                        'title': hearing_ticket_title if hearing_ticket_title else "ヒアリング依頼",
                                        'isSlackReply': True,
                                        'slackChannelId': ticket.slackChannelId,  # 元の質問が来たSlackチャンネルIDを設定
                                        'slackThreadTs': ticket.slackThreadTs,    # 元の質問が来たSlackスレッドIDを設定
                                        'userGroupId': ticket.userGroupId        # ユーザーグループIDを設定
                                    }
                                )

                                # Add conversation for the hearing ticket
                                await prisma.conversation.create(
                                    data={
                                        'ticketId': hearing_ticket.id,
                                        'text': hearing_reason_with_mentions,
                                        'questionType': 'question',
                                        'role': 'assistant',
                                        'creator': 'ai',
                                        'createdAt': datetime.now(),
                                        'updatedAt': datetime.now(),
                                        'tenantId': hearing_ticket.tenantId,
                                        'accountId': hearing_ticket.accountId
                                    }
                                )

                                hearing_success_count += 1

                        # 元のチケットに対してヒアリング先リストを更新
                        if hearing_ids:
                            await prisma.conversationticket.update(
                                where={
                                    'id': ticket.id
                                },
                                data={
                                    'hearingIds': hearing_ids
                                }
                            )

                            # ヒアリングが完了したことを通知する
                            hearing_emails_str = ", ".join(hearing_emails)
                            await prisma.conversation.create(
                                data={
                                    'ticketId': ticket.id,
                                    'text': f"ヒアリング依頼が完了しました！対象者: {hearing_success_count}人 (メール: {hearing_emails_str})",
                                    'questionType': 'answer',
                                    'role': 'assistant',
                                    'creator': 'ai',
                                    'createdAt': datetime.now(),
                                    'updatedAt': datetime.now(),
                                    'tenantId': ticket.tenantId,
                                    'accountId': ticket.accountId
                                }
                            )
                        else: 
                            # アカウントがなかった場合は、元のチケット会話に対して、追加返答する
                            hearing_real_names_str = ", ".join(hearing_real_names)
                            hearing_emails_str = ", ".join(hearing_emails)
                            await prisma.conversation.create(
                                data={
                                    'ticketId': ticket.id,
                                    'text': f"ヒアリング先を見つけることができませんでした。生成AIの探索結果: 担当者: {hearing_real_names_str}, メール: {hearing_emails_str}, 理由: {recommend_reasoning}",
                                    'questionType': 'answer',
                                    'role': 'assistant',
                                    'creator': 'ai',
                                    'createdAt': datetime.now(),
                                    'updatedAt': datetime.now(),
                                    'tenantId': ticket.tenantId,
                                    'accountId': ticket.accountId
                                }
                            )

                        print(f"[FAQ] チケット {ticket.id} は {hearing_success_count}人へのヒアリングが必要です")

                    else:
                        # 未定義のresult_codeが返ってきた場合は、エラーとして処理
                        print(f"[FAQ] 未定義のresult_codeが返ってきました: {result_code}")
                        raise Exception(f"[FAQ] 未定義のresult_codeが返ってきました: {result_code}")
                    
                    # 処理完了のログを記録
                    await append_log_entry(prisma, conversation_id, "process", {
                        "ticket_id": ticket.id,
                        "status": "finished"
                    })

                else:
                    print(f"[FAQ] Dify API (FAQ_RESPONSE) エラー: ステータスコード {response.status}")
                    response_text = await response.text()
                    print(f"[FAQ] レスポンス内容: {response_text}")
                    print(f"[FAQ] レスポンス内容: {response.headers}")
                    print(f"[FAQ] リクエスト内容: {latest_question[:100]}...")
                    
                    # APIエラーをログに記録
                    await append_log_entry(prisma, conversation_id, "question_answer_generate_process", {
                        "status": "error",
                        "status_code": response.status,
                        "response_text": response_text[:500] if response_text else "",
                        "headers": dict(response.headers)
                    })

    except Exception as e:
        import traceback
        print(traceback.print_exc())
        print(f"[FAQ] Error in process_faq_ticket for ticket {ticket.id}: {str(e)}")
        
        try:
            # 例外情報をログに記録
            await append_log_entry(prisma, conversation_id, "exception", {
                "error_message": str(e),
                "traceback": traceback.format_exc(),
                "ticket_id": ticket.id
            })
        except Exception as log_error:
            # ログ記録自体が失敗した場合は標準出力のみに記録
            print(f"[FAQ] ログ記録に失敗: {str(log_error)}")
                            # エラーが発生した場合は、対象のconversationticketのaiStatusをerrorに更新
                    # また、conversationのtextを更新して、エラー内容を記録する
        await prisma.conversationticket.update(
            where={
                'id': ticket.id
            },
            data={
                'aiStatus': 'error'
            }
        )
        await prisma.conversation.update(
            where={
                'id': conversation_id
            },
            data={
                'text': f"エラーが発生しました:お手数ですが再度質問を行ってください。"
            }
        )

async def generate_search_keywords_and_filter_knowledge(prisma, query, tenant_id, ticket_id=None, user_group_id=None):
    """
    質問からキーワードを生成し、それらを使ってナレッジデータを部分一致検索する関数
    
    Args:
        prisma: Prismaクライアント
        query: 検索クエリ（ユーザーの質問）
        tenant_id: テナントID
        ticket_id: チケットID（オプション）
        user_group_id: ユーザーグループID（オプション）- 指定された場合、そのユーザーグループに関連するナレッジデータのみを返す
        
    Returns:
        filtered_knowledge_data: 検索キーワードに一致したナレッジデータのリスト
    """
    try:
        # APIキーの決定: チケットのmodeIdに紐づくDifyModeQuestionから適切なAPIキーを取得、なければデフォルトを使用
        keywords_api_key_to_use = DIFY_API_KEY_SEARCH_KEYWORDS_GENERATOR
        
        # チケットIDが指定されている場合、そのチケットに関連付けられたDifyAppを確認
        if ticket_id:
            ticket = await prisma.conversationticket.find_unique(
                where={
                    'id': ticket_id
                }
            )
            if ticket and ticket.modeId:
                dify_mode_question = await prisma.difymodequestion.find_unique(
                    where={
                        'id': ticket.modeId
                    }
                )
                if dify_mode_question:
                    # モードに基づいて適切なアプリIDを選択
                    app_id = None
                    if ticket.mode == 'hearing':
                        app_id = dify_mode_question.hearingAppId
                    elif ticket.mode == 'faq':
                        app_id = dify_mode_question.faqAppId
                    
                    # 選択されたアプリIDからDifyAppを取得
                    if app_id:
                        dify_app = await prisma.difyapp.find_unique(
                            where={
                                'id': app_id
                            }
                        )
                        if dify_app and dify_app.apiKey and dify_app.modeType == "search_keywords_generator":
                            keywords_api_key_to_use = dify_app.apiKey
                            print(f"[SEARCH] キーワード生成に {dify_app.name} のAPIキーを使用します")
                    
        # Difyを使ってキーワードを生成（aiohttpを使用）
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://dify.p0x0q.com/v1/workflows/run',
                headers={
                    'Authorization': f'Bearer {keywords_api_key_to_use}',
                    'Content-Type': 'application/json'
                },
                json={
                    'inputs': {
                        'q': query,
                        'tenantId': tenant_id,  # テナントIDを追加
                        'userGroupId': user_group_id # ユーザーグループIDを追加
                    },
                    'response_mode': 'blocking',
                    'user': 'abc-123'
                }
            ) as response:
                if response.status != 200:
                    response_text = await response.text()
                    print(f"[SEARCH] キーワード生成に失敗しました: {response.status} {response_text}")
                    print(f"[SEARCH] Dify API (SEARCH_KEYWORDS_GENERATOR) エラー: ステータスコード {response.status}")
                    print(f"[SEARCH] レスポンス内容: {response_text}")
                    print(f"[SEARCH] リクエスト内容 (クエリ): {query[:100]}...")
                    # キーワード生成に失敗した場合は全てのナレッジデータを返す
                    return await prisma.knowledgedata.find_many(
                        where={
                            'tenantId': tenant_id,
                        }
                    )
                
                # レスポンスからキーワードを取得
                response_json = await response.json()
                response_data = response_json.get('data', {}).get('outputs', {})
                keywords = response_data.get('keywords', [])
        
        if not keywords:
            ticket_info = f"ticketId: {ticket_id}, " if ticket_id else ""
            print(f"[SEARCH] キーワードが生成されませんでした。{ticket_info}query: {query}")
            # キーワードが生成されなかった場合も全てのナレッジデータを返す
            return await prisma.knowledgedata.find_many(
                where={
                    'tenantId': tenant_id,
                }
            )
        
        print(f"[SEARCH] 生成されたキーワード: {keywords}")
        
        # キーワードを使ったAND検索と出現頻度カウントによるナレッジデータの取得
        knowledge_occurrence_count = {}  # ナレッジデータIDとその出現回数を追跡
        all_found_knowledge = []  # 検索で見つかったすべてのナレッジデータ
        
        # キーワード数を徐々に減らしながら検索を行う
        found_enough_results = False  # 十分な結果が見つかったかのフラグ
        
        for i in range(len(keywords), 0, -1):
            current_keywords = keywords[:i]  # キーワードを後ろから減らしていく
            print(f"[SEARCH] 検索キーワード({i}個): {current_keywords}")
            
            # AND検索条件を作成
            and_conditions = []
            for keyword in current_keywords:
                and_conditions.append({
                    'OR': [
                        {'title': {'contains': keyword}},
                        {'data': {'contains': keyword}},
                        {'crawlerData': {'contains': keyword}},
                        {'storageFileData': {'contains': keyword}}
                    ]
                })
            
            # 検索条件を構築
            where_condition = {
                'AND': [
                    {'tenantId': tenant_id},
                    {'AND': and_conditions}
                ]
            }
            
            # ユーザーグループによるフィルタリング
            if user_group_id:
                # 特定のユーザーグループに関連付けられているナレッジデータのみに限定（全社共通は含めない）
                where_condition['AND'].append({'userGroupId': user_group_id})
                print(f"[SEARCH] ユーザーグループID {user_group_id} に関連するナレッジデータのみを検索します（全社共通のナレッジは含みません）")
            else:
                # user_group_idがnullの場合は、全社共通のナレッジデータ（userGroupIdがnull）のみをフィルタリング
                where_condition['AND'].append({'userGroupId': None})
                print("[SEARCH] ユーザーグループIDがnullのため、全社共通のナレッジデータのみを検索します")
            
            # AND検索でナレッジデータを取得
            current_results = await prisma.knowledgedata.find_many(
                where=where_condition
            )
            
            print(f"[SEARCH] 検索結果({i}個のキーワード): {len(current_results)}件のナレッジデータが見つかりました")
            
            # 検索結果の各ナレッジデータの出現回数をカウント
            for result in current_results:
                knowledge_id = result.id
                if knowledge_id in knowledge_occurrence_count:
                    knowledge_occurrence_count[knowledge_id] += 1
                else:
                    knowledge_occurrence_count[knowledge_id] = 1
                    all_found_knowledge.append(result)
            
            # 現時点で2回以上出現したナレッジデータがあるかチェック
            filtered_knowledge_data = [knowledge for knowledge in all_found_knowledge 
                                      if knowledge_occurrence_count[knowledge.id] >= 2]
            
            if filtered_knowledge_data:
                print(f"[SEARCH] 検索フェーズ({i}個のキーワード)で2回以上出現したナレッジデータが{len(filtered_knowledge_data)}件見つかりました。検索を終了します。")
                found_enough_results = True
                break
        
        # 2回以上出現したナレッジデータをフィルタリング（見つからなかった場合に備えて）
        if not found_enough_results:
            print("[SEARCH] 全ての検索フェーズが完了しました。")
            filtered_knowledge_data = [knowledge for knowledge in all_found_knowledge 
                                      if knowledge_occurrence_count[knowledge.id] >= 2]
            print(f"[SEARCH] 最終結果: 2回以上出現した{len(filtered_knowledge_data)}件のナレッジデータが採用されました")
        
        # 検索結果が0件の場合は全てのナレッジデータを返す（ユーザーグループでフィルタリング）
        if not filtered_knowledge_data:
            print("[SEARCH] 2回以上出現するナレッジデータが見つからなかったため、全てのデータを返します")
            where_condition = {
                'tenantId': tenant_id
            }
            
            # ユーザーグループによるフィルタリング
            if user_group_id:
                # 特定のユーザーグループに関連付けられているナレッジデータのみに限定（全社共通は含めない）
                where_condition['userGroupId'] = user_group_id
            else:
                # user_group_idがnullの場合は、全社共通のナレッジデータ（userGroupIdがnull）のみを対象にする
                where_condition['userGroupId'] = None
                
            return await prisma.knowledgedata.find_many(
                where=where_condition
            )
        
        return filtered_knowledge_data
    
    except Exception as e:
        import traceback
        print(traceback.print_exc())
        print(f"[SEARCH] キーワード検索中にエラーが発生しました: {str(e)}")
        # エラーが発生した場合は全てのナレッジデータを返す（ユーザーグループでフィルタリング）
        where_condition = {
            'tenantId': tenant_id
        }
        
        # ユーザーグループによるフィルタリング
        if user_group_id:
            where_condition['userGroupId'] = user_group_id
        else:
            # user_group_idがnullの場合は、全社共通のナレッジデータ（userGroupIdがnull）のみを対象にする
            where_condition['userGroupId'] = None
            
        return await prisma.knowledgedata.find_many(
            where=where_condition
        )

async def main():
    # 環境変数から最大並列数を取得（設定がなければデフォルト値を使用）
    max_faq_concurrent = int(os.environ.get('MAX_FAQ_CONCURRENT', 5))
    max_hearing_concurrent = int(os.environ.get('MAX_HEARING_CONCURRENT', 3))
    
    prisma = Prisma()
    await prisma.connect()
    print("[MAIN] プロセス開始: チケット処理サービスが起動しました")
    print(f"[MAIN] 最大並列数設定: FAQ={max_faq_concurrent}, Hearing={max_hearing_concurrent}")
    try:
        while True:
            # print("[MAIN] 処理サイクル開始")
            # FAQとヒアリング処理を並列実行
            await asyncio.gather(
                answer_faq_queued_tickets(prisma, max_faq_concurrent),
                answer_hearing_queued_tickets(prisma, max_hearing_concurrent)
            )
            # Slack返信処理（従来通り直列実行）
            await reply_to_slack_threads(prisma)
            # print("[MAIN] 処理サイクル完了、1秒待機")
            await asyncio.sleep(1)  # 1秒ごとにチェック
    finally:
        await prisma.disconnect()
        print("[MAIN] プロセス終了: チケット処理サービスが停止しました")

# Slackの返信キューを処理する関数
async def reply_to_slack_threads(prisma):
    """
    isSlackReplyがTrueで、以下の状態のチケットをSlackスレッドに返信する
    - 回答済み(aiStatus=answered)
    - ヒアリング中(aiStatus=hearing_queue)
    - ヒアリング待ち(aiStatus=human_waiting)
    - ヒアリングして回答された(aiStatus=fulfilled_answer)
    """
    try:
        # デバッグ: 検索前のすべてのチケット数を出力
        all_tickets = await prisma.conversationticket.count()
        # print(f"全チケット数: {all_tickets}")
        
        # デバッグ: isSlackReply=Trueのチケット数を出力
        slack_tickets = await prisma.conversationticket.count(
            where={
                'isSlackReply': True
            }
        )
        # print(f"isSlackReply=Trueのチケット数: {slack_tickets}")
        
        # デバッグ: slackChannelIdとslackThreadTsが存在するチケット数を出力
        slack_info_tickets = await prisma.conversationticket.count(
            where={
                'slackChannelId': {'not': None},
                'slackThreadTs': {'not': None}
            }
        )
        # print(f"Slack情報が存在するチケット数: {slack_info_tickets}")
        
        # デバッグ: 対象のaiStatusを持つチケット数を出力
        status_tickets = await prisma.conversationticket.count(
            where={
                'aiStatus': {
                    'in': ['answered', 'hearing_queue', 'human_waiting', 'fulfilled_answer']
                }
            }
        )
        # print(f"対象aiStatusを持つチケット数: {status_tickets}")
        
        # Slack返信フラグがTrueで対象状態のチケットを取得
        slack_reply_tickets = await prisma.conversationticket.find_many(
            where={
                'isSlackReply': True,
                'aiStatus': {
                    'in': ['answered', 'human_waiting', 'fulfilled_answer']  # hearing_queueを削除
                },
                'slackChannelId': {'not': None},
                'slackThreadTs': {'not': None}
            }
        )
        
        # print(f"[SLACK] 返信対象チケット数: {len(slack_reply_tickets)}件")
        
        # 全てのSlack認証情報を取得（複数のSlackツールに対応）
        slack_tools = await prisma.knowledgetool.find_many(
            where={
                'type': 'slack'
            }
        )
        
        if not slack_tools or len(slack_tools) == 0:
            # print("[SLACK] Slack認証情報が登録されていません。Slack返信をスキップします。")
            return
        
        # 有効なSlackツール情報を格納するリスト
        valid_slack_tools = []
        
        # 各Slackツールの認証情報を確認
        for slack_tool in slack_tools:
            try:
                auth_info = json.loads(slack_tool.authInfo)
                slack_token = auth_info.get("SLACK_API_TOKEN")
                
                if not slack_token:
                    print(f"[SLACK] ツールID {slack_tool.id}: Slack APIトークンが設定されていません。スキップします。")
                    continue
                
                # 有効なツールとして追加
                valid_slack_tools.append({
                    "tool": slack_tool,
                    "token": slack_token,
                    "headers": {
                        "Authorization": f"Bearer {slack_token}",
                        "Content-Type": "application/json; charset=utf-8"
                    }
                })
                
            except json.JSONDecodeError:
                print(f"[SLACK] ツールID {slack_tool.id}: 認証情報のJSONパースに失敗しました。スキップします。")
        
        if len(valid_slack_tools) == 0:
            print("[SLACK] 有効なSlack認証情報がありません。Slack返信をスキップします。")
            return
                
        # 同一スレッドへの重複送信を防ぐための辞書を作成
        processed_threads = {}  # {channel_id+thread_ts: メッセージ送信済みフラグ}
        
        # 共有セッションを作成
        async with aiohttp.ClientSession() as session:
            for ticket in slack_reply_tickets:
                # スレッドの一意のキーを作成（チャンネルID + スレッドタイムスタンプ）
                thread_key = f"{ticket.slackChannelId}_{ticket.slackThreadTs}"
                
                # 既に同じスレッドに送信済みかチェック
                if thread_key in processed_threads:
                    print(f"[SLACK] チケット {ticket.id} のスレッド {thread_key} には既にメッセージが送信されています。スキップします。")
                    
                    # 二重送信を防ぐため、isSlackReplyフラグを更新
                    await prisma.conversationticket.update(
                        where={
                            'id': ticket.id
                        },
                        data={
                            'isSlackReply': False
                        }
                    )
                    continue
                
                # 各チケットに対して最新のアシスタントメッセージを取得
                latest_conversations = await prisma.conversation.find_many(
                    where={
                        'ticketId': ticket.id,
                        'role': 'assistant'
                    },
                    order={
                        'createdAt': 'desc'
                    },
                    take=1
                )
                
                # 回答メッセージがない場合はスキップ
                if not latest_conversations or len(latest_conversations) == 0:
                    print(f"[SLACK] チケット {ticket.id} に回答メッセージがありません。スキップします。")
                    continue
                
                # 最新の回答を取得
                latest_answer = latest_conversations[0]
                
                # メッセージのプレフィックスを状態に基づいて設定
                message_prefix = ""
                if ticket.aiStatus == "human_waiting":
                    message_prefix = "【ヒアリング待ち】"
                elif ticket.aiStatus == "fulfilled_answer":
                    message_prefix = "【ヒアリング完了】"
                
                # アカウント情報を取得して、ユーザー名を補足する
                account = await prisma.account.find_first(
                    where={
                        'id': ticket.accountId
                    }
                )
                
                user_name = "不明なユーザー"
                if account and account.name:
                    user_name = account.name
                
                # チケットのモードに基づいてメッセージ形式を決定
                original_user_mention = ""
                
                # ヒアリングモードの場合のみ、元の質問者のメンションを追加
                if ticket.mode == 'hearing':
                    # 質問者の情報を取得してメンション設定
                    if account:
                        if account.slackUserId:
                            # リレーション先からSlackの実際のユーザーIDを取得
                            slack_user = await prisma.knowledgeslackuser.find_first(
                                where={
                                    'id': account.slackUserId
                                }
                            )
                            if slack_user and slack_user.slackId:
                                original_user_mention = f"<@{slack_user.slackId}> さんからの質問への回答です。\n\n"
                            else:
                                original_user_mention = f"（未連携ユーザー）@{account.name}さんからの質問への回答です。\n\n"
                        else:
                            # 未連携の場合は名前だけ表示
                            original_user_mention = f"（未連携ユーザー）@{account.name}さんからの質問への回答です。\n\n"
                
                # Slack用にフッター情報を追加した回答テキストを作成
                answer_with_footer = f"{message_prefix}{original_user_mention}{latest_answer.text}\n\n--\nこの回答は{user_name}さんへの回答です。\n詳細はこちら：{APP_BASE_URL}/?ticketId={ticket.id}"
                
                # メッセージ送信パラメータを作成
                params = {
                    "channel": ticket.slackChannelId,
                    "thread_ts": ticket.slackThreadTs,
                    "text": answer_with_footer
                }
                
                # 送信成功フラグ
                sent_successfully = False
                
                # すべてのSlackツールを使用して送信を試みる
                for slack_tool_info in valid_slack_tools:
                    try:
                        async with session.post(
                            "https://slack.com/api/chat.postMessage",
                            headers=slack_tool_info["headers"],
                            json=params
                        ) as response:
                            response_json = await response.json()
                            if response.status == 200 and response_json.get('ok', False):
                                print(f"[SLACK] チケット {ticket.id} の{ticket.aiStatus}状態のメッセージをSlackに送信しました。(ツールID: {slack_tool_info['tool'].id})")
                                sent_successfully = True
                                break  # 成功したらループを抜ける
                            else:
                                error_message = response_json.get('error', 'unknown error')
                                print(f"[SLACK] Slackへの返信送信エラー (ツールID: {slack_tool_info['tool'].id}): {error_message}")
                                
                                # channel_not_foundエラーは別のツールで試す価値がある
                                if error_message != 'channel_not_found' and error_message != 'not_in_channel':
                                    # 認証エラーや他の重大なエラーの場合は他のツールも試さない
                                    break
                    
                    except Exception as e:
                        print(f"[SLACK] Slack返信処理中に例外が発生 (ツールID: {slack_tool_info['tool'].id}): {str(e)}")
                
                # いずれかのツールで送信に成功した場合
                if sent_successfully:
                    # 送信済みとしてマーク
                    processed_threads[thread_key] = True
                    
                    # 返信フラグをFalseに更新（二重送信防止）
                    await prisma.conversationticket.update(
                        where={
                            'id': ticket.id
                        },
                        data={
                            'isSlackReply': False
                        }
                    )
    
    except Exception as e:
        import traceback
        print(traceback.print_exc())
        print(f"[SLACK] Slack返信キュー処理中にエラーが発生しました: {str(e)}")
        
if __name__ == "__main__":
    asyncio.run(main())
