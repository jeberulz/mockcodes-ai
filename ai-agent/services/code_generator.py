import os
import logging
from typing import Dict, Optional, Any
import openai
import anthropic
from openai import AsyncOpenAI
from anthropic import Anthropic

logger = logging.getLogger(__name__)

class CodeGenerator:
    """AI-powered code generation service"""
    
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        
        # Initialize OpenAI client
        if os.getenv("OPENAI_API_KEY"):
            self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            logger.info("OpenAI client initialized")
        
        # Initialize Anthropic client
        if os.getenv("ANTHROPIC_API_KEY"):
            self.anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            logger.info("Anthropic client initialized")
        
        if not self.openai_client and not self.anthropic_client:
            raise ValueError("At least one AI provider (OpenAI or Anthropic) must be configured")
    
    async def generate_from_prompt(
        self, 
        prompt: str, 
        image_url: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Generate HTML, CSS, and JavaScript from a prompt"""
        
        try:
            # Use OpenAI GPT-4o as primary generator
            if self.openai_client:
                return await self._generate_with_openai(prompt, image_url, preferences)
            
            # Fallback to Anthropic Claude
            elif self.anthropic_client:
                return self._generate_with_anthropic(prompt, preferences)
            
            else:
                raise RuntimeError("No AI providers available")
                
        except Exception as e:
            logger.error(f"Code generation failed: {e}")
            raise
    
    async def _generate_with_openai(
        self, 
        prompt: str, 
        image_url: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Generate code using OpenAI GPT-4o"""
        
        system_prompt = """You are an expert frontend developer specializing in creating pixel-perfect HTML, CSS, and JavaScript implementations from design prompts.

Your task is to generate clean, modern, and responsive code using:
- Semantic HTML5
- Tailwind CSS for styling (CDN version)
- Vanilla JavaScript for interactivity
- Modern web standards and best practices

Requirements:
1. Create a complete, self-contained HTML page
2. Use Tailwind CSS classes for all styling
3. Ensure responsive design (mobile-first approach)
4. Add smooth animations and hover effects
5. Include proper accessibility attributes
6. Use modern JavaScript (ES6+)
7. Ensure cross-browser compatibility

Return your response as a JSON object with this exact structure:
{
  "html": "complete HTML document",
  "css": "additional custom CSS if needed (prefer Tailwind)",
  "js": "JavaScript for interactivity"
}

Make the code production-ready and visually appealing."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a website based on this prompt: {prompt}"}
        ]
        
        # Add image if provided
        if image_url:
            messages[-1]["content"] = [
                {"type": "text", "text": f"Create a website that matches this design: {prompt}"},
                {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}}
            ]
        
        model_name = os.getenv("OPENAI_GPT_MODEL", "gpt-4o-preview")

        try:
            response = await self.openai_client.chat.completions.create(
                model=model_name,
                messages=messages,
                max_tokens=8000,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
        except Exception as e:  # Fallback on model errors or invalid request
            logger.warning(f"Model {model_name} unavailable ({e}). Falling back to gpt-4o-mini.")
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=8000,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
        
        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("Empty response from OpenAI")
        
        logger.info(f"OpenAI response length: {len(content)}")
        logger.debug(f"OpenAI response preview: {content[:200]}...")
        
        import json, re
        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {e}")
            logger.error(f"Response content: {content}")
            # Attempt to extract JSON enclosed in triple backtick code fences
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL | re.IGNORECASE)
            if match:
                try:
                    result = json.loads(match.group(1))
                    logger.info("Successfully parsed JSON extracted from code block")
                except json.JSONDecodeError:
                    raise RuntimeError(f"Invalid JSON response from OpenAI: {e}")
            else:
                raise RuntimeError(f"Invalid JSON response from OpenAI: {e}")
        
        # Validate response structure
        required_keys = ["html", "css", "js"]
        for key in required_keys:
            if key not in result:
                result[key] = ""

        return result

    def _generate_with_anthropic(
        self, 
        prompt: str, 
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Generate code using Anthropic Claude"""
        
        system_prompt = """You are an expert frontend developer. Generate clean, modern HTML, CSS, and JavaScript code based on the user's prompt.

Use Tailwind CSS for styling and create responsive, accessible designs.

Return your response as JSON with keys: html, css, js"""
        
        message = self.anthropic_client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=4000,
            temperature=0.1,
            system=system_prompt,
            messages=[
                {"role": "user", "content": f"Create a website based on this prompt: {prompt}"}
            ]
        )
        
        content = message.content[0].text
        
        import json
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            # Fallback parsing if JSON is malformed
            result = {
                "html": self._extract_code_block(content, "html"),
                "css": self._extract_code_block(content, "css"),
                "js": self._extract_code_block(content, "javascript")
            }
        
        return result
    
    def _extract_code_block(self, content: str, language: str) -> str:
        """Extract code block from markdown-style response"""
        import re
        
        pattern = f"```{language}\\n(.*?)\\n```"
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        
        if match:
            return match.group(1).strip()
        
        return ""
    
    def _apply_preferences(self, code: Dict[str, str], preferences: Dict[str, Any]) -> Dict[str, str]:
        """Apply user preferences to generated code"""
        
        # This could include:
        # - Color scheme adjustments
        # - Typography preferences  
        # - Layout modifications
        # - Component library choices
        
        # For now, return code as-is
        # TODO: Implement preference application
        return code