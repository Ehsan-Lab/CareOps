/**
 * @module AuthService
 * @description Service for handling authentication operations using Firebase Auth
 */

import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth } from '../../config/firebase';

/**
 * @namespace authService
 * @description Service object containing authentication-related operations
 */
export const authService = {
  /**
   * Signs in a user with email and password
   * @async
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<User>} Firebase User object if successful
   * @throws {Error} If sign in fails
   */
  signIn: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  /**
   * Signs out the currently authenticated user
   * @async
   * @throws {Error} If sign out fails
   */
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  /**
   * Gets the current authenticated user
   * @returns {Promise<User | null>} Promise that resolves with the current user or null if not authenticated
   */
  getCurrentUser: (): Promise<User | null> => {
    return new Promise((resolve) => {
      const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  },

  /**
   * Sets up a listener for authentication state changes
   * @param {function} callback - Function to be called when auth state changes
   * @param {User | null} callback.user - The current user object or null if signed out
   * @returns {function} Unsubscribe function to remove the listener
   */
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return firebaseOnAuthStateChanged(auth, callback);
  }
}; 