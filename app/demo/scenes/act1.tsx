'use client';

/**
 * Act I — The Story
 *
 * Nine opening scenes that anchor the deck in real lives and three
 * specific environmental crimes before any product walkthrough.
 *
 * Order:
 *   01 The fields           (opening tableau)
 *   02 Problem 1 · Water    (Gunjur, Bolong Fenyo)
 *   03 Problem 2 · Streets  (flooded roads, market overflow)
 *   04 Problem 3 · Burning  (Bakoteh smoke + active fire)
 *   05 Problem 4 · Forests  (Brufut cattle on plastic, forest dump)
 *   06 The human cost       (£0.15 wage crash + sick-child photos)
 *   07 Neneh's story        (before / after split)
 *   08 The voices           (5 named testimonies)
 *   09 The vision           (COLLECT → SORT → RECYCLE → GOODS)
 *
 * Every photo and every line of copy is sourced from
 * `app/demo/content/stories.ts` — do not hardcode anything here.
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
import {
    SCENE_FIELDS,
    PROBLEM_WATER,
    PROBLEM_STREETS,
    PROBLEM_BURNING,
    PROBLEM_FORESTS,
    HUMAN_COST,
    NENEH,
    VOICES,
    TESTIMONIES,
    VISION,
    type ProblemBlock,
    type StoryImage,
} from '../content/stories';

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

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
    return (
        <>
            {v.toFixed(decimals)}
            {suffix}
        </>
    );
}

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
            <div className="absolute bottom-3 left-4 text-[10px] uppercase tracking-widest text-white/40 font-mono">
                {image.credit}
            </div>
        </div>
    );
}

function CitationsFooter({ items }: { items: string[] }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8, duration: 0.8 }}
            className="absolute bottom-6 right-6 text-[10px] text-white/40 font-mono uppercase tracking-widest pointer-events-none max-w-md text-right"
        >
            Sources: {items.join(' · ')}
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  01 — The fields (opening tableau)                                  */
/* ------------------------------------------------------------------ */
export function Act1Fields() {
    useSceneCue('story-open');
    return (
        <div className="absolute inset-0">
            <FullBleedPhoto
                image={SCENE_FIELDS.image}
                overlay="linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 100%)"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 px-12">
                <BlurFocus delay={0.4}>
                    <SceneEyebrow>{SCENE_FIELDS.eyebrow}</SceneEyebrow>
                </BlurFocus>
                <div className="mt-4 max-w-3xl text-center">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                        <Typewriter text={SCENE_FIELDS.line} delay={1100} speed={42} />
                    </h2>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Shared ProblemScene  (used for all four problems)                  */
/* ------------------------------------------------------------------ */

function ProblemScene({ block }: { block: ProblemBlock }) {
    const [phase, setPhase] = React.useState<0 | 1>(0);
    React.useEffect(() => {
        setPhase(0);
        if (!block.secondary) return;
        const t = setTimeout(() => setPhase(1), 4500);
        return () => clearTimeout(t);
    }, [block.secondary]);

    const currentImage =
        phase === 1 && block.secondary ? block.secondary : block.primary;

    return (
        <div className="absolute inset-0">
            {/* crossfading photo backdrop */}
            <AnimatePresence>
                <motion.div
                    key={currentImage.src}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4 }}
                    className="absolute inset-0"
                >
                    <FullBleedPhoto
                        image={currentImage}
                        overlay="linear-gradient(90deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.85) 100%)"
                    />
                </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 grid grid-cols-2 items-center px-12 gap-12 max-w-7xl mx-auto">
                {/* left: copy */}
                <div>
                    <SceneEyebrow>{block.eyebrow}</SceneEyebrow>
                    <div className="mt-3">
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                            <Typewriter text={block.headline} delay={400} speed={36} />
                        </h2>
                    </div>
                    {block.body && (
                        <motion.p
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.6, duration: 0.7 }}
                            className="mt-6 text-base md:text-lg text-white/75 max-w-md leading-relaxed"
                        >
                            {block.body}
                        </motion.p>
                    )}
                </div>

                {/* right: stat cards */}
                <div className="space-y-5">
                    {block.stats.map((s, i) => (
                        <SwipeIn
                            key={s.label}
                            from="right"
                            delay={0.7 + i * 0.4}
                            className="bg-black/65 backdrop-blur rounded-2xl p-5 border border-white/10"
                        >
                            <div className="text-5xl font-bold tabular-nums text-amber-400">
                                {s.prefix}
                                <DecimalCounter
                                    to={s.value}
                                    decimals={s.decimals}
                                    duration={1.6}
                                    delay={0.85 + i * 0.4}
                                    suffix={s.suffix}
                                />
                            </div>
                            <div className="text-sm text-white/70 mt-1 leading-snug">
                                {s.label}
                            </div>
                        </SwipeIn>
                    ))}
                </div>
            </div>

            <CitationsFooter items={block.citations} />
        </div>
    );
}

export function Act1Water() {
    useSceneCue('story-water');
    return <ProblemScene block={PROBLEM_WATER} />;
}

export function Act1Streets() {
    useSceneCue('story-streets');
    return <ProblemScene block={PROBLEM_STREETS} />;
}

export function Act1Burning() {
    useSceneCue('story-smoke');
    return <ProblemScene block={PROBLEM_BURNING} />;
}

export function Act1Forests() {
    useSceneCue('story-forests');
    return <ProblemScene block={PROBLEM_FORESTS} />;
}

/* ------------------------------------------------------------------ */
/*  06 — The human cost                                                */
/* ------------------------------------------------------------------ */
export function Act1HumanCost() {
    useSceneCue('story-cost');
    const [stage, setStage] = React.useState<'big' | 'crash' | 'done'>('big');
    React.useEffect(() => {
        setStage('big');
        const t1 = setTimeout(() => setStage('crash'), 1700);
        const t2 = setTimeout(() => setStage('done'), 3200);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    const display = stage === 'big' ? HUMAN_COST.wage.big : HUMAN_COST.wage.small;
    const [photoA, photoB] = HUMAN_COST.photos;

    return (
        <div className="absolute inset-0 bg-black">
            {/* split photo backdrop */}
            <div className="absolute inset-0 grid grid-cols-2">
                <div className="relative overflow-hidden">
                    <motion.img
                        src={photoA.src}
                        alt={photoA.alt}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1.18 }}
                        transition={{ duration: 16, ease: 'linear' }}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/80" />
                </div>
                <div className="relative overflow-hidden">
                    <motion.img
                        src={photoB.src}
                        alt={photoB.alt}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1.18 }}
                        transition={{ duration: 16, ease: 'linear' }}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/30 to-black/80" />
                </div>
            </div>

            {/* content layer */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
                <BlurFocus delay={0.2}>
                    <SceneEyebrow>{HUMAN_COST.eyebrow}</SceneEyebrow>
                </BlurFocus>
                <div className="mt-3 max-w-3xl">
                    <SceneTitle>{HUMAN_COST.headline}</SceneTitle>
                </div>
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.7 }}
                    className="mt-5 max-w-2xl text-base md:text-lg text-white/80 leading-relaxed"
                >
                    {HUMAN_COST.body}
                </motion.p>

                {/* wage crash + caption */}
                <div className="mt-8 flex flex-col items-center">
                    <motion.div
                        animate={{
                            scale: stage === 'big' ? 1 : stage === 'crash' ? [1, 0.45, 0.55] : 0.55,
                            color: stage === 'done' ? '#ef4444' : '#fbbf24',
                        }}
                        transition={{ duration: 1.2 }}
                        className="text-[110px] md:text-[140px] font-bold tabular-nums leading-none"
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
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: stage === 'done' ? 1 : 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-sm md:text-base text-white/70 max-w-md mt-2"
                    >
                        {HUMAN_COST.wage.caption}
                    </motion.div>
                </div>

                {/* three crossing stats */}
                <div className="mt-10 grid grid-cols-3 gap-4 max-w-4xl w-full">
                    {HUMAN_COST.stats.map((s, i) => (
                        <SwipeIn
                            key={s.label}
                            from="bottom"
                            delay={2.2 + i * 0.3}
                            className="bg-black/60 backdrop-blur rounded-xl p-4 border border-white/10 text-left"
                        >
                            <div className="text-3xl md:text-4xl font-bold tabular-nums text-amber-400">
                                {s.prefix}
                                <DecimalCounter
                                    to={s.value}
                                    decimals={s.decimals}
                                    duration={1.4}
                                    delay={2.4 + i * 0.3}
                                    suffix={s.suffix}
                                />
                            </div>
                            <div className="text-xs text-white/70 mt-1 leading-snug">
                                {s.label}
                            </div>
                        </SwipeIn>
                    ))}
                </div>
            </div>

            <CitationsFooter items={HUMAN_COST.citations} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  07 — Neneh's story                                                 */
/* ------------------------------------------------------------------ */
export function Act1Neneh() {
    useSceneCue('story-neneh');
    const [beat, setBeat] = React.useState(0);
    React.useEffect(() => {
        setBeat(0);
        const timers = NENEH.beats.map((_, i) =>
            setTimeout(() => setBeat(i + 1), 600 + i * 1700)
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="absolute inset-0 bg-black">
            <div className="absolute inset-0 grid grid-cols-2">
                <div className="relative overflow-hidden">
                    <motion.img
                        src={NENEH.before.src}
                        alt={NENEH.before.alt}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1.15 }}
                        transition={{ duration: 16, ease: 'linear' }}
                        className="w-full h-full object-cover grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/60" />
                    <div className="absolute bottom-3 left-4 text-[10px] uppercase tracking-widest text-white/40 font-mono">
                        {NENEH.beforeLabel} · {NENEH.before.credit}
                    </div>
                </div>
                <div className="relative overflow-hidden">
                    <motion.img
                        src={NENEH.after.src}
                        alt={NENEH.after.alt}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1.15 }}
                        transition={{ duration: 16, ease: 'linear' }}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-transparent to-black/60" />
                    <div className="absolute bottom-3 right-4 text-[10px] uppercase tracking-widest text-white/40 font-mono">
                        {NENEH.afterLabel} · {NENEH.after.credit}
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-12 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md rounded-3xl px-10 py-8 max-w-2xl text-center border border-white/10">
                    <SceneEyebrow>{NENEH.eyebrow}</SceneEyebrow>
                    <div className="mt-3 mb-6">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                            {NENEH.title}
                        </h2>
                    </div>
                    <ul className="space-y-2 text-left text-base md:text-lg text-white/85">
                        {NENEH.beats.map((b, i) => (
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
                                    {beat > i ? (
                                        <Typewriter text={b} delay={0} speed={22} />
                                    ) : null}
                                </span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  08 — The voices                                                    */
/* ------------------------------------------------------------------ */
export function Act1Voices() {
    useSceneCue('story-voices');
    const [shown, setShown] = React.useState(0);
    React.useEffect(() => {
        setShown(0);
        const timers = TESTIMONIES.map((_, i) =>
            setTimeout(() => setShown(i + 1), 400 + i * 1500)
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="absolute inset-0">
            <FullBleedPhoto
                image={VOICES.backdrop}
                overlay="linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.92) 100%)"
            />
            <div className="absolute inset-0 px-12 pt-20 pb-16 flex flex-col items-center">
                <SceneEyebrow>{VOICES.eyebrow}</SceneEyebrow>
                <div className="mt-3 mb-10 max-w-3xl text-center">
                    <SceneTitle>{VOICES.title}</SceneTitle>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl w-full overflow-hidden">
                    {TESTIMONIES.map((t, i) => (
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

/* ------------------------------------------------------------------ */
/*  09 — The vision  (COLLECT → SORT → RECYCLE → GOODS)                */
/* ------------------------------------------------------------------ */
export function Act1Vision() {
    useSceneCue('story-vision');
    const [bgIndex, setBgIndex] = React.useState(0);
    const [activeStage, setActiveStage] = React.useState(-1);

    React.useEffect(() => {
        setBgIndex(0);
        setActiveStage(-1);
        const bgTimers = VISION.background.map((_, i) =>
            setTimeout(() => setBgIndex(i), i * 4000)
        );
        const stageTimers = VISION.stages.map((_, i) =>
            setTimeout(() => setActiveStage(i), 1200 + i * 1100)
        );
        return () => {
            bgTimers.forEach(clearTimeout);
            stageTimers.forEach(clearTimeout);
        };
    }, []);

    return (
        <div className="absolute inset-0">
            {/* slow-cycling background */}
            <AnimatePresence>
                <motion.div
                    key={bgIndex}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1.12 }}
                    exit={{ opacity: 0 }}
                    transition={{ opacity: { duration: 1.4 }, scale: { duration: 6, ease: 'linear' } }}
                    className="absolute inset-0"
                >
                    <FullBleedPhoto
                        image={VISION.background[bgIndex]}
                        kenBurns={false}
                        overlay="linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.92) 100%)"
                    />
                </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
                <BlurFocus delay={0.2}>
                    <SceneEyebrow>{VISION.eyebrow}</SceneEyebrow>
                </BlurFocus>
                <div className="mt-3 max-w-4xl text-center">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                        <Typewriter text={VISION.headline} delay={500} speed={36} />
                    </h2>
                </div>

                {/* 4-stage flow */}
                <div className="mt-12 w-full max-w-6xl">
                    <div className="flex items-stretch justify-between gap-3">
                        {VISION.stages.map((stage, i) => (
                            <React.Fragment key={stage.key}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{
                                        opacity: activeStage >= i ? 1 : 0.15,
                                        y: activeStage >= i ? 0 : 20,
                                    }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex-1 bg-black/65 backdrop-blur rounded-2xl p-5 border"
                                    style={{
                                        borderColor:
                                            activeStage >= i ? `${stage.color}aa` : 'rgba(255,255,255,0.08)',
                                        boxShadow:
                                            activeStage === i ? `0 0 50px -10px ${stage.color}` : 'none',
                                    }}
                                >
                                    <div
                                        className="text-[10px] uppercase tracking-[0.3em] font-mono"
                                        style={{ color: stage.color }}
                                    >
                                        Stage {i + 1}
                                    </div>
                                    <div
                                        className="text-2xl md:text-3xl font-bold mt-1 tracking-tight"
                                        style={{ color: stage.color }}
                                    >
                                        {stage.title}
                                    </div>
                                    <div className="text-xs text-white/60 mt-1">{stage.sub}</div>
                                    <div className="mt-4 text-sm text-white/80 leading-snug">
                                        {stage.line}
                                    </div>
                                </motion.div>
                                {i < VISION.stages.length - 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, scaleX: 0 }}
                                        animate={{
                                            opacity: activeStage > i ? 1 : 0.2,
                                            scaleX: activeStage > i ? 1 : 0.4,
                                        }}
                                        transition={{ duration: 0.5 }}
                                        className="self-center w-6 origin-left"
                                    >
                                        <div
                                            className="h-[2px] w-full rounded-full"
                                            style={{
                                                background: `linear-gradient(90deg, ${VISION.stages[i].color}, ${VISION.stages[i + 1].color})`,
                                            }}
                                        />
                                    </motion.div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 5.8, duration: 0.7 }}
                    className="mt-10 text-lg md:text-xl text-white/85 text-center max-w-2xl"
                >
                    {VISION.closer}
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 6.4, duration: 0.7 }}
                    className="mt-3 text-xl md:text-2xl text-emerald-400 font-semibold tracking-wide text-center"
                >
                    {VISION.sub}
                </motion.div>
            </div>
        </div>
    );
}
