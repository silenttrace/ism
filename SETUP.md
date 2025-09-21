# ISM-NIST Mapper Setup Guide

The ISM-NIST Mapper uses Ollama to run AI models locally on your machine - completely free with no API costs.

## 🆓 Ollama Setup

Ollama runs AI models locally on your machine - completely free with no API costs.

### Step 1: Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from: https://ollama.com/download

### Step 2: Start Ollama and Download Model

```bash
# Start Ollama service
ollama serve

# In another terminal, download the model (this may take a few minutes)
ollama pull llama3.1
```

### Step 3: Configure the Application (Optional)

The default configuration should work, but you can customize in `backend/.env`:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

### Step 4: Restart the Application

```bash
./stop.sh
./start.sh
```

The AI Service Status should now show "Connected" ✅

## 💰 Cost Information

### Ollama (Free)
- **Cost**: Completely free
- **Requirements**: ~8GB RAM, ~4GB disk space for model
- **Performance**: Good quality analysis
- **Privacy**: Everything runs locally, no data sent to external services

## 🔧 Alternative Configuration

### Environment Variables

**For Ollama:**
```bash
export OLLAMA_MODEL=llama3.1
./start.sh
```

## 🧪 Testing Without AI

If you want to test the application without AI:

1. You can still load and view ISM/NIST controls
2. The visualization will be empty until mappings are generated
3. Manual override functionality will work for creating test mappings

## 🆘 Troubleshooting

### "Ollama service not initialized"
- Check that Ollama is running: `ollama serve`
- Verify the model is downloaded: `ollama list`
- Restart the application after starting Ollama

### "Connection failed"
- Check that Ollama is running on the correct port (11434)
- Verify your model is available: `ollama list`
- Check the logs in `logs/backend.log`

### Model Download Issues
- Ensure you have sufficient disk space (~4GB for llama3.1)
- Check your internet connection during model download
- Try downloading a smaller model: `ollama pull llama3.1:8b`

### Performance Issues
- Ollama requires at least 8GB RAM for good performance
- Close other applications to free up memory
- Consider using a smaller model if performance is poor

## 📞 Support

If you encounter issues:
1. Check the logs in `logs/backend.log` and `logs/frontend.log`
2. Verify Ollama is running: `ollama list`
3. Check Ollama status: `curl http://localhost:11434/api/tags`
4. Ensure you have sufficient system resources (RAM/disk space)