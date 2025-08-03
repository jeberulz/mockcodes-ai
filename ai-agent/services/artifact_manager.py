import os
import uuid
import logging
from typing import Dict, Optional, Any
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)

class ArtifactManager:
    """Manages generated code artifacts and previews"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")
        
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        logger.info("Artifact manager initialized")
    
    async def create_artifact(
        self, 
        project_id: str, 
        html_content: str, 
        css_content: str, 
        js_content: str
    ) -> str:
        """Create a new artifact in the database"""
        
        artifact_id = str(uuid.uuid4())
        
        # Get project details to retrieve user_id
        try:
            project_data = await self._get_project_details(project_id)
            logger.info(f"Retrieved project_data: {project_data}")
            
            if not project_data:
                logger.error(f"Project {project_id} not found")
                raise RuntimeError(f"Project {project_id} not found")
            
            user_id = project_data.get("user_id")
            logger.info(f"Extracted user_id: {user_id}")
            
            if not user_id:
                logger.error(f"User ID not found for project {project_id}")
                raise RuntimeError(f"User ID not found for project {project_id}")
                
        except Exception as e:
            logger.error(f"Exception during project lookup: {e}")
            raise
        
        # Generate preview HTML
        preview_html = self._generate_preview_html(html_content, css_content, js_content)
        
        # Store artifact in database
        artifact_data = {
            "id": artifact_id,
            "project_id": project_id,
            "user_id": user_id,
            "artifact_type": "preview",
            "html_content": html_content,
            "css_content": css_content,
            "js_content": js_content,
            "preview_html": preview_html,
            "preview_url": f"/preview/{artifact_id}",
            "status": "completed"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.supabase_url}/rest/v1/artifacts",
                headers=self.headers,
                json=artifact_data
            )
            
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to create artifact: {response.text}")
                raise RuntimeError(f"Failed to create artifact: {response.status_code}")
        
        logger.info(f"Created artifact {artifact_id} for project {project_id}")
        return artifact_id
    
    async def get_artifact(self, artifact_id: str) -> Dict[str, Any]:
        """Retrieve artifact by ID"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.supabase_url}/rest/v1/artifacts",
                headers=self.headers,
                params={"id": f"eq.{artifact_id}"}
            )
            
            if response.status_code != 200:
                raise RuntimeError(f"Failed to get artifact: {response.status_code}")
            
            data = response.json()
            if not data:
                raise RuntimeError("Artifact not found")
            
            return data[0]
    
    async def get_preview_html(self, artifact_id: str) -> str:
        """Get preview HTML for artifact"""
        
        artifact = await self.get_artifact(artifact_id)
        return artifact.get("preview_html", "")
    
    def _generate_preview_html(self, html: str, css: str, js: str) -> str:
        """Generate a complete HTML preview"""
        
        # Extract body content from HTML if it's a complete document
        body_content = self._extract_body_content(html)
        
        preview_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MockCodes Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom CSS */
        {css}
        
        /* Preview-specific styles */
        body {{
            margin: 0;
            padding: 0;
        }}
        
        /* Smooth animations */
        * {{
            transition: all 0.2s ease-in-out;
        }}
    </style>
</head>
<body>
    {body_content}
    
    <script>
        // Custom JavaScript
        {js}
        
        // Preview enhancements
        document.addEventListener('DOMContentLoaded', function() {{
            // Add any preview-specific functionality here
            console.log('MockCodes preview loaded');
        }});
    </script>
</body>
</html>"""
        
        return preview_template
    
    def _extract_body_content(self, html: str) -> str:
        """Extract content from body tag or return full HTML if no body tag"""
        
        import re
        
        # Try to extract body content
        body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL | re.IGNORECASE)
        
        if body_match:
            return body_match.group(1).strip()
        
        # If no body tag found, check if it's a complete HTML document
        if html.strip().startswith('<!DOCTYPE') or html.strip().startswith('<html'):
            # Return as-is if it's a complete document
            return html
        
        # Otherwise, assume it's just content
        return html
    
    async def update_artifact_status(self, artifact_id: str, status: str) -> None:
        """Update artifact status"""
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.supabase_url}/rest/v1/artifacts",
                headers=self.headers,
                params={"id": f"eq.{artifact_id}"},
                json={"status": status}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to update artifact status: {response.text}")
                raise RuntimeError(f"Failed to update artifact status: {response.status_code}")
        
        logger.info(f"Updated artifact {artifact_id} status to {status}")
    
    async def delete_artifact(self, artifact_id: str) -> None:
        """Delete artifact"""
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.supabase_url}/rest/v1/artifacts",
                headers=self.headers,
                params={"id": f"eq.{artifact_id}"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to delete artifact: {response.text}")
                raise RuntimeError(f"Failed to delete artifact: {response.status_code}")
        
        logger.info(f"Deleted artifact {artifact_id}")
    
    async def _get_project_details(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project details from database"""
        
        logger.info(f"Looking up project details for {project_id}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.supabase_url}/rest/v1/projects",
                headers=self.headers,
                params={"id": f"eq.{project_id}", "select": "id,user_id,name"}
            )
            
            logger.info(f"Project lookup response: {response.status_code} - {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Failed to get project details: {response.text}")
                return None
            
            data = response.json()
            if not data:
                logger.error(f"Project {project_id} not found")
                return None
            
            logger.info(f"Found project data: {data[0]}")
            return data[0]