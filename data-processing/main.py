from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import logging
from dotenv import load_dotenv
from routers import telemetry, data_management, comparison
from models.telemetry_models import HealthResponse
from services.database import initialize_database
from middleware.auth import AuthenticationError

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Initialize FastAPI app
app = FastAPI(
    title="Formula 4 Data Processing Service",
    description="Python FastAPI service for telemetry data processing and analysis",
    version="1.0.0",
    docs_url="/docs" if os.getenv("DEBUG", "false").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("DEBUG", "false").lower() == "true" else None
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "0.0.0.0", "*.supabase.co"]
)

# Configure CORS
cors_origins = os.getenv("CORS_ALLOW_ORIGINS", '["http://localhost:5173", "http://localhost:3000"]')
try:
    import json
    allowed_origins = json.loads(cors_origins)
except:
    allowed_origins = ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true",
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Global exception handlers
@app.exception_handler(AuthenticationError)
async def auth_exception_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(
        status_code=401,
        content={"detail": str(exc), "type": "authentication_error"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "server_error"}
    )

# Initialize database
try:
    initialize_database()
    print("Database initialized successfully")
except Exception as e:
    print(f"Database initialization failed: {e}")

# Include routers
app.include_router(telemetry.router)
app.include_router(data_management.router)
app.include_router(comparison.router)

# Health check endpoint
@app.get("/", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="OK",
        message="Data Processing Service is running",
        service="FastAPI v0.100.0+"
    )

# Get service info endpoint
@app.get("/info")
def get_service_info():
    """
    Get service information and capabilities
    """
    return {
        "service": "Formula 4 Data Processing",
        "version": "1.0.0",
        "framework": "FastAPI",
        "capabilities": [
            "CSV telemetry file processing",
            "Driver comparison analysis",
            "Fastest lap extraction",
            "Data validation and cleaning",
            "Speed and performance analytics",
            "PostgreSQL data persistence",
            "Redis caching",
            "Advanced data alignment",
            "Session management",
            "Driver action classification",
            "Vehicle dynamics analysis",
            "Track sector performance breakdown",
            "Oversteer/understeer detection",
            "Multi-session driver comparison",
            "Performance metrics calculation",
            "Authentication and rate limiting"
        ],
        "supported_formats": ["CSV"],
        "max_file_size": "50MB",
        "endpoints": {
            "health": "/health",
            "telemetry_process": "/telemetry/process",
            "telemetry_analyze": "/telemetry/analyze",
            "telemetry_compare_detailed": "/telemetry/compare-detailed",
            "telemetry_lap_comparison": "/telemetry/lap-comparison-data",
            "telemetry_capabilities": "/telemetry/capabilities",
            "data_upload_session": "/data/upload-session",
            "data_sessions": "/data/sessions",
            "data_compare_sessions": "/data/compare-sessions",
            "data_drivers": "/data/drivers",
            "data_tracks": "/data/tracks",
            "data_health": "/data/health",
            "comparison_advanced_analysis": "/comparison/advanced-analysis",
            "comparison_performance_metrics": "/comparison/performance-metrics/{session_id}",
            "comparison_driver_comparison": "/comparison/driver-comparison/{driver1_name}/{driver2_name}",
            "comparison_capabilities": "/comparison/comparison-capabilities",
            "docs": "/docs"
        },
        "dependencies": {
            "fastapi": "0.100.0+",
            "pandas": "latest",
            "numpy": "latest",
            "scipy": "latest",
            "scikit-learn": "latest",
            "sqlalchemy": "latest",
            "psycopg2-binary": "latest",
            "redis": "latest",
            "uvicorn": "latest"
        }
    }

if __name__ == "__main__":
    host = os.getenv("SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("SERVICE_PORT", "8000"))
    reload = os.getenv("DEBUG", "false").lower() == "true"
    
    uvicorn.run("main:app", host=host, port=port, reload=reload) 