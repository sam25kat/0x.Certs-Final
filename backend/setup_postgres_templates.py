#!/usr/bin/env python3

import os
import asyncio
from database import db_manager

async def setup_postgres_templates():
    """Manually set up PostgreSQL templates table and migrate data"""

    print("Setting up PostgreSQL certificate_templates table...")

    # Create the table manually
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS certificate_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        file_data BYTEA NOT NULL,
        file_type VARCHAR(50) DEFAULT 'application/pdf',
        uploaded_by VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE
    )
    """

    try:
        await db_manager.execute_query(create_table_sql)
        print("Table created successfully!")
    except Exception as e:
        print(f"Error creating table: {e}")
        return

    # Check if templates already exist
    check_sql = "SELECT COUNT(*) FROM certificate_templates"
    try:
        result = await db_manager.execute_query(check_sql, fetch=True)
        count = result[0][0] if result else 0
        print(f"Current templates in database: {count}")

        if count > 0:
            print("Templates already exist. Listing them:")
            list_sql = "SELECT id, name, display_name, is_default FROM certificate_templates WHERE is_active = true"
            templates = await db_manager.execute_query(list_sql, fetch=True)
            for template in templates:
                default_marker = " (DEFAULT)" if template[3] else ""
                print(f"  - {template[2]}{default_marker} (ID: {template[0]}, name: {template[1]})")
            return
    except Exception as e:
        print(f"Error checking existing templates: {e}")

    # Migrate templates from file system
    template_dir = "../certificate_template"
    if not os.path.exists(template_dir):
        print("No template directory found.")
        return

    template_files = [f for f in os.listdir(template_dir) if f.lower().endswith('.pdf')]
    print(f"Found {len(template_files)} template files to migrate:")

    for i, filename in enumerate(template_files):
        try:
            file_path = os.path.join(template_dir, filename)
            print(f"Migrating {filename}...")

            # Read file data
            with open(file_path, 'rb') as f:
                file_data = f.read()

            # Generate template info
            name = filename.replace('.pdf', '').lower().replace(' ', '_')
            display_name = filename.replace('.pdf', '').replace('_', ' ').title()
            is_default = i == 0 or 'default' in filename.lower()

            # Insert into database
            insert_sql = """
            INSERT INTO certificate_templates (name, display_name, description, file_data, file_type, uploaded_by, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """

            result = await db_manager.execute_query(
                insert_sql,
                [name, display_name, f"Migrated from {filename}", file_data, "application/pdf", "system_migration", is_default],
                fetch=True
            )

            if result:
                template_id = result[0][0]
                print(f"  SUCCESS: {filename} migrated as '{name}' (ID: {template_id})")
            else:
                print(f"  ERROR: Failed to get ID for {filename}")

        except Exception as e:
            print(f"  ERROR: Failed to migrate {filename}: {e}")

    # Verify migration
    print("\nVerifying migration:")
    try:
        list_sql = "SELECT id, name, display_name, is_default FROM certificate_templates WHERE is_active = true ORDER BY is_default DESC, display_name ASC"
        templates = await db_manager.execute_query(list_sql, fetch=True)
        for template in templates:
            default_marker = " (DEFAULT)" if template[3] else ""
            print(f"  - {template[2]}{default_marker} (ID: {template[0]}, name: {template[1]})")
    except Exception as e:
        print(f"Error verifying migration: {e}")

    print("PostgreSQL template setup completed!")

if __name__ == "__main__":
    asyncio.run(setup_postgres_templates())