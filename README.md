# Formula 4 Race Analytics Platform

A comprehensive telemetry analysis platform designed for Formula 4 racing teams, drivers, and engineers. This platform provides comparative analysis of race data between two drivers, focusing on optimizing fastest lap performance through an intuitive web-based interface.

## 🏗️ Architecture

This is a microservices-based application with the following structure:

```
formula4-race-analytics/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   └── lib/             # Utilities
│   ├── Dockerfile
│   └── package.json
├── api/                     # Node.js Express backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Data models
│   │   └── middleware/      # Express middleware
│   ├── Dockerfile
│   └── server.js
├── data-processing/         # Python FastAPI service
│   ├── routers/            # API endpoints
│   ├── models/             # Pydantic models
│   ├── services/           # Business logic
│   ├── Dockerfile
│   └── main.py
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production environment
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Development Environment

1. **Clone the repository**
```bash
git clone <repository-url>
cd formula4-race-analytics
```

2. **Start all services with Docker**
```bash
# Start development environment
docker-compose up

# Or build and start
docker-compose up --build
```

3. **Access the application**
- Frontend: http://localhost:5173
- API: http://localhost:3001
- Data Processing: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Local Development (without Docker)

1. **Install dependencies**
```bash
# Install root dependencies for monorepo management
npm install

# Install all service dependencies
npm run install:all
```

2. **Start all services**
```bash
# Start all services concurrently
npm run dev

# Or start individually
npm run dev:frontend
npm run dev:api
npm run dev:data
```

## 🛠️ Technology Stack

### Frontend
- **React 19** with hooks and TypeScript support
- **Vite** for fast development and building
- **React Router v6** for navigation
- **Tailwind CSS 3** for styling
- **shadcn/ui** for component library
- **Plotly.js** for data visualization
- **Framer Motion** for animations

### Backend (API)
- **Node.js 20** with Express.js 4
- **Supabase** for database and authentication
- **Multer** for file uploads
- **CSV Parser** for telemetry data processing
- **Helmet** for security
- **CORS** for cross-origin requests

### Data Processing
- **Python 3.11** with FastAPI
- **Pandas** for data manipulation
- **NumPy** for numerical computations
- **Scikit-learn** for machine learning
- **Uvicorn** as ASGI server

### Infrastructure
- **Docker** for containerization
- **Docker Compose** for multi-service orchestration
- **GitHub Actions** for CI/CD
- **Nginx** for production frontend serving

## 🏁 Features

### Core Features
- **Telemetry File Upload**: Support for CSV files from AiM Sports RaceStudio3 and Marelli WinTAX4
- **Fastest Lap Analysis**: Automatic extraction and analysis of fastest laps (95-120 seconds)
- **Driver Comparison**: Side-by-side comparison of two drivers' performance
- **Interactive Visualizations**:
  - Speed vs Distance/Time comparison
  - Engine vitals (RPM, gear positions)
  - 3D track mapping using GPS coordinates
  - Lap delta analysis
  - Driver action timelines (braking, throttle, steering)
- **User Authentication**: Secure login with Supabase
- **Responsive Design**: Works on desktop and tablet devices

### Technical Features
- **Real-time Processing**: Files processed in under 30 seconds
- **Secure Storage**: Telemetry data stored in PostgreSQL via Supabase
- **Modern UI**: Racing-themed dark interface with glass morphism design
- **Performance Optimized**: Handles files up to 50MB
- **Microservices Architecture**: Scalable and maintainable service separation

## 📊 Supported Data Format

### CSV File Structure
The application expects CSV files with the following structure:

**Metadata (First 14 rows):**
- Driver name
- Session information
- Equipment details
- Track information

**Telemetry Data Columns:**
- Time (timestamp)
- Speed (km/h)
- Distance on Vehicle Speed
- Throttle Pos (%)
- Gear
- Clutch Pos (%)
- Brake Pos (%)
- Brake Press (bar)
- Oil Temp (deg Celsius)
- Oil Press (bar)
- Exhaust Temp (deg Celsius)
- Water Temp (deg Celsius)
- Head Temp (deg Celsius)
- Steering Pos (deg)
- GPS Latitude (deg)
- GPS Longitude (deg)
- GPS Altitude (m)
- GPS Gyro (deg/s)
- GPS Lateral Acceleration (g)
- GPS Longitudinal Acceleration (g)
- Lateral Acceleration (g)
- Inline Acceleration (g)

## 🔧 API Endpoints

### Backend API (Node.js)
- `GET /api/health` - Health check
- `POST /api/upload` - Upload and process telemetry files
- `GET /api/analysis/:analysisId` - Retrieve analysis data

### Data Processing API (Python)
- `GET /health` - Health check
- `GET /info` - Service information
- `POST /telemetry/process` - Process single telemetry file
- `POST /telemetry/analyze` - Analyze multiple files for comparison
- `GET /telemetry/capabilities` - Get processing capabilities
- `GET /docs` - Interactive API documentation

## 🚀 Deployment

### Production Build
```bash
# Build for production
docker-compose -f docker-compose.prod.yml up --build

# Or build individual services
docker build -t formula4-frontend ./frontend
docker build -t formula4-api ./api
docker build -t formula4-data ./data-processing
```

### CI/CD Pipeline
The project includes GitHub Actions workflows for:
- **Continuous Integration**: Automated testing and building
- **Continuous Deployment**: Automated deployment to production
- **Docker Image Building**: Multi-stage builds for optimization

### Environment Configuration
Create `.env` files in each service directory:

**API (.env)**
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3001
VITE_DATA_PROCESSING_URL=http://localhost:8000
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run frontend tests
npm run test:frontend

# Run API tests
npm run test:api

# Run Python tests (when implemented)
cd data-processing && python -m pytest
```

## 📈 Development Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:frontend     # Start frontend only
npm run dev:api         # Start API only
npm run dev:data        # Start data processing only

# Building
npm run build           # Build all services
npm run build:frontend  # Build frontend only

# Docker
npm run docker:up       # Start with Docker Compose
npm run docker:down     # Stop Docker services
npm run docker:build    # Build Docker images

# Maintenance
npm run clean           # Clean node_modules
npm run lint            # Lint all services
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the PRD (Product Requirements Document)

## 🏎️ About Formula 4

Formula 4 is an entry-level single-seater racing category designed to provide young drivers with their first experience of professional motorsport. This analytics platform helps teams and drivers optimize their performance through data-driven insights.

---

**Built with ❤️ for the racing community** 