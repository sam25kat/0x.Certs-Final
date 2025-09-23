#!/usr/bin/env python3

import asyncio
from certificate_generator import CertificateGenerator

async def test_certificate_generation():
    """Test certificate generation with database templates"""

    print("Testing certificate generation with database templates...")

    generator = CertificateGenerator()

    # Test with default template
    print("\n1. Testing with default template:")
    result = await generator.generate_certificate(
        participant_name="Test User",
        event_name="Database Template Test",
        event_date="2025-01-15",
        participant_email="test@example.com",
        template_filename="default"
    )

    if result["success"]:
        print(f"  SUCCESS: Certificate generated - {result['filename']}")
        print(f"  File path: {result['file_path']}")
    else:
        print(f"  ERROR: {result['error']}")

    # Test with specific template name
    print("\n2. Testing with kodeus_template:")
    result2 = await generator.generate_certificate(
        participant_name="Test User 2",
        event_name="Kodeus Template Test",
        event_date="2025-01-15",
        participant_email="test2@example.com",
        template_filename="kodeus_template"
    )

    if result2["success"]:
        print(f"  SUCCESS: Certificate generated - {result2['filename']}")
        print(f"  File path: {result2['file_path']}")
    else:
        print(f"  ERROR: {result2['error']}")

    # Test with fallback to default
    print("\n3. Testing with non-existent template (should fallback):")
    result3 = await generator.generate_certificate(
        participant_name="Test User 3",
        event_name="Fallback Test",
        event_date="2025-01-15",
        participant_email="test3@example.com",
        template_filename="nonexistent_template"
    )

    if result3["success"]:
        print(f"  SUCCESS: Certificate generated with fallback - {result3['filename']}")
        print(f"  File path: {result3['file_path']}")
    else:
        print(f"  ERROR: {result3['error']}")

    print("\nCertificate generation testing completed!")

if __name__ == "__main__":
    asyncio.run(test_certificate_generation())