import os
import uuid
import logging
import html
import base64
from typing import Dict, Optional, Any
from datetime import datetime
import httpx
from bs4 import BeautifulSoup, Comment

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
        """Generate a secure sandboxed HTML preview"""
        
        # Sanitize all inputs first
        sanitized_html = self._sanitize_html(html)
        sanitized_css = self._sanitize_css(css)
        sanitized_js = self._sanitize_javascript(js)
        
        # Extract body content from HTML if it's a complete document
        body_content = self._extract_body_content(sanitized_html)
        
        # Create the preview content in a sandboxed iframe
        inner_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MockCodes Preview</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom CSS */
        {sanitized_css}
        
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
        // Custom JavaScript (sanitized)
        {sanitized_js}
        
        // Preview enhancements
        document.addEventListener('DOMContentLoaded', function() {{
            console.log('MockCodes preview loaded');
        }});
    </script>
</body>
</html>"""
        
        # Encode the content as base64 for safe data URL
        encoded_content = base64.b64encode(inner_html.encode('utf-8')).decode('utf-8')
        
        # Create wrapper HTML with sandboxed iframe
        wrapper_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MockCodes Preview - Secure</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; frame-src data:; style-src 'self' 'unsafe-inline';">
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
        }}
        .preview-container {{
            width: 100%;
            height: 100vh;
            border: none;
        }}
        .security-notice {{
            background: #fef3c7;
            color: #92400e;
            padding: 8px 16px;
            font-size: 12px;
            text-align: center;
            border-bottom: 1px solid #f59e0b;
        }}
    </style>
</head>
<body>
    <div class="security-notice">
        🔒 This preview is running in a secure sandboxed environment
    </div>
    <iframe 
        class="preview-container"
        src="data:text/html;base64,{encoded_content}"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Secure Preview">
    </iframe>
</body>
</html>"""
        
        return wrapper_template
    
    def _sanitize_html(self, html_content: str) -> str:
        """Sanitize HTML content to prevent XSS"""
        if not html_content:
            return ""
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove dangerous tags
        dangerous_tags = ['script', 'object', 'embed', 'applet', 'meta', 'link']
        for tag in soup(dangerous_tags):
            tag.decompose()
        
        # Remove comments that might contain malicious code
        for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
            comment.extract()
        
        # Remove dangerous attributes
        dangerous_attrs = ['onload', 'onclick', 'onmouseover', 'onerror', 'onabort', 
                          'onchange', 'onfocus', 'onblur', 'onsubmit', 'onreset']
        
        for tag in soup.find_all():
            for attr in dangerous_attrs:
                if tag.has_attr(attr):
                    del tag[attr]
            
            # Sanitize href and src attributes
            if tag.has_attr('href'):
                href = tag['href']
                if href.startswith('javascript:') or href.startswith('data:'):
                    del tag['href']
            
            if tag.has_attr('src'):
                src = tag['src']
                if src.startswith('javascript:'):
                    del tag['src']
        
        return str(soup)
    
    def _sanitize_css(self, css_content: str) -> str:
        """Sanitize CSS content to prevent XSS"""
        if not css_content:
            return ""
        
        # Escape the CSS content to prevent injection
        sanitized = html.escape(css_content, quote=False)
        
        # Remove dangerous CSS properties and values
        dangerous_patterns = [
            'javascript:',
            'expression(',
            'behavior:',
            'binding:',
            '-moz-binding:',
            'data:',
            'vbscript:',
            '@import'
        ]
        
        for pattern in dangerous_patterns:
            sanitized = sanitized.replace(pattern, '')
        
        return sanitized
    
    def _sanitize_javascript(self, js_content: str) -> str:
        """Sanitize JavaScript content to prevent XSS"""
        if not js_content:
            return ""
        
        # Basic sanitization - escape dangerous characters
        sanitized = html.escape(js_content, quote=False)
        
        # Remove dangerous JavaScript patterns
        dangerous_patterns = [
            'eval(',
            'Function(',
            'setTimeout(',
            'setInterval(',
            'document.write(',
            'document.writeln(',
            'innerHTML',
            'outerHTML',
            'document.cookie',
            'localStorage',
            'sessionStorage',
            'window.location',
            'location.href',
            'location.replace',
            'location.assign'
        ]
        
        # Note: This is basic sanitization. For production, consider using a proper JS sanitizer
        # or running JS in a more restricted environment
        for pattern in dangerous_patterns:
            sanitized = sanitized.replace(pattern, f'/* BLOCKED: {pattern} */')
        
        return sanitized
    
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