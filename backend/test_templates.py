#!/usr/bin/env python3

import asyncio
from template_manager import template_manager

async def test_templates():
    """Test template database functionality"""

    print("Testing template database functionality...")

    # Test get all templates
    print("\n1. Getting all templates:")
    templates = await template_manager.get_all_templates()
    for template in templates:
        default_marker = " (DEFAULT)" if template.get('is_default') else ""
        print(f"  - {template['display_name']}{default_marker} (ID: {template['id']})")

    # Test get default template
    print("\n2. Getting default template:")
    default_template = await template_manager.get_default_template()
    if default_template:
        print(f"  Default: {default_template['display_name']} (ID: {default_template['id']})")
    else:
        print("  No default template found")

    # Test get template by name
    print("\n3. Getting template by name 'default':")
    template_by_name = await template_manager.get_template_by_name('default')
    if template_by_name:
        print(f"  Found: {template_by_name['display_name']} (ID: {template_by_name['id']})")
    else:
        print("  Template 'default' not found")

    # Test creating temp file
    print("\n4. Testing temp file creation:")
    temp_file_path = await template_manager.create_temp_file('default')
    if temp_file_path:
        print(f"  Temp file created: {temp_file_path}")
        # Check if file exists
        import os
        if os.path.exists(temp_file_path):
            file_size = os.path.getsize(temp_file_path)
            print(f"  File size: {file_size} bytes")
            # Clean up
            os.unlink(temp_file_path)
            print("  Temp file cleaned up")
        else:
            print("  ERROR: Temp file not found")
    else:
        print("  ERROR: Failed to create temp file")

    print("\nTemplate testing completed!")

if __name__ == "__main__":
    asyncio.run(test_templates())