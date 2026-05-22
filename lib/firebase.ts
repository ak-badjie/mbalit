// Mbalit primarily uses two Firebase data services: Firestore (documents) and
// Realtime Database (live tracking / payments). Cloud Storage is intentionally
// NOT used — images are stored as compressed base64 inside Firestore docs.
//
// Firebase Auth is initialized but is NOT the primary identity system. Login
// is still phone+PIN (bcrypt in Firestore — see lib/auth-context.tsx). Auth
// is used solely as a verified second factor: a user can optionally attach a
// recovery email (Auth account + sendPasswordResetEmail link) so that
// "Forgot PIN?" can be self-serviced via an email link instead of waiting on
// support. See `addRecoveryEmail` / `sendPinResetEmail` in auth-context.
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

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
let auth: Auth;

function initializeFirebase() {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }
        db = getFirestore(app);
        realtimeDb = getDatabase(app);
        auth = getAuth(app);
    }
}

initializeFirebase();

export { app, db, realtimeDb, auth, firebaseConfig };
