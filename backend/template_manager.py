import os
import tempfile
from typing import Optional, List, Dict, Any
from database import db_manager

class TemplateManager:
    """Manages certificate templates stored in database"""

    def __init__(self):
        pass

    def normalize_template_name(self, template_name: str) -> str:
        """Normalize template name for lookup (remove extension, convert to lowercase, replace spaces with underscores)"""
        if not template_name:
            return template_name

        # Remove .pdf extension if present
        if template_name.lower().endswith('.pdf'):
            template_name = template_name[:-4]

        # Convert to lowercase and replace spaces with underscores
        return template_name.lower().replace(' ', '_')

    async def create_template(self, name: str, display_name: str, file_data: bytes,
                            file_type: str = "application/pdf", description: str = None,
                            uploaded_by: str = None, is_default: bool = False) -> Dict[str, Any]:
        """Create a new template in database"""
        try:
            if db_manager.is_postgres:
                query = """
                    INSERT INTO certificate_templates (name, display_name, description, file_data, file_type, uploaded_by, is_default)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id
                """
                result = await db_manager.execute_query(
                    query,
                    [name, display_name, description, file_data, file_type, uploaded_by, is_default],
                    fetch=True
                )
                template_id = result[0]['id'] if result else None
            else:
                query = """
                    INSERT INTO certificate_templates (name, display_name, description, file_data, file_type, uploaded_by, is_default)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                template_id = await db_manager.execute_query(
                    query,
                    [name, display_name, description, file_data, file_type, uploaded_by, 1 if is_default else 0]
                )

            return {
                "success": True,
                "template_id": template_id,
                "message": f"Template '{display_name}' created successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_template_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get template by name from database"""
        try:
            # Normalize the template name for lookup
            normalized_name = self.normalize_template_name(name)

            if db_manager.is_postgres:
                query = "SELECT * FROM certificate_templates WHERE name = $1 AND is_active = true"
                result = await db_manager.execute_query(query, [normalized_name], fetch=True)
            else:
                query = "SELECT * FROM certificate_templates WHERE name = ? AND is_active = 1"
                result = await db_manager.execute_query(query, [normalized_name], fetch=True)

            if result:
                if db_manager.is_postgres:
                    template = dict(result[0])
                else:
                    # Convert SQLite row to dict manually
                    row = result[0]
                    template = {
                        'id': row[0], 'name': row[1], 'display_name': row[2], 'description': row[3],
                        'file_data': row[4], 'file_type': row[5], 'uploaded_by': row[6],
                        'uploaded_at': row[7], 'is_active': row[8], 'is_default': row[9]
                    }
                return template
            return None
        except Exception as e:
            print(f"Error getting template by name: {e}")
            return None

    async def get_template_by_id(self, template_id: int) -> Optional[Dict[str, Any]]:
        """Get template by ID from database"""
        try:
            if db_manager.is_postgres:
                query = "SELECT * FROM certificate_templates WHERE id = $1 AND is_active = true"
                result = await db_manager.execute_query(query, [template_id], fetch=True)
            else:
                query = "SELECT * FROM certificate_templates WHERE id = ? AND is_active = 1"
                result = await db_manager.execute_query(query, [template_id], fetch=True)

            if result:
                if db_manager.is_postgres:
                    template = dict(result[0])
                else:
                    # Convert SQLite row to dict manually
                    row = result[0]
                    template = {
                        'id': row[0], 'name': row[1], 'display_name': row[2], 'description': row[3],
                        'file_data': row[4], 'file_type': row[5], 'uploaded_by': row[6],
                        'uploaded_at': row[7], 'is_active': row[8], 'is_default': row[9]
                    }
                return template
            return None
        except Exception as e:
            print(f"Error getting template by ID: {e}")
            return None

    async def get_all_templates(self) -> List[Dict[str, Any]]:
        """Get all active templates from database"""
        try:
            if db_manager.is_postgres:
                query = "SELECT id, name, display_name, description, file_type, uploaded_by, uploaded_at, is_default FROM certificate_templates WHERE is_active = true ORDER BY is_default DESC, display_name ASC"
                result = await db_manager.execute_query(query, fetch=True)
            else:
                query = "SELECT id, name, display_name, description, file_type, uploaded_by, uploaded_at, is_default FROM certificate_templates WHERE is_active = 1 ORDER BY is_default DESC, display_name ASC"
                result = await db_manager.execute_query(query, fetch=True)

            if result:
                templates = []
                for row in result:
                    if db_manager.is_postgres:
                        templates.append(dict(row))
                    else:
                        # Convert SQLite row to dict manually
                        template_dict = {
                            'id': row[0], 'name': row[1], 'display_name': row[2], 'description': row[3],
                            'file_type': row[4], 'uploaded_by': row[5], 'uploaded_at': row[6], 'is_default': row[7]
                        }
                        templates.append(template_dict)
                return templates
            return []
        except Exception as e:
            print(f"Error getting all templates: {e}")
            return []

    async def get_default_template(self) -> Optional[Dict[str, Any]]:
        """Get the default template"""
        try:
            if db_manager.is_postgres:
                query = "SELECT * FROM certificate_templates WHERE is_default = true AND is_active = true LIMIT 1"
                result = await db_manager.execute_query(query, fetch=True)
            else:
                query = "SELECT * FROM certificate_templates WHERE is_default = 1 AND is_active = 1 LIMIT 1"
                result = await db_manager.execute_query(query, fetch=True)

            if result:
                if db_manager.is_postgres:
                    template = dict(result[0])
                else:
                    # Convert SQLite row to dict manually
                    row = result[0]
                    template = {
                        'id': row[0], 'name': row[1], 'display_name': row[2], 'description': row[3],
                        'file_data': row[4], 'file_type': row[5], 'uploaded_by': row[6],
                        'uploaded_at': row[7], 'is_active': row[8], 'is_default': row[9]
                    }
                return template
            return None
        except Exception as e:
            print(f"Error getting default template: {e}")
            return None

    async def create_temp_file(self, template_name: str) -> Optional[str]:
        """Create a temporary file from template data stored in database"""
        try:
            # The get_template_by_name method already handles normalization
            template = await self.get_template_by_name(template_name)
            if not template:
                # Try getting default template
                template = await self.get_default_template()
                if not template:
                    return None

            # Create temporary file
            file_extension = ".pdf"  # Most templates are PDF
            if template.get('file_type') == 'image/png':
                file_extension = ".png"
            elif template.get('file_type') == 'image/jpeg':
                file_extension = ".jpg"

            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                temp_file.write(template['file_data'])
                temp_file_path = temp_file.name

            return temp_file_path
        except Exception as e:
            print(f"Error creating temp file for template: {e}")
            return None

    async def delete_template(self, template_id: int) -> Dict[str, Any]:
        """Soft delete a template (mark as inactive)"""
        try:
            if db_manager.is_postgres:
                query = "UPDATE certificate_templates SET is_active = false WHERE id = $1"
                await db_manager.execute_query(query, [template_id])
            else:
                query = "UPDATE certificate_templates SET is_active = 0 WHERE id = ?"
                await db_manager.execute_query(query, [template_id])

            return {
                "success": True,
                "message": "Template deleted successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def set_default_template(self, template_id: int) -> Dict[str, Any]:
        """Set a template as the default one"""
        try:
            # First, remove default flag from all templates
            if db_manager.is_postgres:
                await db_manager.execute_query("UPDATE certificate_templates SET is_default = false")
                # Then set the specified template as default
                await db_manager.execute_query("UPDATE certificate_templates SET is_default = true WHERE id = $1", [template_id])
            else:
                await db_manager.execute_query("UPDATE certificate_templates SET is_default = 0")
                # Then set the specified template as default
                await db_manager.execute_query("UPDATE certificate_templates SET is_default = 1 WHERE id = ?", [template_id])

            return {
                "success": True,
                "message": "Default template updated successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Global template manager instance
template_manager = TemplateManager()