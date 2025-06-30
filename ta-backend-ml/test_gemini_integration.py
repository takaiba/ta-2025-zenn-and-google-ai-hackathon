#!/usr/bin/env python3
"""
Test script to verify Gemini API integration
"""

import os
import sys
import json

# Add project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

# Setup Django
import django
django.setup()

# Now import our modules
from project.app.workers.test_executor import TestExecutor
from project.app.workers.bug_analyzer import BugAnalyzer
from project.app.workers.scenario_generator import ScenarioGenerator
from prisma import Prisma

def test_gemini_integration():
    """Test that all workers can initialize with Gemini API"""
    print("Testing Gemini API integration...")
    
    # Check environment
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return False
    
    print(f"✅ GEMINI_API_KEY found: {api_key[:10]}...")
    
    # Test imports
    try:
        import google.generativeai as genai
        print("✅ google-generativeai package imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import google-generativeai: {e}")
        return False
    
    # Test API configuration
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        print("✅ Gemini API configured successfully")
        
        # Test a simple generation
        response = model.generate_content("Say 'Hello from Gemini!'")
        print(f"✅ Gemini response: {response.text[:50]}...")
    except Exception as e:
        print(f"❌ Failed to configure/test Gemini API: {e}")
        return False
    
    # Test worker initialization (without Prisma for simplicity)
    print("\nTesting worker classes...")
    
    # Mock Prisma for testing
    class MockPrisma:
        pass
    
    mock_prisma = MockPrisma()
    
    try:
        # Test TestExecutor
        executor = TestExecutor(mock_prisma)
        print("✅ TestExecutor initialized with Gemini")
        
        # Test BugAnalyzer
        analyzer = BugAnalyzer(mock_prisma)
        print("✅ BugAnalyzer initialized with Gemini")
        
        # Test ScenarioGenerator
        generator = ScenarioGenerator(mock_prisma)
        print("✅ ScenarioGenerator initialized with Gemini")
        
    except Exception as e:
        print(f"❌ Failed to initialize workers: {e}")
        return False
    
    print("\n🎉 All Gemini API integration tests passed!")
    return True

if __name__ == "__main__":
    success = test_gemini_integration()
    sys.exit(0 if success else 1)