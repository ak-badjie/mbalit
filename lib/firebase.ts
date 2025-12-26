import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjpMjsD6B0_RYPZBS1aYkVvDsMwpUp04M",
    authDomain: "mbalit.firebaseapp.com",
    databaseURL: "https://mbalit-default-rtdb.firebaseio.com",
    projectId: "mbalit",
    storageBucket: "mbalit.firebasestorage.app",
    messagingSenderId: "858680182430",
    appId: "1:858680182430:web:d91484009cdc0929d25d8f",
    measurementId: "G-LCDGSPYH4F"
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
