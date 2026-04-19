'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Truck, MapPin, Camera, Send, AlertTriangle, Mail } from 'lucide-react';
import { BRAND, PhoneFrame, SceneEyebrow, SceneTitle, ParticleBurst, Typewriter } from '../primitives';

/* ====== Scene 6: Atomic accept (race-safe) ====== */
export function Act2Scene6() {
    const [phase, setPhase] = React.useState<'race' | 'won' | 'done'>('race');
    React.useEffect(() => {
        setPhase('race');
        const t1 = setTimeout(() => setPhase('won'), 1700);
        const t2 = setTimeout(() => setPhase('done'), 2700);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>Feature 06</SceneEyebrow>
            <div className="mt-4 mb-12 max-w-4xl text-center">
                <SceneTitle>Two drivers tap &ldquo;Accept&rdquo; — only one wins.</SceneTitle>
            </div>

            <div className="grid grid-cols-2 gap-12 max-w-5xl w-full">
                {[
                    { name: 'Lamin', initial: 'L', wins: true, color: BRAND.emerald },
                    { name: 'Modou', initial: 'M', wins: false, color: BRAND.amber },
                ].map((d) => (
                    <div key={d.name} className="flex flex-col items-center">
                        <motion.div
                            animate={{
                                y: phase === 'race' ? [0, -8, 0] : 0,
                            }}
                            transition={{ duration: 0.4, repeat: phase === 'race' ? Infinity : 0 }}
                            className="w-24 h-24 rounded-full text-white font-bold text-3xl flex items-center justify-center shadow-2xl"
                            style={{ background: d.color }}
                        >
                            {d.initial}
                        </motion.div>
                        <div className="mt-3 text-lg font-semibold text-white/90">{d.name}</div>
                        {phase !== 'done' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-3 px-5 py-2 rounded-full text-white text-sm font-semibold"
                                style={{ background: d.color }}
                            >
                                Tap to Accept
                            </motion.div>
                        )}
                        {phase === 'done' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-3 px-4 py-2 rounded-full text-sm font-semibold ${
                                    d.wins ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-white/80'
                                }`}
                            >
                                {d.wins ? '✓ You got the job' : '✗ Claimed by another driver'}
                            </motion.div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center text-sm text-white/40 font-mono">
                runTransaction → atomic single-winner write
            </div>
        </div>
    );
}

/* ====== Scene 7: Live truck tracking (split screen) ====== */
export function Act2Scene7() {
    const [progress, setProgress] = React.useState(0);
    React.useEffect(() => {
        setProgress(0);
        const id = setInterval(() => {
            setProgress((p) => {
                const next = Math.min(1, p + 0.025);
                if (next >= 1) clearInterval(id);
                return next;
            });
        }, 120);
        return () => clearInterval(id);
    }, []);
    const stepIndex = Math.min(4, Math.floor(progress * 5));
    const steps = ['Accepted', 'En route', 'Arrived', 'Picking up', 'Done'];

    // route waypoints (an arc)
    const pathStart = { x: 30, y: 250 };
    const pathEnd = { x: 270, y: 80 };
    const cx = 150 + Math.cos(progress * Math.PI - Math.PI / 2) * 130;
    const cy = 165 - Math.sin(progress * Math.PI - Math.PI / 2) * 90;

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>Feature 07</SceneEyebrow>
            <div className="mt-4 mb-10 max-w-4xl text-center">
                <SceneTitle>Watch your driver in real time.</SceneTitle>
            </div>
            <div className="grid grid-cols-2 gap-10 max-w-5xl w-full items-center">
                {/* Driver phone (map) */}
                <div className="flex justify-center">
                    <PhoneFrame>
                        <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 relative">
                            <svg viewBox="0 0 300 320" className="w-full h-full">
                                <path d="M 30 250 Q 150 50 270 80" stroke="#3b82f6" strokeWidth="4" fill="none" strokeDasharray="6 4" />
                                <circle cx={pathStart.x} cy={pathStart.y} r="8" fill={BRAND.emerald} />
                                <circle cx={pathEnd.x} cy={pathEnd.y} r="8" fill={BRAND.red} />
                                <motion.circle cx={cx} cy={cy} r="11" fill="#3b82f6" />
                                <motion.circle cx={cx} cy={cy} r="11" fill="#3b82f6" opacity="0.4" animate={{ r: [11, 22], opacity: [0.4, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />
                                <text x={pathStart.x + 12} y={pathStart.y + 4} fontSize="11" fill="#374151">Start</text>
                                <text x={pathEnd.x - 30} y={pathEnd.y - 12} fontSize="11" fill="#374151">Pickup</text>
                            </svg>
                            <div className="absolute bottom-0 left-0 right-0 bg-white p-3 border-t">
                                <div className="text-xs text-gray-500">Driver view</div>
                                <div className="font-bold text-sm">En route to pickup</div>
                            </div>
                        </div>
                    </PhoneFrame>
                </div>
                {/* Customer phone (stepper) */}
                <div className="flex justify-center">
                    <PhoneFrame>
                        <div className="p-5 pt-14 h-full">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Customer view</div>
                            <div className="font-bold text-lg mb-5">Tracking your pickup</div>
                            <div className="space-y-4">
                                {steps.map((s, i) => (
                                    <div key={s} className="flex items-center gap-3">
                                        <motion.div
                                            animate={{
                                                backgroundColor: i <= stepIndex ? BRAND.emerald : '#e5e7eb',
                                                scale: i === stepIndex ? [1, 1.3, 1] : 1,
                                            }}
                                            transition={{ duration: 0.4, scale: { duration: 0.6, repeat: i === stepIndex ? Infinity : 0 } }}
                                            className="w-7 h-7 rounded-full flex items-center justify-center"
                                        >
                                            {i < stepIndex ? <Check className="w-4 h-4 text-white" strokeWidth={4} /> : <span className="text-xs font-bold text-white">{i + 1}</span>}
                                        </motion.div>
                                        <span className={`font-medium ${i <= stepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-3 bg-emerald-50 rounded-xl">
                                <div className="text-xs text-emerald-700 font-semibold">ETA</div>
                                <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                                    {Math.max(1, Math.round((1 - progress) * 8))} min
                                </div>
                            </div>
                        </div>
                    </PhoneFrame>
                </div>
            </div>
        </div>
    );
}

/* ====== Scene 8: Arrival + payment success ====== */
export function Act2Scene8() {
    const [phase, setPhase] = React.useState<'arrived' | 'modal' | 'success'>('arrived');
    React.useEffect(() => {
        setPhase('arrived');
        const t1 = setTimeout(() => setPhase('modal'), 1200);
        const t2 = setTimeout(() => setPhase('success'), 2900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>Feature 08</SceneEyebrow>
            <div className="mt-4 mb-10 max-w-4xl text-center">
                <SceneTitle>Driver arrives. You pay in one tap.</SceneTitle>
            </div>
            <div className="flex justify-center">
                <PhoneFrame>
                    <div className="h-full relative bg-gray-100">
                        {/* arrived view */}
                        <div className="p-5 pt-14">
                            <div className="bg-white rounded-2xl p-4 shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-bold">Lamin has arrived</div>
                                        <div className="text-xs text-gray-500">Outside your gate</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* payment modal slide-up */}
                        <AnimatePresence>
                            {phase !== 'arrived' && (
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                                    className="absolute inset-x-0 bottom-0 top-16 bg-white rounded-t-3xl overflow-hidden shadow-2xl"
                                >
                                    {/* wave header */}
                                    <div className="relative h-32 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 overflow-hidden">
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
                                                    className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                                                >
                                                    <Check className="w-12 h-12 text-white" strokeWidth={4} />
                                                </motion.div>
                                            ) : (
                                                <div className="text-white text-3xl">💳</div>
                                            )}
                                            {phase === 'success' && <ParticleBurst color="#fff" count={20} />}
                                        </div>
                                    </div>
                                    <div className="p-5 text-center">
                                        {phase === 'modal' && (
                                            <>
                                                <div className="font-bold text-lg">Pay D 225</div>
                                                <div className="text-xs text-gray-500 mb-4">Wave · AfriMoney · QMoney</div>
                                                <motion.div
                                                    animate={{ scale: [1, 1.05, 1] }}
                                                    transition={{ duration: 1.2, repeat: Infinity }}
                                                    className="bg-emerald-500 text-white py-3 rounded-xl font-bold"
                                                >
                                                    Proceed to Pay
                                                </motion.div>
                                            </>
                                        )}
                                        {phase === 'success' && (
                                            <>
                                                <div className="font-bold text-xl text-gray-900">Payment Successful</div>
                                                <div className="text-sm text-gray-500 mt-1">D 225 · Receipt sent</div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </PhoneFrame>
            </div>
        </div>
    );
}

/* ====== Scene 9: Hazard report → KMC ====== */
export function Act2Scene9() {
    const [phase, setPhase] = React.useState<'capture' | 'compose' | 'send' | 'received'>('capture');
    React.useEffect(() => {
        setPhase('capture');
        const t1 = setTimeout(() => setPhase('compose'), 1300);
        const t2 = setTimeout(() => setPhase('send'), 3500);
        const t3 = setTimeout(() => setPhase('received'), 4400);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>Feature 09</SceneEyebrow>
            <div className="mt-4 mb-10 max-w-4xl text-center">
                <SceneTitle>See illegal dumping? Report it. KMC gets it instantly.</SceneTitle>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8 max-w-6xl w-full">
                {/* Phone */}
                <div className="flex justify-end">
                    <PhoneFrame>
                        <div className="p-4 pt-12 h-full flex flex-col">
                            <div className="text-sm font-bold mb-3">New hazard report</div>
                            {/* photo */}
                            <motion.div
                                animate={
                                    phase === 'capture'
                                        ? { scale: [1, 0.9, 1] }
                                        : phase === 'compose' || phase === 'send' || phase === 'received'
                                        ? { scale: 0.7, opacity: 1 }
                                        : {}
                                }
                                transition={{ duration: 0.5 }}
                                className="relative rounded-xl overflow-hidden mb-3 origin-top-left"
                            >
                                <div className="aspect-video bg-gradient-to-br from-amber-200 via-amber-300 to-orange-400 flex items-center justify-center relative">
                                    <Camera className="w-10 h-10 text-amber-900/40" />
                                    {/* trash silhouettes */}
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <div key={i} className="absolute bg-amber-900/30 rounded" style={{ width: 16 + i * 4, height: 12 + i * 3, left: 20 + i * 28, bottom: 10 }} />
                                    ))}
                                </div>
                                {phase === 'capture' && (
                                    <motion.div initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-white" />
                                )}
                            </motion.div>
                            {/* compose */}
                            {phase !== 'capture' && (
                                <div className="bg-gray-50 rounded-xl p-3 text-sm min-h-[60px]">
                                    <Typewriter text="Illegal dumping near Bakoteh roundabout, ~2 m³" speed={28} />
                                </div>
                            )}
                            <div className="mt-auto">
                                <motion.div
                                    animate={phase === 'send' ? { scale: [1, 0.9, 1.05, 1], backgroundColor: BRAND.emerald } : {}}
                                    className="bg-emerald-500 text-white text-center py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    Send to authority
                                </motion.div>
                            </div>
                        </div>
                    </PhoneFrame>
                </div>
                {/* envelope flying */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <AnimatePresence>
                        {(phase === 'send' || phase === 'received') && (
                            <motion.div
                                initial={{ x: -180, opacity: 0, rotate: -10 }}
                                animate={{ x: phase === 'received' ? 80 : -10, opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute"
                            >
                                <div className="w-24 h-16 bg-white rounded-lg shadow-2xl flex items-center justify-center">
                                    <Mail className="w-8 h-8 text-emerald-600" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* KMC */}
                <div className="flex justify-start">
                    <motion.div
                        animate={phase === 'received' ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-32 h-32 rounded-full bg-white p-3 shadow-2xl flex items-center justify-center relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://i0.wp.com/kanifing.gm/wp-content/uploads/2020/04/KMC-Logo1.png" alt="KMC" className="w-full h-full object-contain" />
                            {phase === 'received' && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring' }}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
                                >
                                    1
                                </motion.div>
                            )}
                        </div>
                        <div className="mt-3 font-semibold text-emerald-400 text-sm uppercase tracking-wider">Kanifing Municipal</div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

/* ====== Scene 10: Authority dashboard pulse ====== */
export function Act2Scene10() {
    const [status, setStatus] = React.useState<'New' | 'Acknowledged'>('New');
    React.useEffect(() => {
        setStatus('New');
        const t = setTimeout(() => setStatus('Acknowledged'), 2800);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>Feature 10</SceneEyebrow>
            <div className="mt-4 mb-10 max-w-4xl text-center">
                <SceneTitle>The authority sees it the moment it lands.</SceneTitle>
            </div>
            <div className="w-full max-w-5xl rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden">
                {/* dashboard chrome */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://i0.wp.com/kanifing.gm/wp-content/uploads/2020/04/KMC-Logo1.png" alt="KMC" className="w-10 h-10 object-contain" />
                        <div>
                            <div className="font-bold">KMC Hazard Inbox</div>
                            <div className="text-xs text-gray-500">Live · 1 new report</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-emerald-500" />
                        Connected
                    </div>
                </div>
                <div className="grid grid-cols-2">
                    {/* Map */}
                    <div className="relative aspect-square bg-gradient-to-br from-emerald-50 to-teal-100 m-6 rounded-2xl overflow-hidden">
                        <svg viewBox="0 0 300 300" className="w-full h-full opacity-60">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="300" stroke="#10b981" strokeWidth="0.5" />
                            ))}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <line key={`h${i}`} x1="0" y1={i * 25} x2="300" y2={i * 25} stroke="#10b981" strokeWidth="0.5" />
                            ))}
                        </svg>
                        {/* pulsing red marker */}
                        <div className="absolute" style={{ left: '55%', top: '40%' }}>
                            <motion.div
                                animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                                transition={{ duration: 1.6, repeat: Infinity }}
                                className="absolute w-8 h-8 rounded-full bg-red-500 -translate-x-1/2 -translate-y-1/2"
                            />
                            <MapPin className="w-8 h-8 text-red-600 fill-red-500 -translate-x-1/2 -translate-y-full" />
                        </div>
                    </div>
                    {/* report card */}
                    <div className="p-6">
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <div className="font-bold">Illegal dumping</div>
                                </div>
                                <motion.span
                                    key={status}
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 240 }}
                                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                                        status === 'New' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                    }`}
                                >
                                    {status}
                                </motion.span>
                            </div>
                            <div className="aspect-video bg-gradient-to-br from-amber-200 to-orange-400 rounded-lg mb-3" />
                            <div className="text-sm text-gray-700">Illegal dumping near Bakoteh roundabout, ~2 m³</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                <MapPin className="w-3 h-3" />
                                <span>7XGM+JX Serrekunda</span>
                                <span>·</span>
                                <span>2 sec ago</span>
                            </div>
                            {status === 'Acknowledged' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 px-3 py-2 bg-emerald-50 text-emerald-700 text-xs rounded-lg flex items-center gap-2"
                                >
                                    <Check className="w-3 h-3" /> Dispatch crew assigned
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ====== Act III handoff card ====== */
export function Act3Handoff() {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
            <SceneEyebrow>Now</SceneEyebrow>
            <div className="mt-4 max-w-4xl">
                <SceneTitle>Live on two phones — let&apos;s try it.</SceneTitle>
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-12 flex items-center gap-10"
            >
                <PhoneFrame>
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
                        <div className="text-center">
                            <div className="text-4xl mb-3">📱</div>
                            <div className="font-bold text-gray-900">Customer</div>
                            <div className="text-xs text-gray-500 mt-1">Books a pickup</div>
                        </div>
                    </div>
                </PhoneFrame>
                <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-emerald-400 text-4xl">↔</motion.div>
                <PhoneFrame>
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
                        <div className="text-center">
                            <div className="text-4xl mb-3">🚛</div>
                            <div className="font-bold text-gray-900">Driver</div>
                            <div className="text-xs text-gray-500 mt-1">Accepts & delivers</div>
                        </div>
                    </div>
                </PhoneFrame>
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="mt-10 text-white/60 text-sm uppercase tracking-[0.4em]"
            >
                mbalit.app
            </motion.div>
        </div>
    );
}
