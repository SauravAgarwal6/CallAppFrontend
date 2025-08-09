// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function App() {
  // Check for the token in localStorage
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token; // Convert string to boolean (true if token exists)

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/" /> : <SignupPage />} />
      <Route 
        path="/" 
        element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} 
      />
    </Routes>
  );
}

export default App;