import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  waitForPendingWrites,
  onSnapshotsInSync,
  disableNetwork,
  enableNetwork,
  Firestore
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCh73Me0Jb0x-5UHHTDgph8VIMtbNIJPXI",
  authDomain: "ehsan-charity-dev.firebaseapp.com",
  projectId: "ehsan-charity-dev",
  storageBucket: "ehsan-charity-dev.appspot.com",
  messagingSenderId: "393202045574",
  appId: "1:393202045574:web:915fa20b33356bfd6bb707",
  measurementId: "G-KCK0H2BG97"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with better offline support
export const db = getFirestore(app);

// Connection state monitoring
let isConnected = false;
let isInitialized = false;
let connectionStateListeners: ((status: boolean) => void)[] = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

export const getConnectionStatus = () => isConnected;
export const getInitializationStatus = () => isInitialized;

export const setConnectionStatus = (status: boolean) => {
  const previousStatus = isConnected;
  isConnected = status;
  
  if (previousStatus !== status) {
    console.log(`Firebase connection status changed: ${status ? 'Connected' : 'Disconnected'}`);
    connectionStateListeners.forEach(listener => listener(status));
    
    if (!status && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      scheduleReconnect();
    }
  }
};

export const addConnectionStateListener = (listener: (status: boolean) => void) => {
  connectionStateListeners.push(listener);
  listener(isConnected);
};

export const removeConnectionStateListener = (listener: (status: boolean) => void) => {
  connectionStateListeners = connectionStateListeners.filter(l => l !== listener);
};

const scheduleReconnect = () => {
  setTimeout(async () => {
    reconnectAttempts++;
    console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    try {
      await enableNetwork(db);
      await validateFirebaseConnection();
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect();
      } else {
        console.error('Max reconnection attempts reached. Please check your connection.');
      }
    }
  }, RECONNECT_DELAY * reconnectAttempts);
};

// Initialize offline support with better error handling
const initializeFirestore = async () => {
  if (isInitialized) return true;

  try {
    // Enable multi-tab persistence
    await enableMultiTabIndexedDbPersistence(db);
    console.log('Multi-tab offline persistence enabled');
    isInitialized = true;
    return true;
  } catch (multiTabError) {
    console.warn('Multi-tab persistence failed, falling back to single-tab:', multiTabError);
    
    try {
      // Fallback to single-tab persistence
      await enableIndexedDbPersistence(db);
      console.log('Single-tab offline persistence enabled');
      isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to enable offline persistence:', error);
      
      if (error instanceof Error) {
        if (error.name === 'FirebaseError' && error.message.includes('already enabled')) {
          console.log('Persistence was already enabled');
          isInitialized = true;
          return true;
        }
      }
      return false;
    }
  }
};

// Validate Firebase Connection with enhanced retry logic
export const validateFirebaseConnection = async (): Promise<boolean> => {
  try {
    if (!isInitialized) {
      const initialized = await initializeFirestore();
      if (!initialized) {
        throw new Error('Failed to initialize Firestore');
      }
    }

    // Try to fetch a small amount of data to verify connection
    const querySnapshot = await getDocs(collection(db, 'beneficiaries'));
    console.log('Firebase connection validated successfully');
    
    // Ensure any pending writes are processed
    await waitForPendingWrites(db);
    
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    setConnectionStatus(true);
    return true;
  } catch (error) {
    console.error('Firebase connection validation failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Handle specific error cases
      if (error.message.includes('offline')) {
        await disableNetwork(db);
        console.log('Network disabled, operating in offline mode');
      }
    }

    setConnectionStatus(false);
    return false;
  }
};

// Initialize Firestore
initializeFirestore().catch(console.error);

// Connect to Firestore emulator in development
if (process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.warn('Firestore emulator connection failed:', error);
  }
}