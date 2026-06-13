import axios from 'axios';

// Use the correct Node.js backend URL
const API_BASE_URL = 'http://localhost:5001/api';

// Upload image and get prediction
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Check backend health
export const checkHealth = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}; 