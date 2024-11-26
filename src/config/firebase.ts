import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  collection, 
  getDocs, 
  addDoc 
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

// Initialize Firestore
const db = getFirestore(app);

// Add this function to validate Firebase connection
const validateFirebaseConnection = async () => {
  try {
    // Try to read from a collection to validate connection
    const testRef = collection(db, 'test_connection');
    await getDocs(testRef);
    console.log('Firebase connection successful');
    return true;
  } catch (error) {
    console.error('Firebase connection error:', error);
    return false;
  }
};

// Modify your initialize function
const initializeFirestore = async () => {
  try {
    // First validate connection
    const isConnected = await validateFirebaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Firebase');
    }

    // Rest of your initialization code...
    if (typeof window !== 'undefined') {
      await enableIndexedDbPersistence(db, {
        synchronizeTabs: true
      });
    }

    if (import.meta.env.DEV) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }

    const treasurySnapshot = await getDocs(collection(db, 'treasury'));
    
    if (treasurySnapshot.empty) {
      const defaultCategories = [
        { name: 'General Fund', balance: 0 },
        { name: 'Feeding Program', balance: 0 },
        { name: 'Emergency Aid', balance: 0 }
      ];

      for (const category of defaultCategories) {
        await addDoc(collection(db, 'treasury'), category);
      }
      
      console.log('Default treasury categories created');
    }
  } catch (err: any) {
    console.error('Firestore initialization error:', err);
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    } else {
      throw err; // Re-throw other errors
    }
  }
};

// Initialize and export validation function
initializeFirestore().catch(console.error);

export { db, validateFirebaseConnection };