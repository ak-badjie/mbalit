import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAHd6RtJ-KN8aiJ3dHk1Sxg8PixZQeirdc",
    authDomain: "mbalit-8a52f.firebaseapp.com",
    projectId: "mbalit-8a52f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadSetting() {
    try {
        await setDoc(doc(db, 'settings', 'app'), {
            requireStandaloneDevice: false
        }, { merge: true });
        console.log('Setting uploaded successfully: requireStandaloneDevice = false');
        process.exit(0);
    } catch (e) {
        console.error('Error uploading setting', e);
        process.exit(1);
    }
}

uploadSetting();
