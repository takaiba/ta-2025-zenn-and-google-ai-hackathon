from attrdict import AttrDict
from django.http import JsonResponse


async def gemini_1_5_flash_query(prompt):
    if len(prompt) == 0:
        return JsonResponse(
            {"choices": [{"message": {"content": "Please provide a prompt"}}]}
        )

    examples = []
    input_text = ""
    output_text = ""

    import vertexai
    from vertexai.generative_models import GenerativeModel

    vertexai.init(project="ta-project-and-dot", location="asia-northeast1")
    # chat_model = ChatModel.from_pretrained("chat-bison@001")

    generative_multimodal_model = GenerativeModel("gemini-1.5-flash-001")

    # prompt: [{'role': 'system', 'content': '\nYou are ChatGPT, a large language model trained by OpenAI.\nKnowledge cutoff: 2021-09\nCurrent model: palm2-chat-bison\nCurrent time: 2023/9/10 23:39:13\n'}, {'role': 'user', 'content': 'これはテストです。'}]
    messages = []
    for p in prompt:
        # print("p", p)
        role = p["role"]
        content = p["content"]

        # こちらの処理を追加しないと、APIエラーになる(空ではいけない)
        if role == "" or content == "":
            continue

        # 現状、ロールがなさそうなので、roleは無視して全て配列で格納する
        messages.append(content)

    # print("messages", messages)

    # 非同期処理によるGeminiレスポンス待ち
    gemini_response = await generative_multimodal_model.generate_content_async(messages)

    # print(response)
    response = {
        "choices": [{"message": {"content": gemini_response.text}}],
    }

    # 辞書型だとドットアクセスできないので、AttrDictに変換
    return AttrDict(response)
