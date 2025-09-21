# ISM-NIST Mapper

AI-powered compliance mapping tool that analyzes Australian Information Security Manual (ISM) controls and maps them to corresponding NIST 800-53 controls with confidence scores and logical reasoning.

## Features

- Automatic loading of ISM controls from official OSCAL format
- AI-powered semantic analysis using Ollama (free local AI)
- Interactive visualization of control mappings
- Confidence scoring and detailed reasoning
- Manual review and override capabilities
- Export and reporting functionality

## Architecture

- **Frontend**: React + TypeScript + Material-UI + D3.js
- **Backend**: Express.js + TypeScript + Ollama
- **Development**: Vite for frontend, ts-node-dev for backend

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Ollama (for AI functionality)

### Installation

1. Clone the repository
2. Install dependencies for all packages:
   ```bash
   npm run install:all
   ```

3. Set up Ollama (free local AI):
   - See [SETUP.md](SETUP.md) for detailed instructions
   - Install Ollama and download the llama3.1 model
   - No API keys or costs required

### Quick Start (Recommended)

**macOS/Linux:**
```bash
./start.sh    # Start the application
./stop.sh     # Stop the application
```

**Windows:**
```cmd
start.bat     # Start the application
stop.bat      # Stop the application
```

The start script will:
- Check for Node.js and npm
- Install dependencies if needed
- Create .env file from template if missing
- Start both frontend and backend servers
- Show you the URLs and log locations

### Manual Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

### Individual Services

Start frontend only:
```bash
npm run dev:frontend
```

Start backend only:
```bash
npm run dev:backend
```

### Building

Build both frontend and backend:
```bash
npm run build
```

### Testing

Run all tests:
```bash
npm run test
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api` - API information
- `GET /api/mappings` - Retrieve all control mappings
- `POST /api/mappings/process` - Trigger processing of ISM controls
- `GET /api/mappings/status/:jobId` - Check processing status
- `PUT /api/mappings/:controlId/override` - Apply manual override

## Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client services
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── package.json
├── backend/                  # Express.js backend API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic services
│   │   ├── models/          # Data models
│   │   └── utils/           # Utility functions
│   └── package.json
└── package.json             # Root package.json with workspace config
```

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new functionality
3. Update documentation as needed
4. Use TypeScript for type safety

## License

This project is licensed under the MIT License.