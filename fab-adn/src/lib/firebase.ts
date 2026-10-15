// Firebase configuration for ADN Motors
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Configuration will be added when user connects to Firebase
  apiKey: "demo-key",
  authDomain: "adnmotors-demo.firebaseapp.com",
  projectId: "adnmotors-demo",
  storageBucket: "adnmotors-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;