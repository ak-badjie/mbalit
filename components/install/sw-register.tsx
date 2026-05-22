'use client';

import { useEffect } from 'react';

/**
 * Registers the MBalit service worker on first client render.
 * Without this, Chromium browsers won't surface the install prompt.
 */
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        // Run on idle so it never blocks first paint.
        const register = () => {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .catch((err) => {
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn('SW registration failed:', err);
                    }
                });
        };
        const ric = (window as any).requestIdleCallback;
        if (typeof ric === 'function') {
            ric(register);
        } else {
            window.addEventListener('load', register, { once: true });
        }
    }, []);
    return null;
}

export default ServiceWorkerRegister;
