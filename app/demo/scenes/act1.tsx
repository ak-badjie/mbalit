'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { problem } from '../content/problem';
import {
    BRAND,
    Typewriter,
    CounterTicker,
    SwipeIn,
    BlurFocus,
    AnimatedBar,
    SceneEyebrow,
    SceneTitle,
} from '../primitives';
import { AlertTriangle, Droplets, Bug, Trash2, MapPin } from 'lucide-react';

/* ------------------- Scene 1: bold typographic intro ------------------- */
export function Act1Scene1() {
    const c = problem.scene1;
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
            <SceneEyebrow>{c.eyebrow}</SceneEyebrow>
            <div className="mt-6 max-w-5xl">
                <SceneTitle>
                    <Typewriter text={c.title} speed={30} />
                </SceneTitle>
            </div>
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.4, duration: 0.7 }}
                className="mt-8 text-xl text-white/60"
            >
                {c.subtitle}
            </motion.p>
            {/* falling trash bits */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                {Array.from({ length: 14 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-white/5"
                        initial={{ y: -50, x: `${(i / 14) * 100}%`, rotate: 0 }}
                        animate={{ y: '110vh', rotate: 360 }}
                        transition={{
                            duration: 12 + (i % 5) * 2,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: 'linear',
                        }}
                        style={{ fontSize: 32 + (i % 4) * 8 }}
                    >
                        <Trash2 />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

/* ------------------- Scene 2: animated stats ------------------------- */
export function Act1Scene2() {
    const c = problem.scene2;
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>The data</SceneEyebrow>
            <div className="mt-4 mb-14 max-w-4xl text-center">
                <SceneTitle>{c.headline}</SceneTitle>
            </div>
            <div className="grid grid-cols-3 gap-10 max-w-6xl w-full">
                {c.stats.map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.25, duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="text-7xl md:text-8xl font-bold tabular-nums" style={{ color: i === 1 ? BRAND.amber : i === 2 ? BRAND.red : BRAND.emerald }}>
                            <CounterTicker to={s.value} suffix={s.suffix || ''} delay={0.5 + i * 0.25} duration={1.8} />
                        </div>
                        <div className="mt-3 text-white/70 text-lg">{s.label}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

/* ------------------- Scene 3: drains/floods illustrative -------------- */
export function Act1Scene3() {
    const c = problem.scene3;
    const icons = [Droplets, Bug, AlertTriangle];
    return (
        <div className="absolute inset-0 flex items-center justify-center px-12">
            <div className="grid grid-cols-2 gap-16 max-w-7xl w-full items-center">
                <div>
                    <SceneEyebrow>The consequence</SceneEyebrow>
                    <div className="mt-4">
                        <SceneTitle>{c.headline}</SceneTitle>
                    </div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="mt-6 text-white/70 text-lg leading-relaxed max-w-lg"
                    >
                        {c.body}
                    </motion.p>
                    <ul className="mt-8 space-y-3">
                        {c.bullets.map((b, i) => {
                            const Icon = icons[i] || AlertTriangle;
                            return (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1 + i * 0.25, duration: 0.5 }}
                                    className="flex items-center gap-3 text-white/90"
                                >
                                    <span className="w-9 h-9 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center">
                                        <Icon className="w-4 h-4" />
                                    </span>
                                    <span>{b}</span>
                                </motion.li>
                            );
                        })}
                    </ul>
                </div>
                {/* Right: drain illustration */}
                <BlurFocus delay={0.4}>
                    <div className="relative aspect-square w-full max-w-md mx-auto">
                        <svg viewBox="0 0 400 400" className="w-full h-full">
                            {/* ground */}
                            <rect x="0" y="280" width="400" height="120" fill="#1f2937" />
                            {/* drain hole */}
                            <ellipse cx="200" cy="290" rx="80" ry="14" fill="#000" />
                            {/* trash piling */}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <motion.circle
                                    key={i}
                                    cx={140 + (i * 11) % 120}
                                    cy={282 + (i % 3) * 4}
                                    r={6 + (i % 3) * 2}
                                    fill={['#f59e0b', '#ef4444', '#10b981', '#06b6d4'][i % 4]}
                                    initial={{ y: -300, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 + i * 0.08, type: 'spring', stiffness: 120, damping: 12 }}
                                />
                            ))}
                            {/* water rising */}
                            <motion.rect
                                x="0"
                                y="280"
                                width="400"
                                height="0"
                                fill="#06b6d4"
                                fillOpacity="0.4"
                                initial={{ height: 0, y: 280 }}
                                animate={{ height: 70, y: 240 }}
                                transition={{ delay: 2.2, duration: 1.4, ease: 'easeOut' }}
                            />
                            {/* sun */}
                            <circle cx="320" cy="80" r="40" fill="#f59e0b" opacity="0.3" />
                        </svg>
                    </div>
                </BlurFocus>
            </div>
        </div>
    );
}

/* ------------------- Scene 4: the gap ------------------------------- */
export function Act1Scene4() {
    const c = problem.scene4;
    const colors = [BRAND.cyan, BRAND.amber, BRAND.red];
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>The collection gap</SceneEyebrow>
            <div className="mt-4 mb-12 max-w-4xl text-center">
                <SceneTitle>{c.headline}</SceneTitle>
            </div>
            <div className="w-full max-w-3xl space-y-7">
                {c.bars.map((b, i) => (
                    <AnimatedBar key={i} {...b} color={colors[i]} delay={0.4 + i * 0.4} />
                ))}
            </div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 0.6 }}
                className="mt-10 text-white/60 text-sm"
            >
                Source: composite of KMC reports & field surveys (illustrative).
            </motion.p>
        </div>
    );
}

/* ------------------- Scene 5: communities affected ------------------ */
export function Act1Scene5() {
    const c = problem.scene5;
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>Who&apos;s affected</SceneEyebrow>
            <div className="mt-4 mb-12 max-w-4xl text-center">
                <SceneTitle>{c.headline}</SceneTitle>
            </div>
            <div className="relative w-full max-w-4xl aspect-[16/9] bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-3xl border border-white/10 overflow-hidden">
                {/* simulated map grid */}
                <svg viewBox="0 0 800 450" className="absolute inset-0 w-full h-full opacity-30">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="450" stroke="#10b981" strokeWidth="0.5" />
                    ))}
                    {Array.from({ length: 9 }).map((_, i) => (
                        <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="#10b981" strokeWidth="0.5" />
                    ))}
                </svg>
                {/* sweep */}
                <motion.div
                    initial={{ x: '-30%' }}
                    animate={{ x: '130%' }}
                    transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"
                />
                {/* pins */}
                {c.cities.map((city, i) => {
                    const x = 12 + (i * 11) % 78;
                    const y = 18 + ((i * 23) % 64);
                    return (
                        <motion.div
                            key={city}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 + i * 0.18, type: 'spring', stiffness: 220 }}
                            className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
                            style={{ left: `${x}%`, top: `${y}%` }}
                        >
                            <div className="text-xs text-white/90 mb-1 bg-black/60 px-2 py-0.5 rounded">
                                {city}
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
                            >
                                <MapPin className="w-6 h-6 text-red-400 fill-red-500" />
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5, duration: 0.6 }}
                className="mt-8 text-white/70 text-lg"
            >
                {c.note}
            </motion.p>
        </div>
    );
}

/* ------------------- Scene 6: KMC corporate dumping ------------------ */
export function Act1Scene6() {
    const c = problem.scene6;
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <div className="grid grid-cols-2 gap-16 max-w-7xl w-full items-center">
                <div>
                    <SceneEyebrow>And then…</SceneEyebrow>
                    <div className="mt-4">
                        <SceneTitle>{c.headline}</SceneTitle>
                    </div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                        className="mt-6 text-white/70 text-xl leading-relaxed"
                    >
                        &ldquo;{c.callout}&rdquo;
                    </motion.p>
                </div>
                {/* truck dumping at night → KMC logo */}
                <div className="relative aspect-square w-full max-w-md mx-auto flex flex-col items-center justify-center">
                    <SwipeIn from="right" delay={0.4}>
                        <div className="relative">
                            <svg width="220" height="120" viewBox="0 0 220 120">
                                <rect x="20" y="30" width="120" height="55" rx="6" fill="#374151" />
                                <rect x="140" y="50" width="50" height="35" rx="4" fill="#4b5563" />
                                <rect x="148" y="55" width="20" height="14" fill="#fbbf24" opacity="0.6" />
                                <circle cx="55" cy="92" r="14" fill="#111" />
                                <circle cx="105" cy="92" r="14" fill="#111" />
                                <circle cx="170" cy="92" r="14" fill="#111" />
                            </svg>
                            {/* dumping waste */}
                            {Array.from({ length: 8 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-3 h-3 rounded-sm"
                                    style={{ background: ['#f59e0b', '#ef4444', '#06b6d4'][i % 3], left: 30 + i * 12, top: 35 }}
                                    initial={{ y: 0, opacity: 0 }}
                                    animate={{ y: 100, opacity: [0, 1, 1, 0] }}
                                    transition={{ delay: 1.4 + i * 0.12, duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
                                />
                            ))}
                        </div>
                    </SwipeIn>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2.2, type: 'spring', stiffness: 180 }}
                        className="mt-10 flex flex-col items-center"
                    >
                        <div className="w-32 h-32 rounded-full bg-white p-3 shadow-2xl flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.authorityLogo} alt="KMC" className="w-full h-full object-contain" />
                        </div>
                        <div className="mt-3 text-emerald-400 font-semibold uppercase tracking-wider text-sm">
                            {c.authority}
                        </div>
                        <div className="text-white/60 text-xs mt-1">The authority who needs to know.</div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
