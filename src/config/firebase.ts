import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

// Validate Firebase Connection
export const validateFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Try to fetch a small amount of data to verify connection
    const querySnapshot = await getDocs(collection(db, 'donors'));
    return true;
  } catch (error) {
    console.error('Firebase connection validation failed:', error);
    return false;
  }
};

export { db };