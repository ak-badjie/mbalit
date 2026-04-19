'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Check, MapPin, Plus, Minus, Truck } from 'lucide-react';
import { BRAND, PhoneFrame, SceneEyebrow, SceneTitle, ParticleBurst, CounterTicker } from '../primitives';

/* helper: scene wrapper with title on left + phone on right */
function SceneShell({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="absolute inset-0 grid grid-cols-2 items-center px-12 gap-12 max-w-7xl mx-auto">
            <div>
                <SceneEyebrow>{eyebrow}</SceneEyebrow>
                <div className="mt-3">
                    <SceneTitle>{title}</SceneTitle>
                </div>
            </div>
            <div className="flex justify-center">{children}</div>
        </div>
    );
}

/* ====== Scene 1: Phone + PIN onboarding ====== */
export function Act2Scene1() {
    const [phoneTxt, setPhoneTxt] = React.useState('');
    const [pinFilled, setPinFilled] = React.useState(0);
    const [done, setDone] = React.useState(false);

    React.useEffect(() => {
        setPhoneTxt(''); setPinFilled(0); setDone(false);
        const target = '+220 312 45 678';
        let i = 0;
        const tid = setInterval(() => {
            i++;
            setPhoneTxt(target.slice(0, i));
            if (i >= target.length) clearInterval(tid);
        }, 90);
        const pinTimers = [0, 1, 2, 3, 4, 5].map((n) =>
            setTimeout(() => setPinFilled(n + 1), 2300 + n * 280)
        );
        const dtimer = setTimeout(() => setDone(true), 4400);
        return () => {
            clearInterval(tid);
            pinTimers.forEach(clearTimeout);
            clearTimeout(dtimer);
        };
    }, []);

    return (
        <SceneShell eyebrow="Feature 01" title="Sign up in 30 seconds — phone + 6-digit PIN. No SMS, no email.">
            <PhoneFrame>
                <div className="p-6 pt-12 flex flex-col h-full">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 mx-auto mb-3 flex items-center justify-center">
                            <Phone className="w-7 h-7 text-white" />
                        </div>
                        <div className="font-bold text-lg">Welcome to Mbalit</div>
                        <div className="text-xs text-gray-500">Enter your phone</div>
                    </div>
                    <div className="bg-gray-100 rounded-xl p-4 text-lg font-mono tabular-nums mb-6 min-h-[56px] flex items-center justify-center">
                        {phoneTxt}
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-[2px] h-5 bg-gray-900 ml-0.5" />
                    </div>
                    <div className="text-center text-sm font-semibold mb-3">Create PIN</div>
                    <div className="flex justify-center gap-3 mb-6">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ scale: pinFilled > i ? [1, 1.3, 1] : 1, backgroundColor: pinFilled > i ? BRAND.emerald : '#e5e7eb' }}
                                transition={{ duration: 0.3 }}
                                className="w-4 h-4 rounded-full"
                            />
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-auto">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
                            <motion.div
                                key={i}
                                animate={k && pinFilled > 0 && pinFilled <= 6 && k === ['3', '1', '4', '1', '5', '9'][pinFilled - 1] ? { scale: [1, 0.85, 1] } : {}}
                                transition={{ duration: 0.2 }}
                                className={`h-11 rounded-xl ${k ? 'bg-gray-50 border border-gray-200 flex items-center justify-center text-base font-semibold' : ''}`}
                            >
                                {k}
                            </motion.div>
                        ))}
                    </div>
                    {done && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                                className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center"
                            >
                                <Check className="w-10 h-10 text-white" strokeWidth={3} />
                            </motion.div>
                            <ParticleBurst color={BRAND.emerald} />
                            <div className="mt-4 font-bold text-lg">Welcome aboard</div>
                        </motion.div>
                    )}
                </div>
            </PhoneFrame>
        </SceneShell>
    );
}

/* ====== Scene 2: Waste-type selection grid ====== */
export function Act2Scene2() {
    const tiles = [
        { name: 'Household', icon: '🏠', color: '#10b981' },
        { name: 'Kitchen', icon: '🍳', color: '#f59e0b' },
        { name: 'Chemical', icon: '⚗️', color: '#ef4444' },
        { name: 'Electronic', icon: '📱', color: '#8b5cf6' },
        { name: 'Construction', icon: '🏗️', color: '#6b7280' },
        { name: 'Garden', icon: '🌿', color: '#22c55e' },
        { name: 'Medical', icon: '🏥', color: '#ec4899' },
        { name: 'Recyclable', icon: '♻️', color: '#06b6d4' },
    ];
    const SELECTED = 5;
    return (
        <SceneShell eyebrow="Feature 02" title="Pick exactly what you need picked up.">
            <PhoneFrame>
                <div className="p-5 pt-12 h-full flex flex-col">
                    <div className="text-center mb-5">
                        <div className="font-bold text-lg">What kind of waste?</div>
                        <div className="text-xs text-gray-500">Tap one or more</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        {tiles.map((t, i) => (
                            <motion.div
                                key={t.name}
                                initial={{ opacity: 0, scale: 0.6, y: 20 }}
                                animate={{
                                    opacity: 1,
                                    scale: i === SELECTED ? [1, 1.08, 1] : 1,
                                    y: 0,
                                }}
                                transition={{
                                    delay: 0.2 + i * 0.08,
                                    type: 'spring',
                                    stiffness: 260,
                                    scale: { delay: 1.4, duration: 0.6 },
                                }}
                                className={`relative rounded-2xl border-2 p-3 flex flex-col items-center justify-center gap-1 ${
                                    i === SELECTED ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <div className="text-3xl">{t.icon}</div>
                                <div className="text-xs font-semibold text-center">{t.name}</div>
                                {i === SELECTED && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1.45, type: 'spring' }}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                                    >
                                        <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </PhoneFrame>
        </SceneShell>
    );
}

/* ====== Scene 3: Booking flow with stepper + ticking price ====== */
export function Act2Scene3() {
    const [step, setStep] = React.useState(1);
    const [bucket, setBucket] = React.useState(0);
    const [largeBin, setLargeBin] = React.useState(0);
    React.useEffect(() => {
        setStep(1); setBucket(0); setLargeBin(0);
        const t1 = setTimeout(() => setStep(2), 1200);
        const incs = [0, 1, 2, 3].map((n) => setTimeout(() => setBucket(n + 1), 1600 + n * 350));
        const lincs = [0, 1].map((n) => setTimeout(() => setLargeBin(n + 1), 3100 + n * 450));
        const t2 = setTimeout(() => setStep(3), 4200);
        return () => {
            clearTimeout(t1); clearTimeout(t2);
            incs.forEach(clearTimeout); lincs.forEach(clearTimeout);
        };
    }, []);

    const price = bucket * 75 + largeBin * 350;
    return (
        <SceneShell eyebrow="Feature 03" title="3 taps to book a pickup. The price ticks as you add bins.">
            <PhoneFrame>
                <div className="p-5 pt-12 h-full flex flex-col">
                    {/* stepper */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {[1, 2, 3].map((n) => (
                            <React.Fragment key={n}>
                                <motion.div
                                    animate={{
                                        backgroundColor: step >= n ? BRAND.emerald : '#e5e7eb',
                                        scale: step === n ? [1, 1.2, 1] : 1,
                                    }}
                                    transition={{ duration: 0.4 }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                >
                                    {step > n ? <Check className="w-4 h-4" /> : n}
                                </motion.div>
                                {n < 3 && <div className={`h-0.5 w-8 ${step > n ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="text-center mb-6">
                        <div className="font-bold">How many containers?</div>
                    </div>
                    {[
                        { name: 'Small Bucket', count: bucket, set: setBucket, price: 75, color: BRAND.amber },
                        { name: 'Large Bin', count: largeBin, set: setLargeBin, price: 350, color: BRAND.emerald },
                    ].map((row) => (
                        <div key={row.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-3">
                            <div>
                                <div className="font-semibold text-sm">{row.name}</div>
                                <div className="text-xs text-gray-500">D{row.price} each</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"><Minus className="w-3 h-3" /></div>
                                <motion.span
                                    key={row.count}
                                    initial={{ scale: 1.4 }}
                                    animate={{ scale: 1 }}
                                    className="font-bold w-6 text-center tabular-nums"
                                >
                                    {row.count}
                                </motion.span>
                                <div className="w-7 h-7 rounded-full text-white flex items-center justify-center" style={{ background: row.color }}><Plus className="w-3 h-3" /></div>
                            </div>
                        </div>
                    ))}
                    <div className="mt-auto p-4 bg-emerald-500 rounded-2xl text-white">
                        <div className="text-xs opacity-80">Total</div>
                        <div className="text-3xl font-bold tabular-nums">
                            D <CounterTicker to={price} duration={0.4} />
                        </div>
                    </div>
                </div>
            </PhoneFrame>
        </SceneShell>
    );
}

/* ====== Scene 4: Map zoom + plus code decode ====== */
export function Act2Scene4() {
    const [zoom, setZoom] = React.useState(1);
    const [code, setCode] = React.useState('');
    React.useEffect(() => {
        setZoom(1); setCode('');
        const t1 = setTimeout(() => setZoom(2), 800);
        const t2 = setTimeout(() => setZoom(3), 1900);
        const target = '7XGM+JX Serrekunda';
        let typeId: ReturnType<typeof setInterval> | null = null;
        const t3 = setTimeout(() => {
            let i = 0;
            typeId = setInterval(() => {
                i++;
                setCode(target.slice(0, i));
                if (i >= target.length && typeId) clearInterval(typeId);
            }, 70);
        }, 3000);
        return () => {
            clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
            if (typeId) clearInterval(typeId);
        };
    }, []);
    return (
        <SceneShell eyebrow="Feature 04" title="Drop a pin — even where streets have no names.">
            <PhoneFrame>
                <div className="h-full flex flex-col">
                    <div className="relative flex-1 bg-gradient-to-br from-emerald-100 to-teal-100 overflow-hidden">
                        <motion.div
                            animate={{ scale: zoom * 1.6 }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 origin-center"
                        >
                            <svg viewBox="0 0 400 400" className="w-full h-full">
                                {/* roads */}
                                <path d="M 0 200 L 400 200" stroke="#fff" strokeWidth="6" />
                                <path d="M 200 0 L 200 400" stroke="#fff" strokeWidth="6" />
                                <path d="M 50 50 Q 200 100 380 80" stroke="#fff" strokeWidth="3" fill="none" />
                                <path d="M 50 350 Q 200 300 380 320" stroke="#fff" strokeWidth="3" fill="none" />
                                {/* blocks */}
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <rect key={i} x={20 + (i % 6) * 60} y={20 + Math.floor(i / 6) * 90} width="40" height="50" fill="#10b981" opacity="0.3" rx="4" />
                                ))}
                            </svg>
                        </motion.div>
                        {/* drop pin */}
                        {zoom >= 3 && (
                            <motion.div
                                initial={{ y: -200, scale: 0 }}
                                animate={{ y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full"
                            >
                                <MapPin className="w-12 h-12 text-red-500 fill-red-500 drop-shadow-lg" />
                            </motion.div>
                        )}
                        {zoom >= 3 && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0.6 }}
                                animate={{ scale: [0, 3], opacity: [0.6, 0] }}
                                transition={{ duration: 1.6, repeat: Infinity }}
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-500"
                            />
                        )}
                    </div>
                    <div className="p-4 bg-white border-t">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Plus Code</div>
                        <div className="font-mono text-lg font-bold text-gray-900 min-h-[28px]">
                            {code}
                            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-[2px] h-4 bg-gray-900 ml-0.5 align-middle" />
                        </div>
                    </div>
                </div>
            </PhoneFrame>
        </SceneShell>
    );
}

/* ====== Scene 5: Job broadcast → dynamic island morph ====== */
export function Act2Scene5() {
    const [phase, setPhase] = React.useState<'idle' | 'fly' | 'compact' | 'large'>('idle');
    React.useEffect(() => {
        setPhase('idle');
        const t1 = setTimeout(() => setPhase('fly'), 600);
        const t2 = setTimeout(() => setPhase('compact'), 2000);
        const t3 = setTimeout(() => setPhase('large'), 3000);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
            <SceneEyebrow>Feature 05</SceneEyebrow>
            <div className="mt-4 mb-12 max-w-4xl text-center">
                <SceneTitle>Jobs broadcast straight to nearby drivers.</SceneTitle>
            </div>
            <div className="relative w-full max-w-5xl h-[360px] flex items-center justify-between">
                {/* customer card */}
                <motion.div
                    animate={phase === 'idle' ? {} : { x: 0, opacity: phase === 'fly' ? 1 : 0 }}
                    className="bg-white rounded-2xl text-gray-900 p-5 w-64 shadow-2xl"
                >
                    <div className="text-xs text-gray-500 mb-1">Pickup request</div>
                    <div className="font-bold mb-2">Household + Recyclable</div>
                    <div className="text-sm text-gray-600 mb-3">3 buckets · D 225</div>
                    <div className="text-xs text-emerald-600 font-semibold">Searching nearby drivers…</div>
                </motion.div>

                {/* trail / arrow */}
                {phase === 'fly' && (
                    <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="absolute left-1/4 right-1/4 top-1/2 h-1 origin-left bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full"
                    />
                )}

                {/* dynamic island - on the right (collector phone) */}
                <div className="relative">
                    <PhoneFrame>
                        <div className="relative w-full h-full bg-gray-100 flex flex-col items-center pt-6">
                            <motion.div
                                animate={
                                    phase === 'large'
                                        ? { width: 260, height: 130, borderRadius: 32 }
                                        : phase === 'compact'
                                        ? { width: 180, height: 38, borderRadius: 24 }
                                        : { width: 120, height: 28, borderRadius: 24 }
                                }
                                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                                className="bg-black flex flex-col items-center justify-center overflow-hidden text-white"
                            >
                                {phase === 'compact' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-3 text-xs font-semibold">
                                        <Truck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>New pickup nearby</span>
                                    </motion.div>
                                )}
                                {phase === 'large' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="px-4 py-3 w-full">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Truck className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-semibold">Pickup offer · 0.8 km</span>
                                        </div>
                                        <div className="font-bold">Household + Recyclable</div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-emerald-400 font-bold">D 225</span>
                                            <span className="text-[10px] bg-emerald-500 px-2 py-1 rounded-full">Accept</span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                            <div className="mt-auto pb-4 text-xs text-gray-500">Driver is online</div>
                        </div>
                    </PhoneFrame>
                </div>
            </div>
        </div>
    );
}
