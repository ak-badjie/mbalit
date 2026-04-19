'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Truck, MapPin, Camera, Send, AlertTriangle, Activity, Hash, FileText, Wifi, MousePointer2, Sparkles, Wallet } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { BRAND, Typewriter } from '../primitives';
import {
    DeviceFrame,
    SceneStage,
    FloatingCard,
    ShimmerSweep,
    Confetti,
    BanjulMap,
    BANJUL_PLACES,
    BanjulMarker,
    PayMethodBadge,
    FrameCounter,
} from '../cinematic';

/* ============================================================
   Scene 6 — Atomic accept (race-safe)
   ============================================================ */
export function Act2Scene6() {
    const [phase, setPhase] = React.useState<'race' | 'won' | 'done'>('race');
    React.useEffect(() => {
        setPhase('race');
        const t1 = setTimeout(() => setPhase('won'), 1900);
        const t2 = setTimeout(() => setPhase('done'), 2800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    const drivers = [
        { name: 'Lamin', wins: true, color: BRAND.emerald, ms: 312 },
        { name: 'Modou', wins: false, color: BRAND.amber, ms: 318 },
    ] as const;

    return (
        <SceneStage
            featureNumber={6}
            eyebrow="Feature 06 · Race condition, solved"
            title={<>Two drivers tap <span className="text-emerald-400">&ldquo;Accept&rdquo;</span> — only one wins.</>}
            backdrop="orbs"
            palette={['#10b98166', '#1e293b88', '#06b6d444']}
            layout="centered"
        >
            <div className="grid grid-cols-2 gap-16 max-w-5xl w-full mt-2">
                {drivers.map((d) => {
                    const lost = phase === 'done' && !d.wins;
                    const won = phase === 'done' && d.wins;
                    return (
                        <div key={d.name} className="flex flex-col items-center">
                            <div className="relative" style={{ transform: 'scale(0.62)', transformOrigin: 'top center', marginBottom: -200 }}>
                                <DeviceFrame tilt={d.wins ? -5 : 5} accent={d.color}>
                                    <div className="absolute inset-0 pt-12 px-4 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white">
                                        <motion.div
                                            animate={{
                                                rotate: phase === 'race' ? [0, -3, 3, 0] : 0,
                                            }}
                                            transition={{ duration: 0.4, repeat: phase === 'race' ? Infinity : 0 }}
                                            className="w-28 h-28 rounded-full text-white font-bold text-5xl flex items-center justify-center shadow-2xl mb-4"
                                            style={{ background: `linear-gradient(135deg, ${d.color}, ${d.color}cc)` }}
                                        >
                                            {d.name[0]}
                                        </motion.div>
                                        <div className="text-2xl font-bold text-gray-900 mb-1">{d.name}</div>
                                        <div className="text-xs text-gray-500 mb-6 font-mono tabular-nums">latency · {d.ms} ms</div>
                                        <motion.button
                                            animate={
                                                phase === 'race'
                                                    ? { scale: [1, 1.04, 1], boxShadow: [`0 4px 20px ${d.color}55`, `0 8px 30px ${d.color}aa`, `0 4px 20px ${d.color}55`] }
                                                    : { scale: 1 }
                                            }
                                            transition={{ duration: 1.2, repeat: phase === 'race' ? Infinity : 0 }}
                                            className="w-full px-5 py-3 rounded-xl text-white text-base font-bold shadow-lg"
                                            style={{ background: lost ? '#9ca3af' : d.color }}
                                            disabled
                                        >
                                            {phase === 'race' ? 'Tap to Accept' : won ? '✓ You got the job' : '✗ Already taken'}
                                        </motion.button>
                                        {/* finger pointer (vector cursor) */}
                                        {phase === 'race' && (
                                            <motion.div
                                                initial={{ y: 80, opacity: 0, rotate: -20 }}
                                                animate={{ y: -10, opacity: [0, 1, 1, 1], rotate: -10 }}
                                                transition={{ delay: d.wins ? 0.5 : 0.62, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                                className="absolute bottom-2 right-10"
                                            >
                                                <MousePointer2 className="w-9 h-9" style={{ color: d.color, fill: 'white' }} strokeWidth={2.5} />
                                            </motion.div>
                                        )}
                                        {won && (
                                            <>
                                                <Confetti delay={0.05} />
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0, rotate: -90 }}
                                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                    transition={{ delay: 0.1, type: 'spring' }}
                                                    className="absolute top-12 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                                                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                                                >
                                                    <Sparkles className="w-5 h-5 text-white" />
                                                </motion.div>
                                            </>
                                        )}
                                    </div>
                                </DeviceFrame>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* technical caption */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                <FloatingCard delay={0.2} from="bottom" className="px-5 py-3">
                    <div className="flex items-center gap-3 text-white/80 text-sm">
                        <span className="font-mono text-emerald-400 text-xs">runTransaction</span>
                        <span className="text-white/30">→</span>
                        <span className="font-mono text-xs">atomic single-winner write</span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/50 text-xs">No double-bookings, ever.</span>
                    </div>
                </FloatingCard>
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 7 — Live tracking (shared Banjul map)
   ============================================================ */
export function Act2Scene7() {
    const [progress, setProgress] = React.useState(0);
    React.useEffect(() => {
        setProgress(0);
        const id = setInterval(() => {
            setProgress((p) => {
                const next = Math.min(1, p + 0.018);
                if (next >= 1) clearInterval(id);
                return next;
            });
        }, 100);
        return () => clearInterval(id);
    }, []);
    const stepIndex = Math.min(4, Math.floor(progress * 5));
    const steps = ['Accepted', 'En route', 'Arrived', 'Picking up', 'Done'];
    const eta = Math.max(1, Math.round((1 - progress) * 8));

    // Route from Bakoteh to Serrekunda compound
    const start = { x: BANJUL_PLACES.bakoteh.x, y: BANJUL_PLACES.bakoteh.y };
    const end = { x: BANJUL_PLACES.serrekunda.x, y: BANJUL_PLACES.serrekunda.y };
    const routePath = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2 + 30} ${(start.y + end.y) / 2 - 60} ${end.x} ${end.y}`;
    const markers: BanjulMarker[] = [
        { id: 'start', x: start.x, y: start.y, color: BRAND.cyan, label: 'Driver', icon: 'driver' },
        { id: 'end', x: end.x, y: end.y, color: BRAND.red, label: 'Pickup', icon: 'pin', pulse: true },
    ];

    return (
        <SceneStage
            featureNumber={7}
            eyebrow="Feature 07 · Live tracking"
            title={<>Watch your driver in <span className="text-emerald-400">real time</span>.</>}
            backdrop="orbs"
            palette={['#06b6d455', '#10b98144', '#3b82f644']}
            layout="centered"
        >
            <div className="grid grid-cols-[1fr_auto] gap-8 max-w-6xl w-full items-center mt-4">
                {/* Big map card */}
                <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
                    <BanjulMap routePath={routePath} routeProgress={progress} markers={markers} nightMode />

                    {/* HUD overlay */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-white text-xs font-mono">
                        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        LIVE · GPS
                    </div>
                    <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-white text-xs">
                        Lamin · Truck #GM-114
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        <div className="px-4 py-3 rounded-2xl bg-white/95 backdrop-blur text-gray-900 shadow-xl">
                            <div className="text-[10px] uppercase tracking-widest text-gray-500">ETA</div>
                            <div className="font-bold text-3xl tabular-nums text-emerald-600">{eta} min</div>
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-white/95 backdrop-blur text-gray-900 shadow-xl text-right">
                            <div className="text-[10px] uppercase tracking-widest text-gray-500">Distance</div>
                            <div className="font-bold text-lg tabular-nums">{(2.4 * (1 - progress)).toFixed(1)} km</div>
                        </div>
                    </div>
                </div>

                {/* Customer phone */}
                <div style={{ transform: 'scale(0.82)', transformOrigin: 'right center' }}>
                    <DeviceFrame tilt={-4} accent={BRAND.emerald}>
                        <div className="absolute inset-0 pt-12 px-5 flex flex-col">
                            <div className="text-[10px] text-gray-500 uppercase tracking-[0.25em]">Customer view</div>
                            <div className="font-bold text-lg mb-5">Tracking your pickup</div>
                            <div className="space-y-4 flex-1">
                                {steps.map((s, i) => (
                                    <div key={s} className="flex items-center gap-3">
                                        <motion.div
                                            animate={{
                                                backgroundColor: i <= stepIndex ? BRAND.emerald : '#e5e7eb',
                                                scale: i === stepIndex ? [1, 1.25, 1] : 1,
                                            }}
                                            transition={{ duration: 0.4, scale: { duration: 0.8, repeat: i === stepIndex ? Infinity : 0 } }}
                                            className="w-7 h-7 rounded-full flex items-center justify-center shadow"
                                        >
                                            {i < stepIndex ? <Check className="w-4 h-4 text-white" strokeWidth={4} /> : <span className="text-xs font-bold text-white">{i + 1}</span>}
                                        </motion.div>
                                        <span className={`font-medium text-sm ${i <= stepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mb-12 p-3 rounded-xl text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                                <ShimmerSweep />
                                <div className="text-[10px] uppercase tracking-widest opacity-80">ETA</div>
                                <div className="text-3xl font-bold tabular-nums">{eta} min</div>
                            </div>
                        </div>
                    </DeviceFrame>
                </div>
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 8 — Arrival + payment (mobile-money brand badges)
   ============================================================ */
export function Act2Scene8() {
    const [phase, setPhase] = React.useState<'arrived' | 'modal' | 'pay' | 'success'>('arrived');
    React.useEffect(() => {
        setPhase('arrived');
        const t1 = setTimeout(() => setPhase('modal'), 1100);
        const t2 = setTimeout(() => setPhase('pay'), 2400);
        const t3 = setTimeout(() => setPhase('success'), 3500);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    return (
        <SceneStage
            featureNumber={8}
            eyebrow="Feature 08 · Mobile-money checkout"
            title={<>Driver arrives. You pay in <span className="text-emerald-400">one tap</span>.</>}
            backdrop="mesh"
            palette={['#10b98166', '#06b6d466', '#22c55e44']}
            aside={
                <div className="space-y-4">
                    <div className="text-white/65 text-base leading-relaxed">
                        Wave, AfriMoney, QMoney, Yonna Wallet — the four wallets
                        that already move money in The Gambia. Pick the one in
                        your pocket. The driver gets paid before they drive away.
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['Wave', 'AfriMoney', 'QMoney', 'Yonna'].map((p) => (
                            <span key={p} className="text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            }
        >
            <div className="relative">
                <DeviceFrame tilt={-3} accent={BRAND.emerald}>
                    <div className="absolute inset-0 pt-12">
                        <div className="px-5 pt-2">
                            <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                                        <Truck className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">Lamin has arrived</div>
                                        <div className="text-xs text-gray-500">Outside your gate</div>
                                    </div>
                                    <div className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Now</div>
                                </div>
                            </div>
                        </div>

                        {/* payment modal */}
                        <AnimatePresence>
                            {phase !== 'arrived' && (
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                                    className="absolute inset-x-0 bottom-0 top-20 bg-white rounded-t-3xl overflow-hidden shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.3)]"
                                >
                                    {/* gradient header */}
                                    <div className="relative h-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4 60%, #14b8a6)' }}>
                                        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 60" preserveAspectRatio="none">
                                            <motion.path
                                                d="M0,30 C100,55 300,5 400,30 L400,60 L0,60 Z"
                                                fill="white"
                                                animate={{ d: ['M0,30 C100,55 300,5 400,30 L400,60 L0,60 Z', 'M0,30 C100,5 300,55 400,30 L400,60 L0,60 Z', 'M0,30 C100,55 300,5 400,30 L400,60 L0,60 Z'] }}
                                                transition={{ duration: 3, repeat: Infinity }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {phase === 'success' ? (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 200 }}
                                                    className="w-20 h-20 rounded-full bg-white/25 backdrop-blur flex items-center justify-center overflow-hidden"
                                                >
                                                    <div className="w-16 h-16 -m-1">
                                                        <DotLottieReact src="/success.lottie" autoplay loop={false} />
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    animate={{ rotate: [0, -8, 8, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                                                >
                                                    <Wallet className="w-8 h-8 text-white" strokeWidth={2.2} />
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 pb-12">
                                        {(phase === 'modal' || phase === 'pay') && (
                                            <>
                                                {/* line items */}
                                                <div className="text-center mb-3">
                                                    <div className="text-[10px] uppercase tracking-widest text-gray-400">Total due</div>
                                                    <div className="font-bold text-3xl tabular-nums text-gray-900">D 225</div>
                                                </div>
                                                <div className="rounded-xl bg-gray-50 p-3 text-xs space-y-1.5 mb-3 border border-gray-100">
                                                    <div className="flex justify-between"><span className="text-gray-500">3 × Bucket</span><span className="tabular-nums font-semibold">D 225</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Service fee</span><span className="tabular-nums font-semibold">D 0</span></div>
                                                    <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5"><span className="font-bold">Total</span><span className="tabular-nums font-bold text-emerald-600">D 225</span></div>
                                                </div>
                                                {/* pay methods */}
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <PayMethodBadge src="/wave.png" name="Wave" selected={phase === 'pay'} delay={0.05} />
                                                    <PayMethodBadge src="/afrimoneylogo.png" name="AfriMoney" delay={0.1} />
                                                    <PayMethodBadge src="/qmoneylogo.png" name="QMoney" delay={0.15} />
                                                    <PayMethodBadge src="/yonnawalletlogo.png" name="Yonna" delay={0.2} />
                                                </div>
                                                <motion.button
                                                    animate={phase === 'pay' ? { scale: [1, 0.96, 1] } : { scale: [1, 1.02, 1] }}
                                                    transition={{ duration: phase === 'pay' ? 0.4 : 1.2, repeat: phase === 'pay' ? 0 : Infinity }}
                                                    className="w-full py-3 rounded-xl font-bold text-white text-sm shadow-lg"
                                                    style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
                                                >
                                                    {phase === 'pay' ? 'Authorising…' : 'Pay D 225 with Wave'}
                                                </motion.button>
                                            </>
                                        )}
                                        {phase === 'success' && (
                                            <div className="text-center relative">
                                                <div className="font-bold text-xl text-gray-900">Payment Successful</div>
                                                <div className="text-xs text-gray-500 mt-1">D 225 · Receipt sent to +220 312 45 678</div>
                                                <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                                                    <Check className="w-3 h-3" /> Lamin paid · Trip closed
                                                </div>
                                                <Confetti delay={0.05} count={28} />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </DeviceFrame>

                {phase === 'success' && (
                    <FloatingCard delay={0.4} from="right" className="absolute -right-16 top-12 px-4 py-3 z-20">
                        <div className="text-white">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-semibold">Receipt</div>
                            <div className="font-mono text-xs mt-0.5 text-white/80">RCT-204-2026</div>
                            <div className="text-[11px] text-white/55 mt-2">Lamin · D 225 · Wave</div>
                        </div>
                    </FloatingCard>
                )}
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 9 — Hazard report → KMC
   ============================================================ */
export function Act2Scene9() {
    const [phase, setPhase] = React.useState<'capture' | 'compose' | 'send' | 'received'>('capture');
    React.useEffect(() => {
        setPhase('capture');
        const t1 = setTimeout(() => setPhase('compose'), 1300);
        const t2 = setTimeout(() => setPhase('send'), 3500);
        const t3 = setTimeout(() => setPhase('received'), 4400);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    // Real photo of dumping for the report card
    const HAZARD_PHOTO = '/story/hqdefault.jpg';

    return (
        <SceneStage
            featureNumber={9}
            eyebrow="Feature 09 · Citizen reporting"
            title={<>See illegal dumping? Report it. <span className="text-emerald-400">KMC gets it instantly.</span></>}
            backdrop="orbs"
            palette={['#ef444444', '#f59e0b44', '#10b98144']}
            layout="centered"
        >
            <div className="grid grid-cols-[1fr_120px_1fr] items-center gap-6 max-w-6xl w-full mt-2">
                {/* citizen phone */}
                <div className="flex justify-end" style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
                    <DeviceFrame tilt={6} accent={BRAND.amber}>
                        <div className="absolute inset-0 pt-12 px-4 flex flex-col">
                            <div className="text-sm font-bold mb-3 text-gray-900">New hazard report</div>
                            {/* real photo */}
                            <motion.div
                                animate={
                                    phase === 'capture'
                                        ? { scale: [1, 0.92, 1] }
                                        : { scale: 1 }
                                }
                                transition={{ duration: 0.5 }}
                                className="relative rounded-xl overflow-hidden mb-3 border-2 border-gray-200 shadow-md"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={HAZARD_PHOTO} alt="dump" className="w-full aspect-video object-cover" />
                                <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> Live
                                </div>
                                {phase === 'capture' && (
                                    <motion.div initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-white" />
                                )}
                                {phase === 'capture' && (
                                    <Camera className="absolute bottom-2 right-2 w-5 h-5 text-white drop-shadow" />
                                )}
                            </motion.div>
                            {phase !== 'capture' && (
                                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 min-h-[56px] border border-gray-100">
                                    <Typewriter text="Illegal dumping near Bakoteh roundabout, ~2 m³" speed={28} />
                                </div>
                            )}
                            {phase !== 'capture' && (
                                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                                    <MapPin className="w-3 h-3" /> 7XGM+JX Serrekunda · auto-tagged
                                </div>
                            )}
                            <div className="mt-auto mb-12">
                                <motion.div
                                    animate={phase === 'send' ? { scale: [1, 0.94, 1.04, 1] } : {}}
                                    transition={{ duration: 0.5 }}
                                    className="text-white text-center py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
                                >
                                    <Send className="w-4 h-4" />
                                    Send to authority
                                </motion.div>
                            </div>
                        </div>
                    </DeviceFrame>
                </div>

                {/* envelope flying with particle trail */}
                <div className="relative h-32 flex items-center justify-center">
                    <AnimatePresence>
                        {(phase === 'send' || phase === 'received') && (
                            <motion.div
                                initial={{ x: -130, opacity: 0, rotate: -10, scale: 0.6 }}
                                animate={{ x: phase === 'received' ? 90 : -10, opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute"
                            >
                                <div
                                    className="relative w-24 h-16 rounded-lg flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, #ffffff, #e2e8f0)',
                                        boxShadow: '0 12px 30px -8px rgba(16,185,129,0.5), 0 0 0 1px rgba(16,185,129,0.3)',
                                    }}
                                >
                                    <FileText className="w-7 h-7 text-emerald-600" />
                                    <ShimmerSweep />
                                </div>
                                {/* particle trail */}
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <motion.span
                                        key={i}
                                        className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-emerald-400"
                                        initial={{ x: 0, opacity: 0.8, scale: 1 }}
                                        animate={{ x: -40 - i * 15, opacity: 0, scale: 0.3 }}
                                        transition={{ duration: 0.9, delay: i * 0.08, repeat: Infinity, ease: 'easeOut' }}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* KMC with halo */}
                <div className="flex justify-start">
                    <motion.div
                        animate={phase === 'received' ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col items-center relative"
                    >
                        {/* halo */}
                        <motion.div
                            animate={phase === 'received' ? { scale: [1, 1.4], opacity: [0.6, 0] } : { opacity: 0 }}
                            transition={{ duration: 1.4, repeat: phase === 'received' ? Infinity : 0 }}
                            className="absolute top-0 w-36 h-36 rounded-full"
                            style={{ background: `radial-gradient(circle, ${BRAND.emerald}66, transparent 70%)` }}
                        />
                        <div className="relative w-36 h-36 rounded-full bg-white p-4 shadow-2xl flex items-center justify-center"
                            style={{ boxShadow: `0 30px 60px -10px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)` }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/kmc-logo.png" alt="KMC" className="w-full h-full object-contain" />
                            {phase === 'received' && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 240 }}
                                    className="absolute -top-2 -right-2 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                                    style={{ boxShadow: '0 0 20px rgba(239,68,68,0.7)' }}
                                >
                                    1
                                </motion.div>
                            )}
                        </div>
                        <div className="mt-4 font-bold text-emerald-300 text-sm uppercase tracking-[0.3em]">Kanifing Municipal</div>
                        <div className="text-[10px] text-white/40 mt-1 font-mono uppercase tracking-widest">Hazard inbox · live</div>
                    </motion.div>
                </div>
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 10 — Authority dashboard
   ============================================================ */
export function Act2Scene10() {
    const [status, setStatus] = React.useState<'New' | 'Acknowledged'>('New');
    const [counts, setCounts] = React.useState({ new: 1, ack: 12, resolved: 47 });
    React.useEffect(() => {
        setStatus('New');
        setCounts({ new: 1, ack: 12, resolved: 47 });
        const t = setTimeout(() => {
            setStatus('Acknowledged');
            setCounts({ new: 0, ack: 13, resolved: 47 });
        }, 2800);
        return () => clearTimeout(t);
    }, []);

    const incidents: BanjulMarker[] = [
        { id: 'i1', x: BANJUL_PLACES.serrekunda.x, y: BANJUL_PLACES.serrekunda.y, color: BRAND.red, pulse: status === 'New', label: 'New' },
        { id: 'i2', x: BANJUL_PLACES.bakoteh.x, y: BANJUL_PLACES.bakoteh.y, color: BRAND.amber, label: 'Open' },
        { id: 'i3', x: BANJUL_PLACES.bakau.x, y: BANJUL_PLACES.bakau.y, color: BRAND.amber, label: 'Open' },
        { id: 'i4', x: BANJUL_PLACES.kanifing.x, y: BANJUL_PLACES.kanifing.y, color: BRAND.emerald, label: 'Done' },
        { id: 'i5', x: BANJUL_PLACES.banjul.x + 30, y: BANJUL_PLACES.banjul.y + 30, color: BRAND.emerald, label: 'Done' },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* backdrop */}
            <div className="absolute inset-0">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)' }} />
            </div>
            <FrameCounter n={10} />
            <div className="absolute bottom-12 left-8 z-20 text-[10px] font-mono uppercase tracking-[0.5em] text-white/20 pointer-events-none">
                MBALIT · /demo
            </div>

            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 text-center max-w-3xl px-6 pointer-events-none">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl md:text-2xl font-bold leading-tight"
                >
                    The authority sees it the <span className="text-emerald-400">moment it lands</span>.
                </motion.h2>
            </div>

            {/* Dashboard chrome */}
            <div className="absolute inset-x-0 bottom-20 top-28 px-12 flex items-start justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-6xl rounded-3xl bg-white text-gray-900 shadow-[0_50px_120px_-20px_rgba(0,0,0,0.7)] overflow-hidden border border-white/10"
                >
                    {/* top bar */}
                    <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
                        <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/kmc-logo.png" alt="KMC" className="w-9 h-9 object-contain" />
                            <div>
                                <div className="font-bold text-sm">KMC Hazard Inbox</div>
                                <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Live · realtime sync
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-500" /><span className="font-semibold tabular-nums">{counts.new + counts.ack + counts.resolved}</span><span className="text-gray-400">total this week</span></div>
                            <div className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-emerald-500" /><span className="text-gray-400">Connected</span></div>
                        </div>
                    </div>

                    {/* KPI strip */}
                    <div className="grid grid-cols-3 border-b">
                        {[
                            { k: 'new', label: 'New', value: counts.new, color: BRAND.red, icon: AlertTriangle },
                            { k: 'ack', label: 'Acknowledged', value: counts.ack, color: BRAND.amber, icon: Hash },
                            { k: 'resolved', label: 'Resolved · 7 days', value: counts.resolved, color: BRAND.emerald, icon: Check },
                        ].map((kpi) => {
                            const Icon = kpi.icon;
                            return (
                                <div key={kpi.k} className="px-5 py-3 border-r last:border-r-0">
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500"><Icon className="w-3 h-3" style={{ color: kpi.color }} />{kpi.label}</div>
                                    <motion.div
                                        key={kpi.value}
                                        initial={{ scale: 1.3 }}
                                        animate={{ scale: 1 }}
                                        className="font-bold text-2xl tabular-nums mt-0.5"
                                        style={{ color: kpi.color }}
                                    >
                                        {kpi.value}
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>

                    {/* main grid: map + report list */}
                    <div className="grid grid-cols-[1.4fr_1fr]">
                        {/* map */}
                        <div className="relative aspect-[4/3] m-5 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                            <BanjulMap markers={incidents} nightMode />
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur text-white text-[10px] font-mono">
                                Greater Banjul · live
                            </div>
                            {/* mini chart strip */}
                            <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-black/70 backdrop-blur flex items-end gap-1 h-12">
                                {[3, 5, 4, 7, 6, 9, 12, 8, 11, 14, 10, 13, 15, 11].map((v, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${v * 5}%` }}
                                        transition={{ delay: 0.3 + i * 0.04, duration: 0.5 }}
                                        className="flex-1 rounded-t"
                                        style={{ background: i === 13 ? BRAND.emerald : 'rgba(255,255,255,0.4)' }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* report list */}
                        <div className="p-5">
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Latest report</div>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                            >
                                <div className="aspect-video bg-gray-100 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/story/hqdefault.jpg" alt="hazard" className="absolute inset-0 w-full h-full object-cover" />
                                    <motion.span
                                        key={status}
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 240 }}
                                        className={`absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                            status === 'New' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                        }`}
                                        style={status === 'New' ? { boxShadow: '0 0 20px rgba(239,68,68,0.6)' } : {}}
                                    >
                                        {status}
                                    </motion.span>
                                </div>
                                <div className="p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">Illegal dumping</div>
                                            <div className="text-xs text-gray-600 mt-0.5">Bakoteh roundabout, ~2 m³</div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1.5">
                                                <MapPin className="w-3 h-3" /> 7XGM+JX · 2 sec ago
                                            </div>
                                        </div>
                                    </div>
                                    {status === 'Acknowledged' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-3 px-3 py-2 bg-emerald-50 text-emerald-700 text-[11px] rounded-lg flex items-center gap-2 border border-emerald-100"
                                        >
                                            <Check className="w-3 h-3" /> Dispatch crew assigned · ETA 24 min
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

/* ============================================================
   Act III handoff — tightened to match new Act II look
   ============================================================ */
export function Act3Handoff() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0">
                {/* deep navy gradient */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #064e3b 0%, #0a0a0a 70%)' }} />
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center pt-16">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs uppercase tracking-[0.4em] text-emerald-400 font-semibold"
                >
                    Now
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mt-4 text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] max-w-3xl"
                >
                    Live on two phones — <span className="text-emerald-400">let&apos;s try it</span>.
                </motion.h2>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 flex items-center gap-12"
                >
                    <div style={{ transform: 'scale(0.78)' }}>
                        <DeviceFrame tilt={-6} accent={BRAND.emerald}>
                            <div className="absolute inset-0 pt-12 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
                                    <Truck className="w-8 h-8 text-white" />
                                </div>
                                <div className="font-bold text-gray-900">Customer</div>
                                <div className="text-xs text-gray-600 mt-1">Books a pickup</div>
                            </div>
                        </DeviceFrame>
                    </div>
                    <motion.div
                        animate={{ x: [0, 12, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        className="text-emerald-400"
                    >
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <path d="M8 24h32M28 12l12 12-12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </motion.div>
                    <div style={{ transform: 'scale(0.78)' }}>
                        <DeviceFrame tilt={6} accent={BRAND.amber}>
                            <div className="absolute inset-0 pt-12 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #fffbeb, #fed7aa)' }}>
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                                    <Truck className="w-8 h-8 text-white" />
                                </div>
                                <div className="font-bold text-gray-900">Driver</div>
                                <div className="text-xs text-gray-600 mt-1">Accepts &amp; delivers</div>
                            </div>
                        </DeviceFrame>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4 }}
                    className="mt-12 text-emerald-300/70 text-sm uppercase tracking-[0.5em] font-mono"
                >
                    mbalit.app
                </motion.div>
            </div>

        </div>
    );
}
