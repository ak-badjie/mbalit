'use client';

/**
 * Act I — The Story
 * Six opening scenes that anchor the deck in real lives before any
 * product walkthrough. Every photo and every line of copy is sourced
 * from `app/demo/content/stories.ts` — do not hardcode anything here.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BlurFocus,
    SceneEyebrow,
    SceneTitle,
    SwipeIn,
    Typewriter,
} from '../primitives';
import { useSceneCue } from '../audio';
import { S1, S2, S3, S4, S5, S5_TESTIMONIES, S6, type StoryImage } from '../content/stories';

/** Decimal-aware counter (CounterTicker only handles integers). */
function DecimalCounter({
    to,
    decimals,
    suffix = '',
    duration = 1.6,
    delay = 0,
}: {
    to: number;
    decimals: number;
    suffix?: string;
    duration?: number;
    delay?: number;
}) {
    const [v, setV] = React.useState(0);
    React.useEffect(() => {
        let raf = 0;
        const start = performance.now() + delay * 1000;
        const tick = (now: number) => {
            const t = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
            const eased = 1 - Math.pow(1 - t, 3);
            setV(eased * to);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [to, duration, delay]);
    return <>{v.toFixed(decimals)}{suffix}</>;
}

/* --- shared helpers -------------------------------------------------- */

function FullBleedPhoto({
    image,
    kenBurns = true,
    overlay = 'rgba(0,0,0,0.55)',
}: {
    image: StoryImage;
    kenBurns?: boolean;
    overlay?: string;
}) {
    return (
        <div className="absolute inset-0 overflow-hidden bg-black">
            <motion.div
                initial={kenBurns ? { scale: 1.05 } : false}
                animate={kenBurns ? { scale: 1.18 } : undefined}
                transition={kenBurns ? { duration: 14, ease: 'linear' } : undefined}
                className="absolute inset-0"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
            </motion.div>
            <div className="absolute inset-0" style={{ background: overlay }} />
            {/* corner credit */}
            <div className="absolute bottom-3 left-4 text-[10px] uppercase tracking-widest text-white/40 font-mono">
                {image.credit}
            </div>
        </div>
    );
}

/* --- Scene 1: The fields -------------------------------------------- */
export function Act1Scene1() {
    useSceneCue('story-open');
    return (
        <div className="absolute inset-0">
            <FullBleedPhoto image={S1.image} overlay="linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 100%)" />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 px-12">
                <BlurFocus delay={0.4}>
                    <SceneEyebrow>{S1.eyebrow}</SceneEyebrow>
                </BlurFocus>
                <div className="mt-4 max-w-3xl text-center">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                        <Typewriter text={S1.line} delay={1100} speed={42} />
                    </h2>
                </div>
            </div>
        </div>
    );
}

/* --- Scene 2: The smoke --------------------------------------------- */
export function Act1Scene2() {
    useSceneCue('story-smoke');
    const [phase, setPhase] = React.useState<0 | 1>(0);
    React.useEffect(() => {
        setPhase(0);
        const t = setTimeout(() => setPhase(1), 4200);
        return () => clearTimeout(t);
    }, []);
    return (
        <div className="absolute inset-0">
            {/* crossfading photos */}
            <AnimatePresence>
                <motion.div
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4 }}
                    className="absolute inset-0"
                >
                    <FullBleedPhoto image={S2.images[phase]} overlay="linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.85) 100%)" />
                </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 grid grid-cols-2 items-center px-12 gap-12 max-w-7xl mx-auto">
                <div>
                    <SceneEyebrow>{S2.eyebrow}</SceneEyebrow>
                    <div className="mt-3">
                        <SceneTitle>{S2.line}</SceneTitle>
                    </div>
                </div>
                <div className="space-y-6">
                    {S2.stats.map((s, i) => (
                        <SwipeIn key={s.label} from="right" delay={0.5 + i * 0.4} className="bg-black/60 backdrop-blur rounded-2xl p-5 border border-white/10">
                            <div className="text-5xl font-bold tabular-nums text-amber-400">
                                {s.prefix}
                                <DecimalCounter
                                    to={s.value}
                                    decimals={s.decimals}
                                    duration={1.6}
                                    delay={0.6 + i * 0.4}
                                    suffix={s.suffix}
                                />
                            </div>
                            <div className="text-sm text-white/70 mt-1">{s.label}</div>
                        </SwipeIn>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* --- Scene 3: 15 pence a bag ---------------------------------------- */
export function Act1Scene3() {
    useSceneCue('story-coin');
    const [stage, setStage] = React.useState<'big' | 'crash' | 'done'>('big');
    React.useEffect(() => {
        setStage('big');
        const t1 = setTimeout(() => setStage('crash'), 1400);
        const t2 = setTimeout(() => setStage('done'), 3000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // £15 dramatized → crashing to £0.15 actual
    const display = stage === 'big' ? 15 : 0.15;

    return (
        <div className="absolute inset-0">
            <FullBleedPhoto image={S3.image} overlay="linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 60%)" />
            <div className="absolute inset-0 grid grid-cols-2 items-center px-12 gap-12 max-w-7xl mx-auto">
                <div>
                    <SceneEyebrow>{S3.eyebrow}</SceneEyebrow>
                    <div className="mt-3">
                        <SceneTitle>{S3.line}</SceneTitle>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: stage !== 'big' ? 1 : 0, y: stage !== 'big' ? 0 : 12 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mt-8 text-lg italic text-white/70 max-w-md leading-relaxed"
                    >
                        {S3.quote}
                    </motion.div>
                </div>
                <div className="flex justify-center">
                    <motion.div
                        animate={{
                            scale: stage === 'big' ? 1 : stage === 'crash' ? [1, 0.4, 0.5] : 0.5,
                            color: stage === 'done' ? '#ef4444' : '#fbbf24',
                        }}
                        transition={{ duration: 1.2 }}
                        className="text-[160px] md:text-[200px] font-bold tabular-nums leading-none"
                        style={{ textShadow: '0 8px 30px rgba(0,0,0,0.6)' }}
                    >
                        £
                        <motion.span
                            key={display}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            {display.toFixed(2)}
                        </motion.span>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

/* --- Scene 4: Neneh ------------------------------------------------- */
export function Act1Scene4() {
    useSceneCue('story-neneh');
    const [beat, setBeat] = React.useState(0);
    React.useEffect(() => {
        setBeat(0);
        const timers = S4.beats.map((_, i) =>
            setTimeout(() => setBeat(i + 1), 600 + i * 1700)
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="absolute inset-0 bg-black">
            {/* split photos */}
            <div className="absolute inset-0 grid grid-cols-2">
                <div className="relative overflow-hidden">
                    <motion.img
                        src={S4.before.src}
                        alt={S4.before.alt}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1.15 }}
                        transition={{ duration: 16, ease: 'linear' }}
                        className="w-full h-full object-cover grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/60" />
                    <div className="absolute bottom-3 left-4 text-[10px] uppercase tracking-widest text-white/40 font-mono">
                        {S4.beforeLabel} · {S4.before.credit}
                    </div>
                </div>
                <div className="relative overflow-hidden">
                    <motion.img
                        src={S4.after.src}
                        alt={S4.after.alt}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1.15 }}
                        transition={{ duration: 16, ease: 'linear' }}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-transparent to-black/60" />
                    <div className="absolute bottom-3 right-4 text-[10px] uppercase tracking-widest text-white/40 font-mono">
                        {S4.afterLabel} · {S4.after.credit}
                    </div>
                </div>
            </div>

            {/* center title + biographical beats */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-12 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md rounded-3xl px-10 py-8 max-w-2xl text-center border border-white/10">
                    <SceneEyebrow>{S4.eyebrow}</SceneEyebrow>
                    <div className="mt-3 mb-6">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                            {S4.title}
                        </h2>
                    </div>
                    <ul className="space-y-2 text-left text-base md:text-lg text-white/85">
                        {S4.beats.map((b, i) => (
                            <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{
                                    opacity: beat > i ? 1 : 0,
                                    x: beat > i ? 0 : -16,
                                }}
                                transition={{ duration: 0.4 }}
                                className="flex gap-3"
                            >
                                <span className="text-emerald-400 font-mono text-sm pt-1">·</span>
                                <span>
                                    {beat > i ? <Typewriter text={b} delay={0} speed={22} /> : null}
                                </span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/* --- Scene 5: The voices -------------------------------------------- */
export function Act1Scene5() {
    useSceneCue('story-voices');
    const [shown, setShown] = React.useState(0);
    React.useEffect(() => {
        setShown(0);
        const timers = S5_TESTIMONIES.map((_, i) =>
            setTimeout(() => setShown(i + 1), 400 + i * 1500)
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="absolute inset-0">
            <FullBleedPhoto
                image={S5.backdrop}
                overlay="linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.92) 100%)"
            />
            <div className="absolute inset-0 px-12 pt-20 pb-16 flex flex-col items-center">
                <SceneEyebrow>{S5.eyebrow}</SceneEyebrow>
                <div className="mt-3 mb-10 max-w-3xl text-center">
                    <SceneTitle>{S5.title}</SceneTitle>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl w-full overflow-hidden">
                    {S5_TESTIMONIES.map((t, i) => (
                        <motion.div
                            key={t.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{
                                opacity: shown > i ? 1 : 0,
                                y: shown > i ? 0 : 30,
                            }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 backdrop-blur"
                        >
                            <div className="flex items-baseline justify-between gap-3 mb-2">
                                <div>
                                    <div className="font-bold text-white">{t.name}</div>
                                    <div className="text-xs text-white/50">{t.role}</div>
                                </div>
                                <div className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono whitespace-nowrap">
                                    {t.source}
                                </div>
                            </div>
                            <div className="text-white/80 italic text-sm leading-relaxed">
                                &ldquo;{t.quote}&rdquo;
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* --- Scene 6: The bridge -------------------------------------------- */
export function Act1Scene6() {
    useSceneCue('story-bridge');
    const [phase, setPhase] = React.useState<0 | 1>(0);
    React.useEffect(() => {
        setPhase(0);
        // single crossfade: problem photo → proof photo, no loop
        const t = setTimeout(() => setPhase(1), 3500);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="absolute inset-0">
            {/* slow-rotating background photos */}
            <AnimatePresence>
                <motion.div
                    key={phase}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1.12 }}
                    exit={{ opacity: 0 }}
                    transition={{ opacity: { duration: 1.2 }, scale: { duration: 4, ease: 'linear' } }}
                    className="absolute inset-0"
                >
                    <FullBleedPhoto image={S6.images[phase]} kenBurns={false} overlay="linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%)" />
                </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
                <BlurFocus delay={0.3}>
                    <SceneEyebrow>{S6.eyebrow}</SceneEyebrow>
                </BlurFocus>
                <div className="mt-5 max-w-4xl">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                        <Typewriter text={S6.line} delay={900} speed={36} />
                    </h2>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 4.2, duration: 0.8 }}
                    className="mt-8 text-xl text-emerald-400 font-semibold tracking-wide"
                >
                    {S6.sub}
                </motion.div>
            </div>
        </div>
    );
}
