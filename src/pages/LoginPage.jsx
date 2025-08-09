// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import api from '../api';
import api from '../../api';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send a request to the backend login endpoint
      const response = await api.post('/auth/login', { username, password });
      
      // If login is successful, backend sends back a token
      const { token } = response.data;
      
      // Save the token to localStorage
      localStorage.setItem('token', token);
      
      // Navigate to the home page
      navigate('/');
      window.location.reload(); // Force a reload to update auth status
      
    } catch (error) {
      alert(error.response.data.msg || 'Login failed.');
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
        <p>
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;