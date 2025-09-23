#!/usr/bin/env python3

import os
import asyncio
from dotenv import load_dotenv

# Load environment first
load_dotenv()

from template_manager import template_manager
from certificate_generator import CertificateGenerator

async def final_template_test():
    """Final comprehensive test of PostgreSQL template functionality"""

    print("Final template functionality test with PostgreSQL...")
    print(f"Database URL: {os.getenv('DATABASE_URL')}")

    # Test 1: Get all templates
    print("\n1. Getting all templates:")
    try:
        templates = await template_manager.get_all_templates()
        if templates:
            print(f"  Found {len(templates)} templates:")
            for template in templates:
                default_marker = " (DEFAULT)" if template.get('is_default') else ""
                print(f"    - {template['display_name']}{default_marker} (ID: {template['id']}, name: {template['name']})")
        else:
            print("  No templates found")
    except Exception as e:
        print(f"  ERROR: {e}")
        return

    # Test 2: Create temp file
    print("\n2. Testing temp file creation:")
    try:
        temp_path = await template_manager.create_temp_file('default')
        if temp_path:
            print(f"  SUCCESS: Temp file created at {temp_path}")
            file_size = os.path.getsize(temp_path)
            print(f"  File size: {file_size} bytes")
            os.unlink(temp_path)  # Clean up
            print("  Temp file cleaned up")
        else:
            print("  ERROR: Failed to create temp file")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Test 3: Certificate generation
    print("\n3. Testing certificate generation with database template:")
    try:
        generator = CertificateGenerator()
        result = await generator.generate_certificate(
            participant_name="Test User",
            event_name="PostgreSQL Final Test",
            event_date="2025-01-15",
            participant_email="test@example.com",
            template_filename="default"
        )

        if result["success"]:
            print(f"  SUCCESS: Certificate generated - {result['filename']}")
            print(f"  File path: {result['file_path']}")
        else:
            print(f"  ERROR: {result['error']}")
    except Exception as e:
        print(f"  ERROR: {e}")

    print("\nFinal template test completed!")

if __name__ == "__main__":
    asyncio.run(final_template_test())