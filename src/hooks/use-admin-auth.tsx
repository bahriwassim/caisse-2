"use client";

import { useState, useEffect } from 'react';

const ADMIN_CREDENTIALS = {
  email: 'contact@startindev.com',
  password: 'startindev'
};

const STORAGE_KEY = 'admin_authenticated';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 heures

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = loading
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà authentifié
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const { timestamp } = JSON.parse(stored);
          const isValid = Date.now() - timestamp < SESSION_DURATION;
          
          if (isValid) {
            setIsAuthenticated(true);
          } else {
            // Session expirée
            localStorage.removeItem(STORAGE_KEY);
            setIsAuthenticated(false);
            setShowLogin(true);
          }
        } else {
          setIsAuthenticated(false);
          setShowLogin(true);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        setIsAuthenticated(false);
        setShowLogin(true);
      }
    };

    checkAuth();
  }, []);

  const login = (email: string, password: string): boolean => {
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const authData = {
        timestamp: Date.now(),
        email: email
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      setIsAuthenticated(true);
      setShowLogin(false);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setShowLogin(true);
  };

  return {
    isAuthenticated,
    showLogin,
    login,
    logout,
    isLoading: isAuthenticated === null
  };
};