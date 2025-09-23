#!/usr/bin/env python3

import asyncio
from template_manager import template_manager
from certificate_generator import CertificateGenerator

async def test_postgres_templates():
    """Test template functionality with PostgreSQL"""

    print("Testing template functionality with PostgreSQL...")

    # Test get all templates
    print("\n1. Getting all templates from PostgreSQL:")
    try:
        templates = await template_manager.get_all_templates()
        if templates:
            for template in templates:
                default_marker = " (DEFAULT)" if template.get('is_default') else ""
                print(f"  - {template['display_name']}{default_marker} (ID: {template['id']})")
        else:
            print("  No templates found")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Test get default template
    print("\n2. Getting default template:")
    try:
        default_template = await template_manager.get_default_template()
        if default_template:
            print(f"  Default: {default_template['display_name']} (ID: {default_template['id']})")
        else:
            print("  No default template found")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Test certificate generation with database template
    print("\n3. Testing certificate generation with database template:")
    try:
        generator = CertificateGenerator()

        result = await generator.generate_certificate(
            participant_name="Test User",
            event_name="PostgreSQL Template Test",
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

    print("\nPostgreSQL template testing completed!")

if __name__ == "__main__":
    asyncio.run(test_postgres_templates())