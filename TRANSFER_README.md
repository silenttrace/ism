# ISM-NIST Mapper - Transfer Instructions

## What's Included
- Complete React + TypeScript frontend
- Express.js + TypeScript backend  
- All source code and configuration files
- Database schemas and API endpoints
- Documentation and setup scripts

## What's NOT Included (Cleaned Up)
- `node_modules/` directories (run `npm install` to restore)
- `dist/` build directories (run build scripts to regenerate)
- Log files and runtime data
- Ollama-specific data (since you mentioned not using it)

## Setup on New System

1. **Extract the archive:**
   ```bash
   tar -xzf ism-nist-mapper.tar.gz
   cd ism-nist-mapper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

3. **Configure environment:**
   - Copy `backend/.env.example` to `backend/.env` (if needed)
   - Update `OLLAMA_BASE_URL` and `OLLAMA_MODEL` for your Ollama setup
   - Ensure Ollama is running on the new system

4. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

## Key Features Implemented
- ✅ OSCAL data loading and parsing
- ✅ Ollama integration for control mapping
- ✅ Interactive D3.js network visualization
- ✅ Search functionality (Enter key works, no accessibility focus outline)
- ✅ Manual override capabilities
- ✅ Export functionality (JSON, CSV, PDF)
- ✅ Real-time processing status
- ✅ Confidence scoring and filtering

## Recent Changes
- Removed all accessibility-related code and styling
- Fixed search bar Enter key functionality
- Cleaned up focus outlines and blue borders
- Optimized for transfer to new system

## Architecture
- **Frontend:** React + TypeScript + Material-UI + D3.js
- **Backend:** Express.js + TypeScript + Ollama integration
- **Data:** OSCAL JSON format for ISM and NIST controls
- **AI:** Ollama local LLM models for semantic mapping analysis