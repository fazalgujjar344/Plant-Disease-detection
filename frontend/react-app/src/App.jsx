import React, { useState } from 'react';
import { Container, Typography, Box, Button, CircularProgress, Alert, Paper } from '@mui/material';
import { uploadImage, checkHealth } from './services/api';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);

  const checkBackendHealth = async () => {
    try {
      const health = await checkHealth();
      setBackendStatus({ status: 'healthy', data: health });
      alert('✅ Backend is healthy!');
    } catch (err) {
      setBackendStatus({ status: 'unhealthy', error: err.message });
      alert('❌ Backend not running! Start Node.js server first.');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large! Max 10MB');
      return;
    }

    setSelectedImage(URL.createObjectURL(file));
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await uploadImage(file);
      console.log('Prediction response:', response);
      setResult(response);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom sx={{ color: '#2e7d32' }}>
          🌿 Plant Disease Detection
        </Typography>
        
        <Button 
          variant="outlined" 
          onClick={checkBackendHealth}
          sx={{ mb: 3 }}
          color="primary"
        >
          Check Backend Health
        </Button>

        <Box sx={{ my: 3 }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button 
              variant="contained" 
              component="span"
              size="large"
              sx={{ backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}
            >
              Upload Leaf Image
            </Button>
          </label>
        </Box>

        {selectedImage && (
          <Box sx={{ my: 2 }}>
            <img 
              src={selectedImage} 
              alt="Selected leaf" 
              style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px' }} 
            />
          </Box>
        )}

        {loading && (
          <Box sx={{ my: 3 }}>
            <CircularProgress />
            <Typography sx={{ mt: 1 }}>Analyzing image...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {result && result.success && (
          <Paper elevation={3} sx={{ mt: 3, p: 3, bgcolor: '#e8f5e9' }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#2e7d32' }}>
              🔍 Prediction Result
            </Typography>
            <Typography variant="h6">
              Disease: <strong>{result.prediction}</strong>
            </Typography>
            <Typography variant="body1">
              Confidence: {(result.confidence * 100).toFixed(2)}%
            </Typography>
            {result.top_3 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Top 3 possibilities:
                </Typography>
                {result.top_3.map((item, idx) => (
                  <Typography key={idx} variant="body2">
                    {idx + 1}. {item.disease}: {(item.confidence * 100).toFixed(2)}%
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
        )}

        {result && !result.success && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {result.error || 'Prediction failed'}
          </Alert>
        )}
      </Box>
    </Container>
  );
}

export default App;         