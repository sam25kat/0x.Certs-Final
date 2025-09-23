#!/usr/bin/env python3

import os
import asyncio
from template_manager import template_manager
from database import init_database_tables

async def migrate_templates():
    """Migrate existing template files to database"""

    # Initialize database tables first
    await init_database_tables()

    # Path to existing templates
    template_dir = "../certificate_template"

    if not os.path.exists(template_dir):
        print("No template directory found. Creating database table only.")
        return

    print(f"Migrating templates from {template_dir} to database...")

    # Get list of PDF files in template directory
    template_files = []
    for filename in os.listdir(template_dir):
        if filename.lower().endswith('.pdf'):
            template_files.append(filename)

    if not template_files:
        print("No PDF template files found to migrate.")
        return

    print(f"Found {len(template_files)} template files to migrate:")
    for filename in template_files:
        print(f"  - {filename}")

    migrated_count = 0
    failed_count = 0

    for filename in template_files:
        try:
            file_path = os.path.join(template_dir, filename)

            # Read file data
            with open(file_path, 'rb') as f:
                file_data = f.read()

            # Generate template name and display name
            name = filename.replace('.pdf', '').lower().replace(' ', '_')
            display_name = filename.replace('.pdf', '').replace('_', ' ').title()

            # Set first template as default, or if filename contains 'default'
            is_default = (migrated_count == 0) or ('default' in filename.lower())

            # Create template in database
            result = await template_manager.create_template(
                name=name,
                display_name=display_name,
                file_data=file_data,
                file_type="application/pdf",
                description=f"Migrated from {filename}",
                uploaded_by="system_migration",
                is_default=is_default
            )

            if result["success"]:
                print(f"SUCCESS: Successfully migrated: {filename} (ID: {result['template_id']})")
                migrated_count += 1
            else:
                print(f"ERROR: Failed to migrate {filename}: {result['error']}")
                failed_count += 1

        except Exception as e:
            print(f"ERROR: Error migrating {filename}: {str(e)}")
            failed_count += 1

    print(f"\nMigration completed:")
    print(f"  Successfully migrated: {migrated_count}")
    print(f"  Failed: {failed_count}")

    if migrated_count > 0:
        print(f"\nAll templates are now stored in the database.")
        print(f"   You can safely backup and remove the {template_dir} directory if desired.")
        print(f"   The application will now use database templates exclusively.")

    # Show migrated templates
    if migrated_count > 0:
        print("\nMigrated templates:")
        templates = await template_manager.get_all_templates()
        for template in templates:
            default_marker = " (DEFAULT)" if template.get('is_default') else ""
            print(f"  - {template['display_name']}{default_marker} (ID: {template['id']})")

async def main():
    """Main migration function"""
    print("Starting template migration to database...")
    await migrate_templates()
    print("Migration process completed!")

if __name__ == "__main__":
    asyncio.run(main())