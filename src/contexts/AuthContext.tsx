/**
 * @module AuthContext
 * @description Authentication context provider and hooks for managing user authentication state
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/firebase/authService';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '../utils/logger';

interface LocationState {
  from: {
    pathname: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    logger.debug('Setting up auth state listener', null, 'AuthProvider');
    
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        logger.info('User authenticated', { userId: user.uid }, 'AuthProvider');
        
        if (location.pathname === '/login') {
          const state = location.state as LocationState;
          const from = state?.from?.pathname || '/';
          logger.debug('Redirecting after login', { from }, 'AuthProvider');
          navigate(from, { replace: true });
        }
      } else {
        logger.info('User not authenticated', null, 'AuthProvider');
        
        if (location.pathname !== '/login') {
          logger.debug('Redirecting to login', { from: location.pathname }, 'AuthProvider');
          navigate('/login', { 
            replace: true,
            state: { from: location }
          });
        }
      }
    });

    return () => {
      logger.debug('Cleaning up auth state listener', null, 'AuthProvider');
      unsubscribe();
    };
  }, [navigate, location]);

  const signOut = async () => {
    try {
      logger.info('User signing out', null, 'AuthProvider');
      await authService.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      logger.error('Error signing out', error, 'AuthProvider');
    }
  };

  const value = {
    user,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    logger.error('useAuth must be used within an AuthProvider', null, 'useAuth');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 