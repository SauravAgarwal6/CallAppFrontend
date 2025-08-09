// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://saurav-call-app-backend.onrender.com/api', // <-- ADD /api HERE
});

// This is the interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set the x-auth-token header
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
