// src/components/Auth/ProtectedRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { REACT_BASE_URL } from '../config';

const ProtectedRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const accessToken =
    localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

  useEffect(() => {
    const validateToken = async () => {
      if (!accessToken) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${REACT_BASE_URL}/users/validate-token`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // If token is valid and user info is returned
        if (response.data.valid) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    validateToken();
  }, [accessToken]);

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};
export default ProtectedRoute;