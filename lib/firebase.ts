import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC7mhuZypiBKFmJPk7vdtMGr_IXcKLP1aI",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mbalit-490022.firebaseapp.com",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://mbalit-490022-default-rtdb.firebaseio.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mbalit-490022",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mbalit-490022.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "549954354577",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:549954354577:web:e0d0f012e7c20831ad2e30",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XFJD983XVC"
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let realtimeDb: Database;
let storage: FirebaseStorage;

function initializeFirebase() {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }

        auth = getAuth(app);
        db = getFirestore(app);
        realtimeDb = getDatabase(app);
        storage = getStorage(app);
    }
}

// Initialize on import
initializeFirebase();

export { app, auth, db, realtimeDb, storage, firebaseConfig };
