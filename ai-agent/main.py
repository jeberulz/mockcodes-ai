import os
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx
from dotenv import load_dotenv

from services.code_generator import CodeGenerator
from services.artifact_manager import ArtifactManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global services
code_generator: Optional[CodeGenerator] = None
artifact_manager: Optional[ArtifactManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup services"""
    global code_generator, artifact_manager
    
    try:
        # Initialize services
        logger.info("Initializing AI Agent services...")
        code_generator = CodeGenerator()
        artifact_manager = ArtifactManager()
        
        logger.info("AI Agent started successfully")
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down AI Agent services...")

# Create FastAPI app
app = FastAPI(
    title="MockCodes AI Agent",
    description="AI-powered code generation service for UI screenshots",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ScaffoldRequest(BaseModel):
    prompt: str
    project_id: str
    image_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class ScaffoldResponse(BaseModel):
    artifact_id: str
    status: str
    preview_url: str
    message: str

class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        services={
            "code_generator": "ready" if code_generator else "not_ready",
            "artifact_manager": "ready" if artifact_manager else "not_ready"
        }
    )

@app.post("/scaffold", response_model=ScaffoldResponse)
async def scaffold_code(request: ScaffoldRequest, background_tasks: BackgroundTasks):
    """Generate code from prompt and create artifact"""
    try:
        if not code_generator or not artifact_manager:
            raise HTTPException(status_code=503, detail="Services not ready")
        
        logger.info(f"Starting code generation for project {request.project_id}")
        
        # Generate code using AI
        generated_code = await code_generator.generate_from_prompt(
            prompt=request.prompt,
            image_url=request.image_url,
            preferences=request.preferences or {}
        )
        
        # Create artifact
        artifact_id = await artifact_manager.create_artifact(
            project_id=request.project_id,
            html_content=generated_code["html"],
            css_content=generated_code["css"],
            js_content=generated_code["js"]
        )
        
        # Generate preview URL
        preview_url = f"/preview/{artifact_id}"
        
        logger.info(f"Code generation completed for project {request.project_id}")
        
        return ScaffoldResponse(
            artifact_id=artifact_id,
            status="completed",
            preview_url=preview_url,
            message="Code generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Code generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/preview/{artifact_id}")
async def preview_artifact(artifact_id: str):
    """Serve preview of generated code"""
    try:
        if not artifact_manager:
            raise HTTPException(status_code=503, detail="Artifact manager not ready")
        
        html_content = await artifact_manager.get_preview_html(artifact_id)
        
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Preview generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/artifacts/{artifact_id}")
async def get_artifact(artifact_id: str):
    """Get artifact data"""
    try:
        if not artifact_manager:
            raise HTTPException(status_code=503, detail="Artifact manager not ready")
        
        artifact = await artifact_manager.get_artifact(artifact_id)
        return artifact
        
    except Exception as e:
        logger.error(f"Failed to get artifact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Create logs directory if it doesn't exist
    os.makedirs("/app/logs", exist_ok=True)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )