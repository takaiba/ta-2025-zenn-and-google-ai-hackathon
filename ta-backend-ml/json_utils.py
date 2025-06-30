import json


# stringからjsonの範囲を検知し、jsonとしてデコードして返すプログラム
def detect_json_str(text):
    # jsonの範囲を検知する
    start = text.find("{")
    end = text.rfind("}") + 1
    json_str = text[start:end]

    # jsonとしてデコードする
    try:
        json_obj = json.loads(json_str)
    except json.JSONDecodeError:
        print("json decode error")
        return None

    return json_obj
