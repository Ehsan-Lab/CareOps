import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  collection, 
  getDocs, 
  addDoc,
  deleteDoc
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

const defaultCategories = [
  { name: 'General Fund', balance: 0, type: 'INCOME' },
  { name: 'Medical Support', balance: 0, type: 'EXPENSE' },
  { name: 'Feeding', balance: 0, type: 'EXPENSE' },
  { name: 'Emergency Aid', balance: 0, type: 'EXPENSE' }
];

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
      await enableIndexedDbPersistence(db);
    }

    if (import.meta.env.DEV) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }

    // Check and create default categories
    const treasuryRef = collection(db, 'treasury');
    const treasurySnapshot = await getDocs(treasuryRef);
    
    // Delete existing categories
    for (const doc of treasurySnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // Create new categories
    for (const category of defaultCategories) {
      await addDoc(treasuryRef, {
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Firestore initialization error:', error);
      if ('code' in error && error.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if ('code' in error && error.code === 'unimplemented') {
        console.warn('The current browser does not support persistence.');
      } else {
        throw error;
      }
    }
  }
};

// Initialize and export validation function
initializeFirestore().catch(console.error);

export { db, validateFirebaseConnection };