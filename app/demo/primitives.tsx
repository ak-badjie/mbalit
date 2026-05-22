'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export const BRAND = {
    emerald: '#10b981',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    amber: '#f59e0b',
    orange: '#f97316',
    red: '#ef4444',
    ink: '#0a0a0a',
    paper: '#fafafa',
};

/* Typewriter ----------------------------------------------------------- */
export function Typewriter({
    text,
    delay = 0,
    speed = 35,
    className = '',
    onDone,
}: {
    text: string;
    delay?: number;
    speed?: number;
    className?: string;
    onDone?: () => void;
}) {
    const [shown, setShown] = useState('');
    useEffect(() => {
        setShown('');
        let i = 0;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        const start = setTimeout(() => {
            intervalId = setInterval(() => {
                i++;
                setShown(text.slice(0, i));
                if (i >= text.length) {
                    if (intervalId) clearInterval(intervalId);
                    onDone?.();
                }
            }, speed);
        }, delay);
        return () => {
            clearTimeout(start);
            if (intervalId) clearInterval(intervalId);
        };
    }, [text, delay, speed, onDone]);
    return (
        <span className={className}>
            {shown}
            <motion.span
                className="inline-block w-[2px] bg-current ml-0.5 align-middle"
                style={{ height: '0.9em' }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
            />
        </span>
    );
}

/* Counter -------------------------------------------------------------- */
export function CounterTicker({
    to,
    from = 0,
    duration = 1.6,
    delay = 0,
    suffix = '',
    className = '',
}: {
    to: number;
    from?: number;
    duration?: number;
    delay?: number;
    suffix?: string;
    className?: string;
}) {
    const mv = useMotionValue(from);
    const rounded = useTransform(mv, (v) => {
        const n = Math.round(v);
        return n.toLocaleString();
    });
    useEffect(() => {
        const ctrl = animate(mv, to, { duration, delay, ease: [0.16, 1, 0.3, 1] });
        return () => ctrl.stop();
    }, [to, duration, delay, mv]);
    return (
        <span className={className}>
            <motion.span>{rounded}</motion.span>
            {suffix}
        </span>
    );
}

/* Glow Pulse ----------------------------------------------------------- */
export function GlowPulse({
    children,
    color = BRAND.emerald,
    className = '',
}: {
    children: React.ReactNode;
    color?: string;
    className?: string;
}) {
    return (
        <motion.div
            className={`relative ${className}`}
            animate={{
                boxShadow: [
                    `0 0 0 0 ${color}55`,
                    `0 0 0 30px ${color}00`,
                ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

/* Drop & Snap (drops in with bounce) ----------------------------------- */
export function DropSnap({
    children,
    delay = 0,
    className = '',
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ y: -200, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay, type: 'spring', stiffness: 220, damping: 14 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* SwipeIn -------------------------------------------------------------- */
export function SwipeIn({
    children,
    from = 'right',
    delay = 0,
    className = '',
}: {
    children: React.ReactNode;
    from?: 'left' | 'right' | 'top' | 'bottom';
    delay?: number;
    className?: string;
}) {
    const init: Record<'left' | 'right' | 'top' | 'bottom', { x?: number; y?: number; opacity: number }> = {
        left: { x: -80, opacity: 0 },
        right: { x: 80, opacity: 0 },
        top: { y: -80, opacity: 0 },
        bottom: { y: 80, opacity: 0 },
    };
    return (
        <motion.div
            initial={init[from]}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ delay, type: 'spring', stiffness: 180, damping: 22 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* BlurFocus ------------------------------------------------------------ */
export function BlurFocus({
    children,
    delay = 0,
    className = '',
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ filter: 'blur(20px)', opacity: 0 }}
            animate={{ filter: 'blur(0px)', opacity: 1 }}
            transition={{ delay, duration: 0.9, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* Particle burst ------------------------------------------------------- */
export function ParticleBurst({
    color = BRAND.emerald,
    count = 18,
    delay = 0,
}: {
    color?: string;
    count?: number;
    delay?: number;
}) {
    // Deterministic particle distribution — no Math.random in render path
    // so re-renders never re-shuffle the burst.
    const particles = useMemo(
        () =>
            Array.from({ length: count }).map((_, i) => ({
                angle: (i / count) * Math.PI * 2,
                dist: 80 + ((i * 53) % 80),
            })),
        [count]
    );
    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {particles.map(({ angle, dist }, i) => {
                return (
                    <motion.span
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{ background: color }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{
                            x: Math.cos(angle) * dist,
                            y: Math.sin(angle) * dist,
                            opacity: 0,
                            scale: 0.2,
                        }}
                        transition={{ delay, duration: 1.2, ease: 'easeOut' }}
                    />
                );
            })}
        </div>
    );
}

/* Animated bar --------------------------------------------------------- */
export function AnimatedBar({
    value,
    max,
    color = BRAND.emerald,
    label,
    unit = '',
    delay = 0,
}: {
    value: number;
    max: number;
    color?: string;
    label: string;
    unit?: string;
    delay?: number;
}) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="w-full">
            <div className="flex justify-between text-sm mb-2 text-white/80">
                <span>{label}</span>
                <span className="font-mono tabular-nums" style={{ color }}>
                    <CounterTicker to={value} suffix={unit} delay={delay} duration={1.4} />
                </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
                />
            </div>
        </div>
    );
}

/* Phone frame (used by Act II scenes) ---------------------------------- */
export function PhoneFrame({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`relative w-[300px] h-[620px] bg-white rounded-[44px] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ${className}`}
            style={{ boxShadow: '0 0 0 12px #1a1a1a, 0 30px 80px -20px rgba(0,0,0,0.7)' }}
        >
            {/* notch */}
            <div className="absolute left-1/2 -translate-x-1/2 top-3 w-24 h-6 bg-black rounded-full z-20" />
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white rounded-[34px] overflow-hidden relative text-gray-900">
                {children}
            </div>
        </div>
    );
}

/* Scene title eyebrow + heading --------------------------------------- */
export function SceneEyebrow({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs uppercase tracking-[0.4em] text-emerald-400 font-semibold"
        >
            {children}
        </motion.div>
    );
}

export function SceneTitle({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]"
        >
            {children}
        </motion.h2>
    );
}
