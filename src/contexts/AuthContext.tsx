/**
 * @module AuthContext
 * @description Authentication context provider and hooks for managing user authentication state
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/firebase/authService';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * @interface AuthContextType
 * @description Type definition for the authentication context
 */
interface AuthContextType {
  /** Current authenticated user or null if not authenticated */
  user: User | null;
  /** Loading state while checking authentication */
  loading: boolean;
  /** Function to sign out the current user */
  signOut: () => Promise<void>;
}

/**
 * @constant
 * @description Context for managing authentication state
 * @default undefined
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @component AuthProvider
 * @description Provider component that manages authentication state and navigation
 * Handles automatic navigation based on auth state and provides auth context to children
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be wrapped
 * @returns {JSX.Element} Provider component with authentication context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Set up authentication state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // If we're at login page and user is authenticated, redirect to payment-requests
        if (location.pathname === '/login') {
          navigate('/payment-requests', { replace: true });
        }
      } else {
        // If user is not authenticated and not at login page, redirect to login
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [navigate, location.pathname]);

  /**
   * Signs out the current user and redirects to login page
   * @throws {Error} If sign out fails
   */
  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
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

/**
 * @hook useAuth
 * @description Custom hook to access the authentication context
 * @throws {Error} If used outside of AuthProvider
 * @returns {AuthContextType} The authentication context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 