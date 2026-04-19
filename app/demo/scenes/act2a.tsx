'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, MapPin, Plus, Minus, Truck, Clock, Sparkles, Zap } from 'lucide-react';
import { BRAND, CounterTicker } from '../primitives';
import {
    DeviceFrame,
    SceneStage,
    FloatingCard,
    ShimmerSweep,
    Confetti,
    WasteIcon,
    WASTE_META,
    WasteKind,
    MoneyParticle,
    BanjulMap,
    BANJUL_PLACES,
    BanjulMarker,
} from '../cinematic';

/* ============================================================
   Scene 1 — Phone + PIN onboarding
   ============================================================ */
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
        <SceneStage
            featureNumber={1}
            eyebrow="Feature 01 · Onboarding"
            title={<>Sign up in <span className="text-emerald-400">30 seconds</span> — phone + 6-digit PIN.</>}
            backdrop="orbs"
            palette={['#10b98155', '#06b6d455', '#22c55e44']}
            aside={
                <div className="space-y-3 mt-2">
                    <div className="text-white/65 text-base leading-relaxed">
                        No SMS gateway. No email. No password reset hell.
                        Just a phone number and a PIN you set yourself.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {['No SMS', 'No email', 'Works offline', 'Sub-second'].map((c) => (
                            <span key={c} className="text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            }
        >
            <div className="relative">
                {/* biometric ring around the device */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-10 rounded-[80px] pointer-events-none"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0%, ${BRAND.emerald}55 25%, transparent 50%, ${BRAND.cyan}44 75%, transparent 100%)`,
                        filter: 'blur(20px)',
                    }}
                />
                <DeviceFrame tilt={-6} accent={BRAND.emerald}>
                    <div className="absolute inset-0 pt-12 px-6 flex flex-col">
                        <div className="text-center mb-5">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 220 }}
                                className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                            >
                                <Phone className="w-8 h-8 text-white" />
                                <ShimmerSweep />
                            </motion.div>
                            <div className="font-bold text-lg">Welcome to Mbalit</div>
                            <div className="text-xs text-gray-500">Enter your phone</div>
                        </div>
                        <div className="bg-gray-100 rounded-xl p-4 text-lg font-mono tabular-nums mb-5 min-h-[56px] flex items-center justify-center border border-gray-200">
                            {phoneTxt}
                            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-[2px] h-5 bg-gray-900 ml-0.5" />
                        </div>
                        <div className="text-center text-sm font-semibold mb-3">Create PIN</div>
                        <div className="flex justify-center gap-3 mb-5">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ scale: pinFilled > i ? [1, 1.4, 1] : 1, backgroundColor: pinFilled > i ? BRAND.emerald : '#e5e7eb' }}
                                    transition={{ duration: 0.3 }}
                                    className="w-4 h-4 rounded-full shadow-sm"
                                />
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-auto pb-12">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
                                <motion.div
                                    key={i}
                                    animate={k && pinFilled > 0 && pinFilled <= 6 && k === ['3', '1', '4', '1', '5', '9'][pinFilled - 1] ? { scale: [1, 0.85, 1], backgroundColor: ['#f9fafb', '#d1fae5', '#f9fafb'] } : {}}
                                    transition={{ duration: 0.25 }}
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
                                className="absolute inset-0 bg-white/95 backdrop-blur flex flex-col items-center justify-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200 }}
                                    className="w-24 h-24 rounded-full flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)', boxShadow: '0 20px 60px -10px rgba(16,185,129,0.6)' }}
                                >
                                    <Check className="w-12 h-12 text-white" strokeWidth={3} />
                                </motion.div>
                                <Confetti delay={0.1} />
                                <div className="mt-4 font-bold text-xl">Welcome aboard</div>
                                <div className="text-xs text-gray-500 mt-1">Account ready</div>
                            </motion.div>
                        )}
                    </div>
                </DeviceFrame>

                {/* floating timer card */}
                <FloatingCard delay={0.5} from="right" className="absolute -right-12 top-12 px-4 py-3 z-20">
                    <div className="flex items-center gap-2 text-white">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-white/50">Onboard time</div>
                            <div className="font-bold tabular-nums text-lg">~ 28 sec</div>
                        </div>
                    </div>
                </FloatingCard>

                <FloatingCard delay={0.9} from="left" className="absolute -left-16 bottom-24 px-4 py-3 z-20">
                    <div className="flex items-center gap-2 text-white">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-white/50">No SMS cost</div>
                            <div className="font-bold tabular-nums text-lg">D 0</div>
                        </div>
                    </div>
                </FloatingCard>
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 2 — Waste-type selection grid
   ============================================================ */
export function Act2Scene2() {
    const tiles: WasteKind[] = ['household', 'kitchen', 'chemical', 'electronic', 'construction', 'garden', 'medical', 'recyclable'];
    const SELECTED_INDEX = 5; // garden
    const SELECTED_2 = 0; // household

    return (
        <SceneStage
            featureNumber={2}
            eyebrow="Feature 02 · Waste types"
            title={<>Pick exactly what you need <span className="text-emerald-400">picked up</span>.</>}
            backdrop="grid"
            accent={BRAND.emerald}
            aside={
                <div className="text-white/65 text-base leading-relaxed">
                    Households mix garden trimmings with kitchen scraps and the
                    odd dead phone. The collector needs to know what they&apos;re
                    coming for — and what they can&apos;t accept.
                </div>
            }
        >
            <div className="relative">
                <DeviceFrame tilt={4} accent={BRAND.emerald}>
                    <div className="absolute inset-0 pt-12 px-5 flex flex-col">
                        <div className="text-center mb-4">
                            <div className="font-bold text-lg">What kind of waste?</div>
                            <div className="text-xs text-gray-500">Tap one or more</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 flex-1 pb-10">
                            {tiles.map((kind, i) => {
                                const meta = WASTE_META[kind];
                                const isSelected = i === SELECTED_INDEX || i === SELECTED_2;
                                return (
                                    <motion.div
                                        key={kind}
                                        initial={{ opacity: 0, scale: 0.6, y: 20 }}
                                        animate={{
                                            opacity: 1,
                                            scale: isSelected ? [1, 1.06, 1] : 1,
                                            y: 0,
                                        }}
                                        transition={{
                                            delay: 0.2 + i * 0.06,
                                            type: 'spring',
                                            stiffness: 260,
                                            scale: { delay: 1.2 + (i === SELECTED_2 ? 0 : 0.4), duration: 0.5 },
                                        }}
                                        className="relative rounded-2xl p-3 flex flex-col items-center justify-center gap-2 overflow-hidden"
                                        style={{
                                            background: isSelected
                                                ? `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`
                                                : 'white',
                                            border: isSelected ? 'none' : '1.5px solid #e5e7eb',
                                            boxShadow: isSelected
                                                ? `0 12px 28px -8px ${meta.color}88`
                                                : '0 1px 2px rgba(0,0,0,0.04)',
                                            color: isSelected ? 'white' : meta.color,
                                        }}
                                    >
                                        {/* tap ripple on the second selection */}
                                        {i === SELECTED_INDEX && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0.6 }}
                                                animate={{ scale: 4, opacity: 0 }}
                                                transition={{ delay: 1.6, duration: 0.9 }}
                                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white"
                                            />
                                        )}
                                        <WasteIcon kind={kind} className="w-9 h-9" />
                                        <div className={`text-xs font-bold text-center ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                            {meta.label}
                                        </div>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 1.4 + (i === SELECTED_2 ? 0 : 0.4), type: 'spring' }}
                                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center"
                                            >
                                                <Check className="w-3 h-3" strokeWidth={4} style={{ color: meta.color }} />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </DeviceFrame>

                <FloatingCard delay={1.6} from="right" className="absolute -right-14 bottom-32 px-4 py-3 z-20">
                    <div className="text-white">
                        <div className="text-[10px] uppercase tracking-widest text-white/50">Selected</div>
                        <div className="font-bold text-base">2 categories</div>
                        <div className="text-[11px] text-white/60 mt-1">Household · Garden</div>
                    </div>
                </FloatingCard>
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 3 — Booking + ticking price
   ============================================================ */
export function Act2Scene3() {
    const [step, setStep] = React.useState(1);
    const [bucket, setBucket] = React.useState(0);
    const [largeBin, setLargeBin] = React.useState(0);
    const [pulseId, setPulseId] = React.useState(0);

    React.useEffect(() => {
        setStep(1); setBucket(0); setLargeBin(0); setPulseId(0);
        const t1 = setTimeout(() => setStep(2), 1200);
        const incs = [0, 1, 2, 3].map((n) => setTimeout(() => { setBucket(n + 1); setPulseId((p) => p + 1); }, 1600 + n * 350));
        const lincs = [0, 1].map((n) => setTimeout(() => { setLargeBin(n + 1); setPulseId((p) => p + 1); }, 3100 + n * 450));
        const t2 = setTimeout(() => setStep(3), 4200);
        return () => {
            clearTimeout(t1); clearTimeout(t2);
            incs.forEach(clearTimeout); lincs.forEach(clearTimeout);
        };
    }, []);

    const price = bucket * 75 + largeBin * 350;
    const gbpEquiv = (price / 75).toFixed(2);

    return (
        <SceneStage
            featureNumber={3}
            eyebrow="Feature 03 · Booking"
            title={<>3 taps to book. The price <span className="text-emerald-400">ticks live</span> as you add bins.</>}
            backdrop="mesh"
            palette={['#f59e0b', '#10b981', '#06b6d4']}
            aside={
                <div className="text-white/65 text-base leading-relaxed">
                    Transparent dalasi pricing. No surge. No hidden fees.
                    What you see is what the driver gets paid.
                </div>
            }
        >
            <div className="relative">
                <DeviceFrame tilt={-3} accent={BRAND.amber}>
                    <div className="absolute inset-0 pt-12 px-5 flex flex-col">
                        {/* stepper */}
                        <div className="flex items-center justify-center gap-2 mb-5">
                            {[1, 2, 3].map((n) => (
                                <React.Fragment key={n}>
                                    <motion.div
                                        animate={{
                                            backgroundColor: step >= n ? BRAND.emerald : '#e5e7eb',
                                            scale: step === n ? [1, 1.2, 1] : 1,
                                        }}
                                        transition={{ duration: 0.4 }}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
                                    >
                                        {step > n ? <Check className="w-4 h-4" /> : n}
                                    </motion.div>
                                    {n < 3 && <div className={`h-0.5 w-8 ${step > n ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="text-center mb-5">
                            <div className="font-bold">How many containers?</div>
                            <div className="text-xs text-gray-500">For Saturday morning</div>
                        </div>
                        {[
                            { name: 'Small Bucket', count: bucket, price: 75, color: BRAND.amber, sub: '~ 20 L' },
                            { name: 'Large Bin', count: largeBin, price: 350, color: BRAND.emerald, sub: '~ 120 L' },
                        ].map((row) => (
                            <div key={row.name} className="relative flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
                                <div>
                                    <div className="font-semibold text-sm">{row.name}</div>
                                    <div className="text-[11px] text-gray-500">D {row.price} each · {row.sub}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"><Minus className="w-3 h-3" /></div>
                                    <motion.span
                                        key={row.count}
                                        initial={{ scale: 1.5 }}
                                        animate={{ scale: 1 }}
                                        className="font-bold w-6 text-center tabular-nums"
                                    >
                                        {row.count}
                                    </motion.span>
                                    <div className="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-sm" style={{ background: row.color }}><Plus className="w-3 h-3" /></div>
                                </div>
                            </div>
                        ))}
                        <div className="relative mt-auto mb-12 p-4 rounded-2xl text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
                            <ShimmerSweep />
                            <div className="text-xs opacity-80">Total</div>
                            <div className="text-3xl font-bold tabular-nums flex items-baseline gap-1">
                                D <CounterTicker to={price} duration={0.4} />
                                {pulseId > 0 && (
                                    <MoneyParticle key={pulseId} label="+ D" delay={0} color="rgba(255,255,255,0.95)" />
                                )}
                            </div>
                            <div className="text-[10px] opacity-70 mt-1 tabular-nums">≈ £ {gbpEquiv}</div>
                        </div>
                    </div>
                </DeviceFrame>

                <FloatingCard delay={1.4} from="right" className="absolute -right-16 top-14 px-4 py-3 z-20">
                    <div className="text-white">
                        <div className="text-[10px] uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-amber-400" /> Live price
                        </div>
                        <div className="font-bold tabular-nums text-2xl text-amber-300 mt-0.5">
                            D <CounterTicker to={price} duration={0.4} />
                        </div>
                        <div className="text-[11px] text-white/55 mt-0.5">Updated each tap</div>
                    </div>
                </FloatingCard>
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 4 — Map + Plus Code (real Banjul zoom dolly)
   ============================================================ */
export function Act2Scene4() {
    const [phase, setPhase] = React.useState<'wide' | 'zoom' | 'pin' | 'code'>('wide');
    const [code, setCode] = React.useState('');

    React.useEffect(() => {
        setPhase('wide'); setCode('');
        const t1 = setTimeout(() => setPhase('zoom'), 900);
        const t2 = setTimeout(() => setPhase('pin'), 2100);
        let typeId: ReturnType<typeof setInterval> | null = null;
        const t3 = setTimeout(() => {
            setPhase('code');
            const target = '7XGM+JX Serrekunda';
            let i = 0;
            typeId = setInterval(() => {
                i++;
                setCode(target.slice(0, i));
                if (i >= target.length && typeId) clearInterval(typeId);
            }, 65);
        }, 3100);
        return () => {
            clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
            if (typeId) clearInterval(typeId);
        };
    }, []);

    const zoomTo =
        phase === 'wide'
            ? undefined
            : { x: BANJUL_PLACES.serrekunda.x, y: BANJUL_PLACES.serrekunda.y, zoom: 2.4 };

    const markers: BanjulMarker[] = phase === 'pin' || phase === 'code' ? [
        { id: 'pickup', x: BANJUL_PLACES.serrekunda.x, y: BANJUL_PLACES.serrekunda.y, color: BRAND.red, pulse: true, label: 'Pickup' },
    ] : [];

    return (
        <SceneStage
            featureNumber={4}
            eyebrow="Feature 04 · Pickup location"
            title={<>Drop a pin — even where <span className="text-emerald-400">streets have no names</span>.</>}
            backdrop="grid"
            accent={BRAND.cyan}
            aside={
                <div className="text-white/65 text-base leading-relaxed">
                    Greater Banjul is full of compounds with no formal address.
                    A Plus Code is a 10×10 m square anyone with a phone can resolve.
                </div>
            }
        >
            <div className="relative">
                <DeviceFrame tilt={4} accent={BRAND.cyan}>
                    <div className="absolute inset-0 flex flex-col pt-9">
                        <div className="relative flex-1 overflow-hidden">
                            <BanjulMap zoomTo={zoomTo} markers={markers} />
                        </div>
                        <div className="px-4 pt-3 pb-12 bg-white border-t border-gray-100">
                            <div className="text-[10px] text-gray-500 uppercase tracking-[0.25em] mb-1">Plus Code</div>
                            <div className="font-mono text-base font-bold text-gray-900 min-h-[24px]">
                                {code}
                                {phase === 'code' && code.length < 'X7GM+JX Serrekunda'.length && (
                                    <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }} className="inline-block w-[2px] h-4 bg-gray-900 ml-0.5 align-middle" />
                                )}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">10 × 10 m precision</div>
                        </div>
                    </div>
                </DeviceFrame>

                <FloatingCard delay={1.0} from="right" className="absolute -right-14 top-10 px-4 py-3 z-20">
                    <div className="text-white">
                        <div className="text-[10px] uppercase tracking-widest text-white/50 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" /> Coordinates
                        </div>
                        <div className="font-mono font-bold text-sm tabular-nums">13.4549° N</div>
                        <div className="font-mono font-bold text-sm tabular-nums">16.6798° W</div>
                    </div>
                </FloatingCard>

                <FloatingCard delay={2.6} from="left" className="absolute -left-14 bottom-32 px-4 py-3 z-20">
                    <div className="text-white">
                        <div className="text-[10px] uppercase tracking-widest text-white/50">Compound</div>
                        <div className="font-bold text-sm">Bakoteh Ward</div>
                        <div className="text-[11px] text-white/55">Serrekunda, GM</div>
                    </div>
                </FloatingCard>
            </div>
        </SceneStage>
    );
}

/* ============================================================
   Scene 5 — Job broadcast over the city
   ============================================================ */
export function Act2Scene5() {
    const [phase, setPhase] = React.useState<'idle' | 'broadcast' | 'compact' | 'large' | 'won'>('idle');
    React.useEffect(() => {
        setPhase('idle');
        const t1 = setTimeout(() => setPhase('broadcast'), 700);
        const t2 = setTimeout(() => setPhase('compact'), 2000);
        const t3 = setTimeout(() => setPhase('large'), 3000);
        const t4 = setTimeout(() => setPhase('won'), 4400);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, []);

    const customerLoc = { x: BANJUL_PLACES.bakoteh.x, y: BANJUL_PLACES.bakoteh.y };
    const drivers = [
        { id: 'D1', x: 380, y: 320, name: 'Lamin', win: true },
        { id: 'D2', x: 600, y: 320, name: 'Modou', win: false },
        { id: 'D3', x: 480, y: 460, name: 'Awa', win: false },
        { id: 'D4', x: 580, y: 250, name: 'Pa', win: false },
    ];
    const visible = phase !== 'idle';

    const markers: BanjulMarker[] = [
        { id: 'cust', x: customerLoc.x, y: customerLoc.y, color: BRAND.red, pulse: visible, label: 'Pickup', icon: 'pin' },
        ...drivers.map((d) => ({
            id: d.id,
            x: d.x,
            y: d.y,
            color: phase === 'won' && d.win ? BRAND.emerald : phase === 'won' ? '#94a3b8' : BRAND.amber,
            label: d.name,
            icon: 'driver' as const,
            pulse: phase === 'won' && d.win,
        })),
    ];

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* full-bleed map backdrop */}
            <div className="absolute inset-0">
                <BanjulMap markers={markers} nightMode />
                {/* broadcast rings */}
                {(phase === 'broadcast' || phase === 'compact') && (
                    <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full pointer-events-none">
                        {[0, 0.5, 1].map((d) => (
                            <motion.circle
                                key={d}
                                cx={customerLoc.x}
                                cy={customerLoc.y}
                                r={20}
                                fill="none"
                                stroke={BRAND.emerald}
                                strokeWidth="2"
                                initial={{ r: 20, opacity: 0.6 }}
                                animate={{ r: 280, opacity: 0 }}
                                transition={{ duration: 2.4, repeat: Infinity, delay: d, ease: 'easeOut' }}
                            />
                        ))}
                    </svg>
                )}
                {/* dark vignette so the title reads */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/70 pointer-events-none" />
            </div>

            {/* Top chrome */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 text-center max-w-3xl px-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] uppercase tracking-[0.4em] text-emerald-300 font-semibold"
                >
                    Feature 05 · Live broadcast
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-2 text-4xl font-bold leading-tight"
                >
                    Jobs broadcast straight to <span className="text-emerald-400">nearby drivers</span>.
                </motion.h2>
            </div>

            {/* customer card bottom-left */}
            <FloatingCard delay={0.4} from="left" className="absolute bottom-24 left-12 z-20 p-4 w-72">
                <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Pickup request</div>
                <div className="font-bold text-white">Household + Garden</div>
                <div className="text-sm text-white/70 mt-1">3 buckets · D 225</div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 font-semibold">Searching nearby drivers…</span>
                </div>
            </FloatingCard>

            {/* driver phone bottom-right with dynamic island */}
            <div className="absolute bottom-12 right-12 z-20" style={{ transform: 'scale(0.78)', transformOrigin: 'bottom right' }}>
                <DeviceFrame tilt={-4} accent={BRAND.emerald}>
                    <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center pt-6">
                        <motion.div
                            animate={
                                phase === 'large' || phase === 'won'
                                    ? { width: 260, height: 130, borderRadius: 30 }
                                    : phase === 'compact'
                                    ? { width: 200, height: 38, borderRadius: 22 }
                                    : { width: 110, height: 28, borderRadius: 22 }
                            }
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                            className="bg-black flex flex-col items-center justify-center overflow-hidden text-white border border-white/10"
                            style={{ marginTop: 4 }}
                        >
                            <AnimatePresence mode="wait">
                                {phase === 'compact' && (
                                    <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 text-xs font-semibold">
                                        <Truck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>New pickup nearby</span>
                                    </motion.div>
                                )}
                                {(phase === 'large' || phase === 'won') && (
                                    <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 w-full">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Truck className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-semibold">Pickup offer · 0.8 km</span>
                                        </div>
                                        <div className="font-bold text-sm">Household + Garden</div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-emerald-400 font-bold tabular-nums">D 225</span>
                                            <motion.span
                                                animate={phase === 'won' ? { scale: [1, 1.15, 1] } : {}}
                                                transition={{ duration: 0.4 }}
                                                className="text-[10px] bg-emerald-500 px-2.5 py-1 rounded-full font-semibold"
                                            >
                                                {phase === 'won' ? '✓ Accepted' : 'Accept'}
                                            </motion.span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        <div className="mt-auto pb-12 text-[10px] text-white/40 uppercase tracking-widest">Driver online</div>
                    </div>
                </DeviceFrame>
            </div>
        </div>
    );
}
