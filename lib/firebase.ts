// Mbalit only uses two Firebase data services: Firestore (documents) and
// Realtime Database (live tracking / payments). Cloud Storage is intentionally
// NOT used — images are stored as compressed base64 inside Firestore docs.
// Firebase Auth is kept solely as the underlying token store for the custom
// phone+PIN onboarding (see lib/auth-context.tsx).
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAHd6RtJ-KN8aiJ3dHk1Sxg8PixZQeirdc",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mbalit-8a52f.firebaseapp.com",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://mbalit-8a52f-default-rtdb.firebaseio.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mbalit-8a52f",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mbalit-8a52f.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "379887952578",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:379887952578:web:fa411280e5e5cbad5d915b",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ZK84Y6WDDW"
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let realtimeDb: Database;

function initializeFirebase() {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }

        auth = getAuth(app);

        // Ensure the session persists across page reloads
        setPersistence(auth, browserLocalPersistence).catch((error) => {
            console.error("Error setting persistence:", error);
        });

        db = getFirestore(app);
        realtimeDb = getDatabase(app);
    }
}

// Initialize on import
initializeFirebase();

export { app, auth, db, realtimeDb, firebaseConfig };
