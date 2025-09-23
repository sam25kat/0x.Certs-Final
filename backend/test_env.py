#!/usr/bin/env python3

import os
import asyncio
# Override database URL for testing
os.environ["DATABASE_URL"] = "sqlite:///./certificates.db"

from template_manager import template_manager
from certificate_generator import CertificateGenerator

async def test_with_sqlite():
    """Test template functionality with SQLite"""

    print("Testing with SQLite database...")

    # Test get all templates
    print("\n1. Getting all templates:")
    templates = await template_manager.get_all_templates()
    for template in templates:
        default_marker = " (DEFAULT)" if template.get('is_default') else ""
        print(f"  - {template['display_name']}{default_marker} (ID: {template['id']})")

    if templates:
        # Test certificate generation with first template
        print(f"\n2. Testing certificate generation with template '{templates[0]['name']}':")
        generator = CertificateGenerator()

        result = await generator.generate_certificate(
            participant_name="Test User",
            event_name="SQLite Template Test",
            event_date="2025-01-15",
            participant_email="test@example.com",
            template_filename=templates[0]['name']
        )

        if result["success"]:
            print(f"  SUCCESS: Certificate generated - {result['filename']}")
            print(f"  File path: {result['file_path']}")
        else:
            print(f"  ERROR: {result['error']}")

    print("\nSQLite testing completed!")

if __name__ == "__main__":
    asyncio.run(test_with_sqlite())