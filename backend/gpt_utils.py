#!/usr/bin/env python3
"""
Standalone Azure OpenAI Integration

This file contains all the necessary code to test Azure OpenAI integration
 API support. It includes sample requests and response handling.

Usage:
    call get_gpt_response method

openai==1.99.9
"""

import os
import sys
import json
import time
from typing import Dict, List, Any, Generator, Tuple
from openai import AzureOpenAI
from openai.types.chat import ChatCompletionChunk
import re

 # Azure OpenAI configuration - HARDCODED(these values will be constant)
AZURE_OPENAI_ENDPOINT = 'https://cloobot-openai-eastus2-v2.openai.azure.com/'
AZURE_OPENAI_API_KEY = 'E0rntmPkUeWJNvOumeZahJXHHhvGsAVfRt3oeuZ4MIlmm4vmpERhJQQJ99BFACHYHv6XJ3w3AAABACOGyD6J'
AZURE_OPENAI_API_VERSION = '2025-01-01-preview'
#################################
OPENAI_ENGINE_NAME_GPT4_32K = "Cloobot-32K-GPT4"

AZURE_OPENAI_MODEL_4O_MINI = 'gpt-4o-mini-eastus2'
AZURE_OPENAI_TEMPERATURE = 1.0
AZURE_OPENAI_MAX_TOKENS = 4000
AZURE_ENGINE_NAME_OPEN_AI_GPT_5_MINI_EUS2 = "gpt-5-mini-eus2"
AZURE_ENGINE_NAME_OPEN_AI_GPT_5_MINI_SC = "gpt-5-mini-sc"

GPT_4O_12K = 4
OPENAI_ENGINE_NAME_GPT4O_12K = "brd_image_indexing"

GPT_5_MINI = 5
OPENAI_ENGINE_NAME_GPT_5_MINI = "gpt-5-mini"

GPT_5 = 6
OPENAI_ENGINE_NAME_GPT_5 = "gpt-5"

GPT_5_NANO = 8
OPENAI_ENGINE_NAME_GPT_5_NANO = "gpt-5-nano"

GPT_5_CHAT = 9
OPENAI_ENGINE_NAME_GPT_5_CHAT = "gpt-5-chat"

OPEN_AI_GPT_4o = 7
OPENAI_ENGINE_NAME_OPEN_AI_GPT_4o = "gpt-4o-2024-08-06"

# this variable(AZURE_OPENAI_MODEL) decides the model used
AZURE_OPENAI_MODEL = AZURE_OPENAI_MODEL_4O_MINI


# if jsontype == JSON_OBJ:
#     output = json.loads(extract_json_obj_from_string(output_string.strip().replace("\n","").replace("\\'","'")))
# elif jsontype == JSON_LIST:
#     output = json.loads(extract_json_obj_list_from_string(output_string.strip().replace("\n","").replace("\\'","'")))
# else:
#     output = output_string

def extract_json_obj_from_string(text_with_json):
    # print_statement('ejofs:r1:',text_with_json)
    json_obj_str = ""
    re_str = r'\{.*\}'
    stats_re = re.compile(re_str, re.MULTILINE | re.DOTALL)

    for match in stats_re.findall(text_with_json):
        # print_statement(match)
        json_obj_str = match
        # print_statement('ejofs:r2:',match)
        break
    
    return json_obj_str

def extract_json_obj_list_from_string(text_with_json):
    # print_statement('ejofs:r1:',text_with_json)
    json_obj_str = ""
    re_str = r'\[.*\]'
    stats_re = re.compile(re_str, re.MULTILINE | re.DOTALL)
    for match in stats_re.findall(text_with_json):
        # print_statement(match)
        json_obj_str = match
        # print_statement('ejofs:r2:',match)
        break
    return json_obj_str

class AzureOpenAITester:
    """Standalone Azure OpenAI integration """
    
    def __init__(self):
        """Initialize the tester with Azure OpenAI configurations"""
        self.clients = {}
        self.api_configs = {}
        self._initialize_configs()
        self._initialize_clients()
    
    def _initialize_configs(self) -> None:
        """Initialize Azure OpenAI API configurations"""
        # GPT-5 Mini EUS2 Configuration
        self.api_configs[AZURE_OPENAI_MODEL] = {
            "azure_endpoint": AZURE_OPENAI_ENDPOINT,
            "api_version": AZURE_OPENAI_API_VERSION,
            "api_key": AZURE_OPENAI_API_KEY
        }
    
    def _initialize_clients(self) -> None:
        """Initialize Azure OpenAI clients for each model"""
        for model_name, config in self.api_configs.items():
            try:
                client = AzureOpenAI(
                    azure_endpoint=config["azure_endpoint"],
                    api_version=config["api_version"],
                    api_key=config["api_key"]
                )
                self.clients[model_name] = client
                print(f"✅ Initialized client for {model_name}")
            except Exception as e:
                print(f"❌ Failed to initialize client for {model_name}: {e}")
    
    def get_gpt_response(self,model_name, messages: List[Dict[str, str]]) -> str:
        """
        Test non-streaming request to Azure OpenAI
        
        Args:
            model_name: Name of the model to use
            messages: List of message dictionaries
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            
        Returns:
            str: Complete response
        """

        client = self.clients[model_name]
        
        try:
            print(f"🚀 Starting non-streaming request to {model_name}")
            
            # Prepare API call parameters
            api_params = {
                "model": model_name,
                "messages": messages,
                "stream": False
            }
            
            # Make the API call
            response = client.chat.completions.create(**api_params)
            
            if response.choices and len(response.choices) > 0:
                content = response.choices[0].message.content
                print(f"✅ Non-streaming request to {model_name} completed successfully")
                return content
            else:
                return "❌ No response content received"
                
        except Exception as e:
            error_msg = f"❌ Error in non-streaming request to {model_name}: {str(e)}"
            print(error_msg)
            return error_msg
    
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        return list(self.clients.keys())


def main():
    """Main test function"""
    print("🧪 Azure OpenAI Integration")
    print("=" * 60)
    
    # Initialize tester
    tester = AzureOpenAITester()
    
    # Sample test messages
    sample_messages = [
        {"role": "system", "content": "You are a helpful AI assistant. Provide clear and concise responses."},
        {"role": "user", "content": "Explain what Azure OpenAI APIs. Keep it brief but informative."}
    ]
    
    
    print("API response:")
    response=  tester.get_gpt_response(AZURE_OPENAI_MODEL,sample_messages)

    
    print(f"\n📝 Complete response collected: {response} characters")
    print("\n🎉 Testing completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()