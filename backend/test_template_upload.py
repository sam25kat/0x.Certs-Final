#!/usr/bin/env python3

import requests
import os
import json

def test_template_upload():
    """Test the template upload functionality"""

    base_url = "http://localhost:8000"

    # Test 1: Debug endpoint
    print("Testing debug endpoint...")
    template_file = "../certificate_template/default.pdf"

    if not os.path.exists(template_file):
        print(f"Template file not found: {template_file}")
        return

    try:
        # Test debug endpoint first
        with open(template_file, 'rb') as f:
            files = {'file': ('test_debug.pdf', f, 'application/pdf')}
            data = {
                'name': 'test_debug_template',
                'display_name': 'Test Debug Template',
                'description': 'Debug test',
                'is_default': 'false'
            }

            response = requests.post(f"{base_url}/templates/upload/debug", files=files, data=data)
            print(f"Debug endpoint - Status: {response.status_code}")
            print(f"Debug response: {response.text}")

        # Test 2: Actual upload endpoint
        print("\nTesting actual upload endpoint...")
        with open(template_file, 'rb') as f:
            files = {'file': ('test_upload.pdf', f, 'application/pdf')}
            data = {
                'name': 'test_upload_template',
                'display_name': 'Test Upload Template',
                'description': 'Actual upload test',
                'is_default': 'false'
            }

            response = requests.post(f"{base_url}/templates/upload", files=files, data=data)
            print(f"Upload endpoint - Status: {response.status_code}")
            print(f"Upload response: {response.text}")

        # Test 3: Auto-generate name (minimal data)
        print("\nTesting with minimal data (auto-generate names)...")
        with open(template_file, 'rb') as f:
            files = {'file': ('My New Template.pdf', f, 'application/pdf')}

            response = requests.post(f"{base_url}/templates/upload", files=files)
            print(f"Minimal data - Status: {response.status_code}")
            print(f"Minimal response: {response.text}")

        # Test 4: List templates to see if uploads worked
        print("\nListing all templates...")
        response = requests.get(f"{base_url}/templates")
        print(f"List templates - Status: {response.status_code}")
        if response.status_code == 200:
            templates_data = response.json()
            print(f"Total templates: {len(templates_data.get('templates', []))}")
            for template in templates_data.get('templates', []):
                print(f"  - {template.get('display_name')} (ID: {template.get('id')})")

    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    test_template_upload()