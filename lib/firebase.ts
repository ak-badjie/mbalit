// Mbalit uses ONLY two Firebase services:
//   - Cloud Firestore (document data)
//   - Realtime Database (live tracking / payments)
//
// Firebase Auth, Cloud Storage, and Cloud Messaging are intentionally NOT
// initialized. Login is phone + 6-digit PIN with bcrypt hashing in Firestore
// (see lib/auth-context.tsx). Images are stored as compressed base64 inside
// Firestore docs.
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

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

let app: FirebaseApp;
let db: Firestore;
let realtimeDb: Database;

function initializeFirebase() {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }
        db = getFirestore(app);
        realtimeDb = getDatabase(app);
    }
}

initializeFirebase();

export { app, db, realtimeDb, firebaseConfig };
