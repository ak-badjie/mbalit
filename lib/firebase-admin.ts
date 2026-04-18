import { App, cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { Firestore, getFirestore, FieldValue } from 'firebase-admin/firestore';

let app: App | null = null;
let initError: string | null = null;

function getAdminApp(): App | null {
    if (app) return app;
    if (getApps().length > 0) {
        app = getApps()[0]!;
        return app;
    }
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.private_key && typeof parsed.private_key === 'string') {
                parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
            }
            app = initializeApp({
                credential: cert(parsed),
                projectId: projectId || parsed.project_id,
            });
            return app;
        }
        // Fall back to application default credentials (e.g. on Google infrastructure).
        app = initializeApp({
            credential: applicationDefault(),
            projectId,
        });
        return app;
    } catch (err) {
        initError = err instanceof Error ? err.message : String(err);
        console.error('Failed to initialize firebase-admin:', initError);
        return null;
    }
}

export function getAdminFirestore(): Firestore | null {
    const a = getAdminApp();
    if (!a) return null;
    return getFirestore(a);
}

export function getAdminInitError(): string | null {
    return initError;
}

export { FieldValue };
