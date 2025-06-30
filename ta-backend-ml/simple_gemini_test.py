#!/usr/bin/env python3
"""
Simple test to verify Gemini API is working
"""

import os
import google.generativeai as genai

# Get API key
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("❌ GEMINI_API_KEY not found")
    exit(1)

print(f"✅ GEMINI_API_KEY found: {api_key[:10]}...")

# Configure API
try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    print("✅ Gemini API configured")
    
    # Test generation
    response = model.generate_content("Return exactly: 'Gemini API is working!'")
    print(f"✅ Response: {response.text}")
    print("\n🎉 Gemini API integration successful!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)