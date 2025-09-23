#!/usr/bin/env python3

import requests
import os

def test_template_upload():
    """Test template upload endpoint"""

    url = "http://localhost:8000/templates/upload"

    # Test with a sample PDF file
    template_file = "../certificate_template/default.pdf"
    if not os.path.exists(template_file):
        print("Default template file not found for testing")
        return

    # Prepare form data
    files = {
        'file': ('test_template.pdf', open(template_file, 'rb'), 'application/pdf')
    }

    data = {
        'name': 'test_template',
        'display_name': 'Test Template',
        'description': 'Test template upload',
        'is_default': 'false'
    }

    # Add session token as query parameter
    params = {
        'session_token': 'test_token'  # You'll need a valid token
    }

    try:
        response = requests.post(url, files=files, data=data, params=params)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 422:
            print("Validation error - check the request format")
        elif response.status_code == 401:
            print("Authentication error - need valid session token")
        elif response.status_code == 200:
            print("Success!")
        else:
            print(f"Unexpected status code: {response.status_code}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        files['file'][1].close()

if __name__ == "__main__":
    test_template_upload()