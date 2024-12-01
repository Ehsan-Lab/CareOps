import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Connection state management
let isConnected = false;
let connectionStateListeners: ((status: boolean) => void)[] = [];

export const validateFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Add your connection validation logic here
    isConnected = true;
    return true;
  } catch (error) {
    console.error('Firebase connection validation failed:', error);
    isConnected = false;
    return false;
  }
};

export const setConnectionStatus = (status: boolean) => {
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