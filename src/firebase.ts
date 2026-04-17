import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Simple validation for remixed/placeholder config
const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'remixed-api-key' && 
  !firebaseConfig.apiKey.includes('TODO');

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else {
  console.warn('Firebase config is missing or invalid. Contributions feature will be disabled.');
}

export { db, auth };
