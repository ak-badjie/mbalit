/**
 * One-off clean slate: removes every account and all account-derived data
 * from Firestore and the Realtime Database.
 *
 * Deliberately KEEPS `settings/app` — that's platform configuration
 * (requireStandaloneDevice), not an account.
 *
 * Run with:  node --env-file=.env.local scripts/_wipe-accounts.mjs --confirm
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { getDatabase, ref, remove, get } from 'firebase/database';

const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Every collection that holds account or account-derived data.
// `settings` is intentionally absent.
const COLLECTIONS = [
    'users',
    'organizations',
    'collectorProfiles',
    'collectorStats',
    'collectorSettings',
    'wallets',
    'walletTransactions',
    'withdrawals',
    'notifications',
    'subscriptions',
    'payments',
    'paymentOffers',
    'pickupRequests',
    'requests',
    'jobs',
    'reviews',
    'reports',
    'environmentalReports',
    'pinResetRequests',
    'pinResetAuditLog',
];

const RTDB_PATHS = ['collectors', 'jobs', 'paymentRequests'];

if (!process.argv.includes('--confirm')) {
    console.error('Refusing to run without --confirm.');
    process.exit(1);
}

let total = 0;
for (const name of COLLECTIONS) {
    try {
        const snap = await getDocs(collection(db, name));
        if (snap.empty) {
            console.log(`  ${name}: empty`);
            continue;
        }
        let n = 0;
        // Sequential deletes — these collections are tiny and this keeps a
        // partial failure easy to read in the log.
        for (const d of snap.docs) {
            await deleteDoc(doc(db, name, d.id));
            n++;
        }
        total += n;
        console.log(`  ${name}: deleted ${n}`);
    } catch (e) {
        console.log(`  ${name}: ERROR ${e.code || e.message}`);
    }
}

for (const path of RTDB_PATHS) {
    try {
        const snap = await get(ref(rtdb, path));
        const count = snap.exists() && snap.val() && typeof snap.val() === 'object'
            ? Object.keys(snap.val()).length : 0;
        await remove(ref(rtdb, path));
        console.log(`  rtdb/${path}: removed (${count} entries)`);
    } catch (e) {
        console.log(`  rtdb/${path}: ERROR ${e.code || e.message}`);
    }
}

console.log(`\nDeleted ${total} Firestore documents. settings/app was preserved.`);
process.exit(0);
