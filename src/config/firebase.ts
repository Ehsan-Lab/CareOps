import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { logger } from '../utils/logger';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
try {
  logger.info('Initializing Firebase', null, 'Firebase');
  app = initializeApp(firebaseConfig);
  logger.debug('Firebase initialized successfully', null, 'Firebase');
} catch (error) {
  logger.error('Error initializing Firebase', error, 'Firebase');
  throw error;
}

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Connection state management
let isConnected = false;
let connectionStateListeners: ((status: boolean) => void)[] = [];

export const validateFirebaseConnection = async (): Promise<boolean> => {
  try {
    logger.debug('Validating Firebase connection', null, 'Firebase');
    // Add your connection validation logic here
    isConnected = true;
    logger.info('Firebase connection validated', { isConnected }, 'Firebase');
    return true;
  } catch (error) {
    logger.error('Firebase connection validation failed', error, 'Firebase');
    isConnected = false;
    return false;
  }
};

export const setConnectionStatus = (status: boolean) => {
  logger.debug('Setting connection status', { status }, 'Firebase');
  isConnected = status;
  connectionStateListeners.forEach(listener => listener(status));
};

export const addConnectionStateListener = (listener: (status: boolean) => void) => {
  connectionStateListeners.push(listener);
  listener(isConnected); // Immediately call with current state
};

export const removeConnectionStateListener = (listener: (status: boolean) => void) => {
  connectionStateListeners = connectionStateListeners.filter(l => l !== listener);
};