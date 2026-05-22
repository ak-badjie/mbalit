'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Lightweight audio-cue system for the /demo deck.
 *
 * Silent by default — the presenter can toggle sound on with the speaker
 * button in the top-right chrome. When OFF (the default), every hook is a
 * no-op and no audio elements are created or fetched.
 *
 * To wire actual sounds later, drop files into `public/demo/` and reference
 * them by name in `useSceneCue('whoosh')` / `playCue('ding')`. Until then
 * cue calls are deliberately silent and won't error.
 */

type AudioCtx = {
    enabled: boolean;
    setEnabled: (v: boolean) => void;
    playCue: (name: string) => void;
};

const Ctx = createContext<AudioCtx>({
    enabled: false,
    setEnabled: () => {},
    playCue: () => {},
});

export function DemoAudioProvider({ children }: { children: React.ReactNode }) {
    const [enabled, setEnabled] = useState(false);
    const cache = useRef<Record<string, HTMLAudioElement>>({});

    const playCue = useCallback(
        (name: string) => {
            if (!enabled || typeof window === 'undefined') return;
            try {
                let el = cache.current[name];
                if (!el) {
                    el = new Audio(`/demo/${name}.mp3`);
                    el.volume = 0.4;
                    cache.current[name] = el;
                }
                // If the asset is missing the browser will reject playback —
                // swallow it so the deck stays silent rather than throwing.
                el.currentTime = 0;
                void el.play().catch(() => {});
            } catch {
                /* silent */
            }
        },
        [enabled]
    );

    return <Ctx.Provider value={{ enabled, setEnabled, playCue }}>{children}</Ctx.Provider>;
}

export function useDemoAudio() {
    return useContext(Ctx);
}

/** Fire a one-shot cue when the calling scene mounts. No-op if sound is off. */
export function useSceneCue(name: string) {
    const { playCue } = useDemoAudio();
    useEffect(() => {
        playCue(name);
    }, [name, playCue]);
}
