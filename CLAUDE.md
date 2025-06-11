# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
```bash
npm run dev              # Start all services (frontend + API + data processing)
npm run dev:frontend     # Start React frontend only (port 5173)
npm run dev:api         # Start Node.js API only (port 3001)
npm run dev:data        # Start Python data processing service (port 8000)
```

### Docker Development
```bash
npm run docker:up       # Start all services with Docker Compose
npm run docker:build    # Build Docker images
docker-compose down     # Stop all services
```

### Build and Testing
```bash
npm run build           # Build all services for production
npm test               # Run all tests
```

### Linting and Type Checking
```bash
# Frontend
cd frontend && npm run lint
cd frontend && npm run type-check

# API
cd api && npm run lint

# Data Processing
cd data-processing && python -m pytest
```

## Architecture Overview

This is a **microservices Formula 4 race analytics web application** with three main services:

1. **Frontend** (React 19 + Vite + Tailwind + shadcn/ui) - Port 5173
2. **API Backend** (Node.js + Express + Supabase) - Port 3001  
3. **Data Processing Service** (Python + FastAPI + Pandas) - Port 8000

### Service Communication Flow
- Frontend → API Backend → Data Processing Service
- All services communicate via REST APIs
- Supabase handles authentication, database, and file storage
- Data processing service handles telemetry analysis and driver comparisons

## Key Technical Details

### Database Architecture
- **Supabase PostgreSQL** with Row Level Security (RLS)
- Multi-tenant architecture with team-based data sharing
- Core tables: `users`, `teams`, `telemetry_sessions`, `telemetry_data`, `fastest_laps`
- Migrations in `database/migrations/` directory

### Telemetry Data Processing
- Supports CSV files from AiM Sports RaceStudio3 and Marelli WinTAX4
- 14-row metadata header with 22+ telemetry channels
- GPS-based distance calculation with 10-meter interpolation
- Fastest lap extraction (95-120 seconds) and comparative analysis

### File Upload Pipeline
1. Frontend uploads CSV via drag-and-drop (`DndUpload.jsx`)
2. API validates and stores file (`uploadController.js`)
3. Data processing service analyzes telemetry (`data_processor.py`)
4. Results stored in database with visualizations

### Authentication & Security
- Supabase Auth with email/password and magic links
- Team-based access control with role hierarchy
- File upload validation (type, size, malware scanning)
- RLS policies isolate data between teams

## Development Guidelines

### Frontend Development
- Use shadcn/ui components from `components/ui/`
- Follow existing patterns in `pages/` and `components/`
- Leverage `AuthContext` and `AnalysisContext` for state management
- Use Plotly.js for data visualizations

### Backend API Development
- Follow Express.js patterns in `api/src/routes/`
- Use middleware in `api/src/middleware/` for auth and validation
- Database operations through Supabase client
- Error handling and response formatting in controllers

### Data Processing Development
- Use FastAPI patterns in `data-processing/routers/`
- Pandas-based data pipeline in `services/`
- SQLAlchemy models in `models/database_models.py`
- Add comprehensive test coverage for data processing logic

### Database Changes
- Create migrations in `database/migrations/`
- Update RLS policies for new tables
- Test with `database/rls_testing_script.sql`
- Document schema changes in `database/schema_docs.md`

## Important File Locations

- Main configs: `package.json`, `docker-compose.yml`, `vite.config.js`
- Environment examples: `env.example`, `frontend/env.example.txt`
- Database schema: `database/migrations/001_initial_schema.sql`
- API routes: `api/src/routes/uploadRoutes.js`
- Data processing: `data-processing/services/data_processor.py`
- Frontend pages: `frontend/src/pages/`
- UI components: `frontend/src/components/ui/`

## Performance Considerations

- Telemetry processing target: < 30 seconds per file
- Frontend uses code splitting and lazy loading
- Database has strategic indexes for time-series queries
- Data processing service uses Pandas for optimized operations
- Production builds use multi-stage Docker containers