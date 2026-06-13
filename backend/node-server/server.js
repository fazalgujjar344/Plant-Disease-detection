const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// Flask service URL - USE IPv4 ADDRESS
const FLASK_URL = process.env.FLASK_URL || 'http://127.0.0.1:5000';

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'running',
    server: 'Node.js Backend',
    timestamp: new Date().toISOString(),
    flask_connected: FLASK_URL
  });
});

// Test Flask connection endpoint
app.get('/api/test-flask', async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_URL}/health`, { timeout: 5000 });
    res.json({ 
      success: true, 
      flask_status: response.data,
      flask_url: FLASK_URL
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      flask_url: FLASK_URL
    });
  }
});

// Prediction endpoint - forwards to Flask
app.post('/api/predict', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided' 
      });
    }

    console.log(`📸 Received image: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`🔄 Forwarding to Flask at: ${FLASK_URL}/predict`);

    // Forward to Flask ML service
    const formData = new FormData();
    formData.append('image', req.file.buffer, req.file.originalname);

    const flaskResponse = await axios.post(`${FLASK_URL}/predict`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    console.log(`✅ Prediction received from Flask`);
    res.json(flaskResponse.data);
    
  } catch (error) {
    console.error('Prediction error:', error.message);
    
    // Provide more detailed error
    let errorMessage = 'Failed to get prediction from ML service';
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Flask ML service is not running. Please start Flask on port 5000';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Flask service timeout. Check if model is loaded properly';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: error.message,
      flask_url: FLASK_URL
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Plant Disease Detection API',
    endpoints: {
      health: 'GET /api/health',
      test_flask: 'GET /api/test-flask',
      predict: 'POST /api/predict (multipart/form-data with "image" field)'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Node.js backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Flask URL: ${FLASK_URL}`);
});