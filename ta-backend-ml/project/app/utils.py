TOKEN = "39069151-81e1-4725-bcf8-1b0a65ae6b9c"
MODEL_GEMINI_FLASH= "gemini-1.5-flash-002"
MODEL_GEMINI_PRO = "gemini-1.5-pro-002"
MODEL_GEMINI_FLASH_EXPERIMENTAL = "gemini-flash-experimental"
MODEL_GEMINI_PRO_EXPERIMENTAL = "gemini-pro-experimental"
MODEL = MODEL_GEMINI_FLASH

LOCATION = "us-central1"
LOCATION_EXPERIMENTAL = "us-central1"

import os
import json
import base64
import hashlib
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import vertexai
from vertexai.generative_models import GenerativeModel, Part, SafetySetting
import sys

sys.path.append("/app")

from . import utils

def detect_json_str(text):
    # jsonの範囲を検知する
    start = text.find("{")
    end = text.rfind("}") + 1
    json_str = text[start:end]
    
    try:
        json_obj = json.loads(json_str)
    except json.JSONDecodeError as e:
        # print("json decode error")
        return None
    
    return json_obj
