import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, setDoc, collection, serverTimestamp, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAHd6RtJ-KN8aiJ3dHk1Sxg8PixZQeirdc",
    authDomain: "mbalit-8a52f.firebaseapp.com",
    projectId: "mbalit-8a52f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const orgId = "street-clean-mv5f";
    const ref = doc(db, "organizations", orgId);
    
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        console.error("Organization not found!");
        process.exit(1);
    }

    const currentBalance = snap.data().walletBalance || 0;
    console.log("Current Balance:", currentBalance);
    
    await updateDoc(ref, {
        walletBalance: currentBalance + 100,
        updatedAt: serverTimestamp()
    });
    
    const txRef = doc(collection(db, "walletTransactions"));
    await setDoc(txRef, {
        walletId: orgId,
        walletType: "organization",
        type: "credit",
        direction: "credit",
        amount: 100,
        title: "Test Top-up",
        description: "Admin script deposit",
        balanceAfter: currentBalance + 100,
        createdAt: serverTimestamp()
    });
    
    console.log("Successfully added 100 Dalasis!");
    process.exit(0);
}

run().catch(console.error);
