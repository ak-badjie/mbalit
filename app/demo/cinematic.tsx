'use client';

/**
 * Cinematic primitive library for Act II of /demo.
 *
 * Adds a richer motion vocabulary on top of `primitives.tsx`:
 *   - DeviceFrame      iPhone-style frame w/ status bar, home indicator, shadow + tilt
 *   - MeshBackdrop     drifting multi-color gradient orbs
 *   - BlueprintGrid    faint grid + accent crosshatch
 *   - OrbField         a few large drifting orbs (slower, calmer)
 *   - FloatingCard     glassy info card that flies in on cue
 *   - ShimmerSweep     diagonal light sweep across a child surface
 *   - Confetti         multi-color celebratory burst
 *   - FrameCounter     "FEATURE 03 / 10" film-strip chrome
 *   - SceneStage       shared shell for Act II scenes (eyebrow + title + stage)
 *   - WasteIcon        custom SVG icon set for the 8 waste types
 *   - BanjulMap        hand-built vector map of Greater Banjul
 *   - MoneyParticles   "+D 75" tokens flying up when the price ticks
 *
 * Hard constraint: pure client SVG/CSS, no new SDKs, no network.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { BRAND, SceneEyebrow, SceneTitle } from './primitives';

/* =====================================================================
   Backdrops
   ===================================================================== */

export function MeshBackdrop({
    palette = ['#10b981', '#06b6d4', '#f59e0b'],
    intensity = 0.55,
}: {
    palette?: string[];
    intensity?: number;
}) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {palette.map((c, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: 720,
                        height: 720,
                        left: `${15 + i * 30}%`,
                        top: `${10 + i * 20}%`,
                        background: `radial-gradient(circle, ${c}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
                        filter: 'blur(60px)',
                    }}
                    animate={{
                        x: [0, 60, -40, 0],
                        y: [0, -50, 40, 0],
                    }}
                    transition={{
                        duration: 18 + i * 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
            {/* film grain */}
            <div
                className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '3px 3px',
                }}
            />
        </div>
    );
}

export function BlueprintGrid({
    accent = BRAND.emerald,
    opacity = 0.18,
}: {
    accent?: string;
    opacity?: number;
}) {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" style={{ opacity }}>
                <defs>
                    <pattern id="bp-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke={accent} strokeWidth="0.5" />
                    </pattern>
                    <pattern id="bp-grid-major" width="240" height="240" patternUnits="userSpaceOnUse">
                        <path d="M 240 0 L 0 0 0 240" fill="none" stroke={accent} strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#bp-grid)" />
                <rect width="100%" height="100%" fill="url(#bp-grid-major)" opacity="0.5" />
            </svg>
            {/* radial vignette to keep edges dark and centre legible */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)',
                }}
            />
        </div>
    );
}

export function OrbField({
    palette = ['#10b98155', '#06b6d455', '#f59e0b33'],
}: {
    palette?: string[];
}) {
    const orbs = useMemo(
        () =>
            palette.map((c, i) => ({
                color: c,
                size: 420 + i * 90,
                x: 12 + ((i * 41) % 70),
                y: 18 + ((i * 31) % 60),
                dur: 24 + i * 5,
            })),
        [palette]
    );
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {orbs.map((o, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: o.size,
                        height: o.size,
                        left: `${o.x}%`,
                        top: `${o.y}%`,
                        background: `radial-gradient(circle, ${o.color}, transparent 65%)`,
                        filter: 'blur(40px)',
                    }}
                    animate={{
                        x: [0, 80, -60, 0],
                        y: [0, -60, 50, 0],
                        scale: [1, 1.08, 0.95, 1],
                    }}
                    transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}
        </div>
    );
}

/* =====================================================================
   Device frame
   ===================================================================== */

export function DeviceFrame({
    children,
    tilt = 0,
    accent = BRAND.emerald,
    statusBarColor = '#111',
    showBattery = true,
    className = '',
}: {
    children: React.ReactNode;
    tilt?: number;
    accent?: string;
    statusBarColor?: string;
    showBattery?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`relative ${className}`}
            style={{ perspective: 1200, perspectiveOrigin: 'center center' }}
        >
            {/* ambient glow halo behind the device */}
            <div
                className="absolute -inset-12 rounded-[80px] blur-3xl pointer-events-none"
                style={{ background: `radial-gradient(circle, ${accent}26, transparent 70%)` }}
            />
            <motion.div
                initial={{ rotateY: tilt * 1.4, opacity: 0, y: 20 }}
                animate={{ rotateY: tilt, opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
                style={{
                    transformStyle: 'preserve-3d',
                }}
            >
                <div
                    className="relative w-[300px] h-[620px] rounded-[44px]"
                    style={{
                        background: 'linear-gradient(140deg, #2a2a2a 0%, #0a0a0a 50%, #1a1a1a 100%)',
                        padding: 12,
                        boxShadow: `
                            0 0 0 1px rgba(255,255,255,0.08),
                            0 30px 60px -10px rgba(0,0,0,0.65),
                            0 50px 120px -20px rgba(0,0,0,0.55),
                            inset 0 1px 1px rgba(255,255,255,0.12)
                        `,
                    }}
                >
                    {/* side button */}
                    <div className="absolute -right-[3px] top-32 w-[3px] h-16 rounded-r bg-neutral-700" />
                    <div className="absolute -left-[3px] top-24 w-[3px] h-8 rounded-l bg-neutral-700" />
                    <div className="absolute -left-[3px] top-40 w-[3px] h-12 rounded-l bg-neutral-700" />
                    <div className="absolute -left-[3px] top-56 w-[3px] h-12 rounded-l bg-neutral-700" />

                    {/* dynamic island */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-3 w-[110px] h-[28px] bg-black rounded-full z-30" />

                    {/* screen */}
                    <div
                        className="relative w-full h-full bg-white rounded-[34px] overflow-hidden text-gray-900"
                        style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5)' }}
                    >
                        {/* status bar */}
                        <div
                            className="absolute top-0 left-0 right-0 h-9 z-20 flex items-center justify-between px-7 text-[11px] font-semibold pointer-events-none"
                            style={{ color: statusBarColor }}
                        >
                            <span className="tabular-nums">9:41</span>
                            <span className="flex items-center gap-1">
                                {/* signal */}
                                <svg width="16" height="10" viewBox="0 0 16 10">
                                    <rect x="0" y="6" width="3" height="4" rx="0.5" fill="currentColor" />
                                    <rect x="4" y="4" width="3" height="6" rx="0.5" fill="currentColor" />
                                    <rect x="8" y="2" width="3" height="8" rx="0.5" fill="currentColor" />
                                    <rect x="12" y="0" width="3" height="10" rx="0.5" fill="currentColor" />
                                </svg>
                                {/* wifi */}
                                <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
                                    <path d="M7 8.5a1 1 0 100-2 1 1 0 000 2zM3.5 5a5 5 0 017 0l-1 1a3.5 3.5 0 00-5 0l-1-1zM1 2.5a8.5 8.5 0 0112 0l-1 1a7 7 0 00-10 0l-1-1z" />
                                </svg>
                                {showBattery && (
                                    <svg width="24" height="10" viewBox="0 0 24 10">
                                        <rect x="0.5" y="0.5" width="20" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                                        <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
                                        <rect x="21" y="3.5" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
                                    </svg>
                                )}
                            </span>
                        </div>

                        {children}

                        {/* home indicator */}
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-gray-900/70 z-20" />

                        {/* glass sheen */}
                        <div
                            className="absolute inset-0 pointer-events-none rounded-[34px]"
                            style={{
                                background:
                                    'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 25%, transparent 75%, rgba(255,255,255,0.06) 100%)',
                            }}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* =====================================================================
   FloatingCard, ShimmerSweep, Confetti, FrameCounter
   ===================================================================== */

export function FloatingCard({
    children,
    delay = 0,
    from = 'right',
    className = '',
}: {
    children: React.ReactNode;
    delay?: number;
    from?: 'left' | 'right' | 'top' | 'bottom';
    className?: string;
}) {
    const init: Record<string, { x?: number; y?: number; opacity: number }> = {
        left: { x: -40, opacity: 0 },
        right: { x: 40, opacity: 0 },
        top: { y: -30, opacity: 0 },
        bottom: { y: 30, opacity: 0 },
    };
    return (
        <motion.div
            initial={init[from]}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ delay, type: 'spring', stiffness: 220, damping: 24 }}
            className={`bg-white/[0.08] backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.55)] ${className}`}
        >
            {children}
        </motion.div>
    );
}

export function ShimmerSweep({ delay = 0 }: { delay?: number }) {
    return (
        <motion.div
            initial={{ x: '-120%' }}
            animate={{ x: '220%' }}
            transition={{ delay, duration: 1.6, ease: 'easeOut', repeat: Infinity, repeatDelay: 2.2 }}
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{
                background:
                    'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
                mixBlendMode: 'overlay',
            }}
        />
    );
}

export function Confetti({
    count = 36,
    colors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'],
    delay = 0,
}: {
    count?: number;
    colors?: string[];
    delay?: number;
}) {
    const pieces = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            const angle = (i / count) * Math.PI * 2 + ((i * 17) % 7) / 10;
            const dist = 140 + ((i * 53) % 180);
            return {
                color: colors[i % colors.length],
                angle,
                dist,
                size: 5 + ((i * 7) % 6),
                rot: ((i * 91) % 360),
                shape: i % 3,
            };
        });
    }, [count, colors]);
    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {pieces.map((p, i) => (
                <motion.span
                    key={i}
                    className="absolute"
                    style={{
                        width: p.size,
                        height: p.size * (p.shape === 0 ? 1.6 : 1),
                        background: p.color,
                        borderRadius: p.shape === 1 ? '50%' : 2,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    animate={{
                        x: Math.cos(p.angle) * p.dist,
                        y: Math.sin(p.angle) * p.dist + 40, // slight gravity
                        opacity: 0,
                        rotate: p.rot,
                        scale: 0.4,
                    }}
                    transition={{ delay, duration: 1.5 + ((i * 7) % 8) / 10, ease: [0.22, 1, 0.36, 1] }}
                />
            ))}
        </div>
    );
}

export function FrameCounter({
    n,
    total = 10,
    label,
}: {
    n: number;
    total?: number;
    label?: string;
}) {
    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 pointer-events-none">
            <div className="flex items-center gap-[3px]">
                {Array.from({ length: total }).map((_, i) => (
                    <span
                        key={i}
                        className={`block h-1 rounded-full transition-colors ${
                            i < n ? 'bg-emerald-400' : 'bg-white/15'
                        } ${i === n - 1 ? 'w-8' : 'w-3'}`}
                    />
                ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">
                Feature {String(n).padStart(2, '0')} / {total}
            </span>
            {label && <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">· {label}</span>}
        </div>
    );
}

/* =====================================================================
   Scene shell for Act II
   ===================================================================== */

export function SceneStage({
    eyebrow,
    title,
    featureNumber,
    layout = 'split',
    backdrop = 'mesh',
    palette,
    accent = BRAND.emerald,
    children,
    aside,
}: {
    eyebrow: string;
    title: React.ReactNode;
    featureNumber: number;
    layout?: 'split' | 'centered' | 'full';
    backdrop?: 'mesh' | 'grid' | 'orbs' | 'none';
    palette?: string[];
    accent?: string;
    children: React.ReactNode;
    aside?: React.ReactNode;
}) {
    const Backdrop =
        backdrop === 'mesh' ? <MeshBackdrop palette={palette} /> :
        backdrop === 'grid' ? <BlueprintGrid accent={accent} /> :
        backdrop === 'orbs' ? <OrbField palette={palette} /> : null;

    return (
        <div className="absolute inset-0 overflow-hidden">
            {Backdrop}
            <FrameCounter n={featureNumber} />

            {/* watermark */}
            <div className="absolute bottom-12 left-8 z-20 text-[10px] font-mono uppercase tracking-[0.5em] text-white/20 pointer-events-none">
                MBALIT · /demo
            </div>

            {layout === 'split' && (
                <div className="absolute inset-0 grid grid-cols-2 items-center px-16 gap-12 max-w-7xl mx-auto z-10">
                    <div className="space-y-5 max-w-[520px]">
                        <SceneEyebrow>{eyebrow}</SceneEyebrow>
                        <SceneTitle>{title}</SceneTitle>
                        {aside}
                    </div>
                    <div className="flex justify-center items-center relative">{children}</div>
                </div>
            )}

            {layout === 'centered' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-12 z-10">
                    <SceneEyebrow>{eyebrow}</SceneEyebrow>
                    <div className="mt-4 mb-12 max-w-4xl text-center">
                        <SceneTitle>{title}</SceneTitle>
                    </div>
                    {children}
                </div>
            )}

            {layout === 'full' && (
                <div className="absolute inset-0 z-10">
                    <div className="absolute top-20 left-12 max-w-md">
                        <SceneEyebrow>{eyebrow}</SceneEyebrow>
                        <div className="mt-3"><SceneTitle>{title}</SceneTitle></div>
                    </div>
                    {children}
                </div>
            )}
        </div>
    );
}

/* =====================================================================
   Custom waste-type icons
   ===================================================================== */

export type WasteKind =
    | 'household'
    | 'kitchen'
    | 'chemical'
    | 'electronic'
    | 'construction'
    | 'garden'
    | 'medical'
    | 'recyclable';

export const WASTE_META: Record<WasteKind, { label: string; color: string }> = {
    household: { label: 'Household', color: '#10b981' },
    kitchen: { label: 'Kitchen', color: '#f59e0b' },
    chemical: { label: 'Chemical', color: '#ef4444' },
    electronic: { label: 'Electronic', color: '#8b5cf6' },
    construction: { label: 'Construction', color: '#6b7280' },
    garden: { label: 'Garden', color: '#22c55e' },
    medical: { label: 'Medical', color: '#ec4899' },
    recyclable: { label: 'Recyclable', color: '#06b6d4' },
};

export function WasteIcon({ kind, className = '' }: { kind: WasteKind; className?: string }) {
    const c = 'currentColor';
    const paths: Record<WasteKind, React.ReactNode> = {
        household: (
            <>
                <path d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8.5z" stroke={c} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
            </>
        ),
        kitchen: (
            <>
                <path d="M5 9c0-3 3-5 7-5s7 2 7 5" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" />
                <ellipse cx="12" cy="10" rx="9" ry="2" stroke={c} strokeWidth="1.6" fill="none" />
                <path d="M5 11c1 6 3 9 7 9s6-3 7-9" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" />
                <circle cx="12" cy="14" r="1.2" fill={c} />
                <circle cx="9.5" cy="16" r="0.8" fill={c} />
                <circle cx="14.5" cy="16" r="0.8" fill={c} />
            </>
        ),
        chemical: (
            <>
                <path d="M9 3h6M10 3v6l-4 8a3 3 0 002.6 4.5h6.8A3 3 0 0018 17l-4-8V3" stroke={c} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
                <path d="M7 16h10" stroke={c} strokeWidth="1.6" />
                <circle cx="10" cy="18" r="0.8" fill={c} />
                <circle cx="13" cy="19" r="0.6" fill={c} />
            </>
        ),
        electronic: (
            <>
                <rect x="6" y="3" width="12" height="18" rx="2" stroke={c} strokeWidth="1.6" fill="none" />
                <rect x="8" y="6" width="8" height="10" rx="0.6" stroke={c} strokeWidth="1.2" fill="none" opacity="0.5" />
                <circle cx="12" cy="18.5" r="0.8" fill={c} />
            </>
        ),
        construction: (
            <>
                <path d="M3 21h18" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
                <path d="M5 21V11l4-2 5 3v9" stroke={c} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
                <path d="M14 12l6-3v12" stroke={c} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
                <rect x="7" y="13" width="2" height="2" stroke={c} strokeWidth="1" fill="none" />
                <rect x="11" y="14" width="2" height="2" stroke={c} strokeWidth="1" fill="none" />
                <rect x="16" y="13" width="2" height="2" stroke={c} strokeWidth="1" fill="none" />
            </>
        ),
        garden: (
            <>
                <path d="M12 21V10" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
                <path d="M12 10c-3-1-5-3-5-6 3 0 5 2 5 6z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                <path d="M12 12c3-1 5-3 5-6-3 0-5 2-5 6z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                <path d="M12 15c-2-0.5-4-2-4-4 2 0 4 1.5 4 4z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
            </>
        ),
        medical: (
            <>
                <rect x="3" y="6" width="18" height="14" rx="2" stroke={c} strokeWidth="1.6" fill="none" />
                <path d="M9 4h6v2H9z" stroke={c} strokeWidth="1.6" fill="none" />
                <path d="M12 10v6M9 13h6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
            </>
        ),
        recyclable: (
            <>
                <path d="M7.5 9l-2.5 4.5 2 1m9.5-9l1.5 2.5-2 1M14 18.5l-3.5-1L9 20" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                <path d="M9 6l3-3 3 3M19 12l1 4-3 1M5 14l-1 4 3 1" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M12 3v0M19 16v0M5 18v0" stroke={c} strokeWidth="1.4" />
            </>
        ),
    };
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            {paths[kind]}
        </svg>
    );
}

/* =====================================================================
   Money particle ("+D 75")
   ===================================================================== */

export function MoneyParticle({
    label,
    delay = 0,
    color = '#10b981',
}: {
    label: string;
    delay?: number;
    color?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -60, scale: 1 }}
            transition={{ delay, duration: 1.4, ease: 'easeOut' }}
            className="absolute -top-2 right-0 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg pointer-events-none"
            style={{ background: color }}
        >
            {label}
        </motion.div>
    );
}

/* =====================================================================
   Greater Banjul vector map
   ===================================================================== */

export type BanjulMarker = {
    id: string;
    /** map-units (0..1000 x, 0..600 y in BANJUL_MAP coord space) */
    x: number;
    y: number;
    label?: string;
    color?: string;
    pulse?: boolean;
    icon?: 'pin' | 'truck' | 'dot' | 'driver';
};

/**
 * Coordinate space: viewBox "0 0 1000 600".
 * West/Atlantic is left, the Gambia River is north (top), the peninsula
 * curves south through Banjul → Bakau → Kanifing → Serrekunda → Bakoteh.
 * These positions are illustrative, not survey-grade.
 */
export const BANJUL_PLACES = {
    banjul: { x: 220, y: 140, label: 'Banjul' },
    bakau: { x: 360, y: 170, label: 'Bakau' },
    kanifing: { x: 470, y: 290, label: 'Kanifing' },
    serrekunda: { x: 540, y: 360, label: 'Serrekunda' },
    bakoteh: { x: 410, y: 380, label: 'Bakoteh' },
    brikama: { x: 740, y: 470, label: 'Brikama' },
} as const;

export function BanjulMap({
    markers = [],
    routePath,
    routeProgress = 0,
    zoomTo,
    nightMode = false,
    showLabels = true,
    className = '',
}: {
    markers?: BanjulMarker[];
    /** SVG path "d" attribute in map coord space */
    routePath?: string;
    /** 0..1 — fraction of the route revealed and the truck position */
    routeProgress?: number;
    /** Centre + zoom factor target. 1 = full map, 2 = 2x zoom in */
    zoomTo?: { x: number; y: number; zoom: number };
    nightMode?: boolean;
    showLabels?: boolean;
    className?: string;
}) {
    const camX = useMotionValue(0);
    const camY = useMotionValue(0);
    const camZ = useMotionValue(1);
    const sx = useSpring(camX, { stiffness: 80, damping: 22 });
    const sy = useSpring(camY, { stiffness: 80, damping: 22 });
    const sz = useSpring(camZ, { stiffness: 80, damping: 22 });

    useEffect(() => {
        if (!zoomTo) {
            camX.set(0); camY.set(0); camZ.set(1);
            return;
        }
        const tx = (500 - zoomTo.x) * (zoomTo.zoom - 1);
        const ty = (300 - zoomTo.y) * (zoomTo.zoom - 1);
        camX.set(tx);
        camY.set(ty);
        camZ.set(zoomTo.zoom);
    }, [zoomTo, camX, camY, camZ]);

    // Truck position along the route path
    const [truckPos, setTruckPos] = useState<{ x: number; y: number; angle: number } | null>(null);
    const pathRef = React.useRef<SVGPathElement | null>(null);
    useEffect(() => {
        if (!routePath || !pathRef.current) return;
        const path = pathRef.current;
        const len = path.getTotalLength();
        const p = path.getPointAtLength(Math.max(0.001, len * routeProgress));
        const p2 = path.getPointAtLength(Math.min(len, len * routeProgress + 1));
        const angle = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI;
        setTruckPos({ x: p.x, y: p.y, angle });
    }, [routeProgress, routePath]);

    const land = nightMode ? '#1f2a37' : '#e7f3ec';
    const water = nightMode ? '#0f1a2a' : '#cfe7f3';
    const road = nightMode ? '#2d3947' : '#ffffff';
    const roadMinor = nightMode ? '#28323e' : '#f1f5f9';
    const labelColor = nightMode ? '#cbd5e1' : '#1f2937';

    return (
        <motion.div className={`relative w-full h-full overflow-hidden ${className}`}>
            <motion.svg
                viewBox="0 0 1000 600"
                className="w-full h-full"
                style={{ x: sx, y: sy, scale: sz, originX: 0.5, originY: 0.5 }}
            >
                {/* water / sea */}
                <rect width="1000" height="600" fill={water} />

                {/* Greater Banjul peninsula landmass — hand-shaped polygon */}
                <path
                    d="
                        M 100 80
                        Q 180 60 280 90
                        Q 360 120 420 160
                        L 600 200
                        Q 720 220 820 280
                        Q 880 320 920 380
                        L 920 600
                        L 100 600
                        Z
                    "
                    fill={land}
                    stroke={nightMode ? '#3b4a5e' : '#bcd9c7'}
                    strokeWidth="2"
                />
                {/* Banjul tip island */}
                <ellipse cx="190" cy="135" rx="80" ry="38" fill={land} stroke={nightMode ? '#3b4a5e' : '#bcd9c7'} strokeWidth="2" />
                {/* river channel between Banjul and mainland */}
                <path d="M 270 130 Q 320 145 360 165" stroke={water} strokeWidth="14" fill="none" />

                {/* major roads */}
                <g stroke={road} strokeWidth="6" fill="none" strokeLinecap="round">
                    <path d="M 220 140 Q 320 180 470 290 Q 580 380 740 470" />
                    <path d="M 360 170 Q 410 230 470 290" />
                    <path d="M 470 290 Q 460 340 410 380" />
                    <path d="M 470 290 Q 510 320 540 360" />
                    <path d="M 540 360 Q 600 390 740 470" />
                </g>
                {/* minor street grid */}
                <g stroke={roadMinor} strokeWidth="1.5" fill="none" opacity="0.7">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <path key={`mh${i}`} d={`M 200 ${250 + i * 45} L 800 ${250 + i * 45}`} />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <path key={`mv${i}`} d={`M ${250 + i * 60} 200 L ${250 + i * 60} 580`} />
                    ))}
                </g>

                {/* coast detail dots */}
                <g fill={nightMode ? '#3b4a5e' : '#a8c8b6'} opacity="0.6">
                    {[140, 200, 260, 320, 380, 440].map((x) => <circle key={x} cx={x} cy="100" r="2" />)}
                </g>

                {/* labels */}
                {showLabels && Object.entries(BANJUL_PLACES).map(([k, p]) => (
                    <g key={k}>
                        <circle cx={p.x} cy={p.y} r="3" fill={nightMode ? '#94a3b8' : '#64748b'} />
                        <text
                            x={p.x + 8}
                            y={p.y - 6}
                            fontSize="13"
                            fontWeight="600"
                            fill={labelColor}
                            style={{ paintOrder: 'stroke', stroke: nightMode ? '#0f1a2a' : '#fff', strokeWidth: 3 }}
                        >
                            {p.label}
                        </text>
                    </g>
                ))}

                {/* compass */}
                <g transform="translate(900,80)">
                    <circle r="22" fill={nightMode ? '#0f1a2a' : '#fff'} stroke={labelColor} strokeWidth="1" opacity="0.85" />
                    <path d="M 0 -16 L 4 0 L 0 16 L -4 0 Z" fill={BRAND.emerald} />
                    <text y="-26" textAnchor="middle" fontSize="10" fontWeight="700" fill={labelColor}>N</text>
                </g>

                {/* route */}
                {routePath && (
                    <>
                        <path ref={pathRef} d={routePath} fill="none" stroke={BRAND.emerald} strokeWidth="4" strokeDasharray="6 6" opacity="0.35" />
                        <motion.path
                            d={routePath}
                            fill="none"
                            stroke={BRAND.emerald}
                            strokeWidth="4"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: routeProgress }}
                            transition={{ ease: 'linear' }}
                        />
                    </>
                )}

                {/* truck along route */}
                {routePath && truckPos && (
                    <g transform={`translate(${truckPos.x},${truckPos.y})`}>
                        <circle r="16" fill={BRAND.emerald} opacity="0.25">
                            <animate attributeName="r" values="16;30;16" dur="1.6s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.45;0;0.45" dur="1.6s" repeatCount="indefinite" />
                        </circle>
                        <circle r="14" fill="white" stroke={BRAND.emerald} strokeWidth="3" />
                        {/* truck silhouette */}
                        <g stroke={BRAND.emerald} strokeWidth="1.4" fill={BRAND.emerald} strokeLinejoin="round">
                            <rect x="-7" y="-4" width="9" height="6" rx="1" />
                            <path d="M 2 -2 L 7 -2 L 8.5 0 L 8.5 2 L 2 2 Z" />
                            <circle cx="-4.5" cy="3.5" r="1.6" fill="white" />
                            <circle cx="6" cy="3.5" r="1.6" fill="white" />
                        </g>
                    </g>
                )}

                {/* markers */}
                {markers.map((m) => (
                    <g key={m.id} transform={`translate(${m.x},${m.y})`}>
                        {m.pulse && (
                            <>
                                <circle r="14" fill={m.color || BRAND.red} opacity="0.35">
                                    <animate attributeName="r" values="6;28;6" dur="1.8s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.5;0;0.5" dur="1.8s" repeatCount="indefinite" />
                                </circle>
                            </>
                        )}
                        {m.icon === 'pin' || !m.icon ? (
                            <>
                                <path
                                    d="M 0 -22 C -10 -22 -16 -14 -16 -8 C -16 0 0 14 0 14 C 0 14 16 0 16 -8 C 16 -14 10 -22 0 -22 Z"
                                    fill={m.color || BRAND.red}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                                <circle cx="0" cy="-9" r="4" fill="white" />
                            </>
                        ) : m.icon === 'driver' ? (
                            <>
                                <circle r="9" fill={m.color || BRAND.amber} stroke="white" strokeWidth="2" />
                                <text textAnchor="middle" y="3" fontSize="9" fontWeight="700" fill="white">
                                    {m.label?.[0] || 'D'}
                                </text>
                            </>
                        ) : (
                            <circle r="6" fill={m.color || BRAND.emerald} stroke="white" strokeWidth="2" />
                        )}
                        {m.label && m.icon !== 'driver' && (
                            <text
                                y="28"
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill={labelColor}
                                style={{ paintOrder: 'stroke', stroke: nightMode ? '#0f1a2a' : '#fff', strokeWidth: 3 }}
                            >
                                {m.label}
                            </text>
                        )}
                    </g>
                ))}
            </motion.svg>
        </motion.div>
    );
}

/* =====================================================================
   Pay-method badge (mobile money brand chip)
   ===================================================================== */

export function PayMethodBadge({
    src,
    name,
    selected = false,
    delay = 0,
}: {
    src: string;
    name: string;
    selected?: boolean;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                selected
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 bg-white'
            }`}
        >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={name} className="max-w-full max-h-full object-contain" />
            </div>
            <span className="text-xs font-semibold text-gray-700">{name}</span>
            {selected && (
                <span className="ml-auto w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none">
                        <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            )}
        </motion.div>
    );
}
