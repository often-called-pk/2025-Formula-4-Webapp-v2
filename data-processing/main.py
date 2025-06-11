from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routers import telemetry, data_management
from models.telemetry_models import HealthResponse
from services.database import initialize_database

# Initialize FastAPI app
app = FastAPI(
    title="Formula 4 Data Processing Service",
    description="Python FastAPI service for telemetry data processing and analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
            "Session management"
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 