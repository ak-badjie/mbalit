'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Grid3x3, X } from 'lucide-react';
import { Act1Scene1, Act1Scene2, Act1Scene3, Act1Scene4, Act1Scene5, Act1Scene6 } from './scenes/act1';
import { Act2Scene1, Act2Scene2, Act2Scene3, Act2Scene4, Act2Scene5 } from './scenes/act2a';
import { Act2Scene6, Act2Scene7, Act2Scene8, Act2Scene9, Act2Scene10, Act3Handoff } from './scenes/act2b';

type Scene = {
    id: string;
    act: 'I' | 'II' | 'III';
    label: string;
    Component: React.ComponentType;
};

const SCENES: Scene[] = [
    { id: 'p1', act: 'I', label: 'Intro', Component: Act1Scene1 },
    { id: 'p2', act: 'I', label: 'Daily numbers', Component: Act1Scene2 },
    { id: 'p3', act: 'I', label: 'Drains & disease', Component: Act1Scene3 },
    { id: 'p4', act: 'I', label: 'The collection gap', Component: Act1Scene4 },
    { id: 'p5', act: 'I', label: 'Communities affected', Component: Act1Scene5 },
    { id: 'p6', act: 'I', label: 'Corporate dumping → KMC', Component: Act1Scene6 },
    { id: 'f1', act: 'II', label: '01 · Phone + PIN onboarding', Component: Act2Scene1 },
    { id: 'f2', act: 'II', label: '02 · Waste-type grid', Component: Act2Scene2 },
    { id: 'f3', act: 'II', label: '03 · Booking + price ticker', Component: Act2Scene3 },
    { id: 'f4', act: 'II', label: '04 · Map pin + plus code', Component: Act2Scene4 },
    { id: 'f5', act: 'II', label: '05 · Job → dynamic island', Component: Act2Scene5 },
    { id: 'f6', act: 'II', label: '06 · Atomic accept', Component: Act2Scene6 },
    { id: 'f7', act: 'II', label: '07 · Live tracking', Component: Act2Scene7 },
    { id: 'f8', act: 'II', label: '08 · Arrival & payment', Component: Act2Scene8 },
    { id: 'f9', act: 'II', label: '09 · Hazard report → KMC', Component: Act2Scene9 },
    { id: 'f10', act: 'II', label: '10 · Authority dashboard', Component: Act2Scene10 },
    { id: 'h', act: 'III', label: 'Live demo handoff', Component: Act3Handoff },
];

export default function DemoPage() {
    const [index, setIndex] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);

    const next = useCallback(() => setIndex((i) => Math.min(SCENES.length - 1, i + 1)), []);
    const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPickerOpen((p) => !p);
                return;
            }
            if (pickerOpen) return;
            if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
                e.preventDefault();
                next();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                prev();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [next, prev, pickerOpen]);

    const scene = SCENES[index];
    const Scene = scene.Component;
    const progress = ((index + 1) / SCENES.length) * 100;

    return (
        <div
            className="absolute inset-0 cursor-pointer select-none"
            onClick={(e) => {
                // ignore clicks on chrome controls (they stop propagation themselves)
                if (pickerOpen) return;
                next();
            }}
        >
            {/* Subtle background grain */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '4px 4px' }} />

            {/* Scene */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={scene.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                >
                    <Scene />
                </motion.div>
            </AnimatePresence>

            {/* Top-left act badge */}
            <div className="absolute top-6 left-6 z-30 flex items-center gap-3 pointer-events-none">
                <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-mono uppercase tracking-widest">
                    Act {scene.act}
                </div>
                <div className="text-xs text-white/40 font-mono">{index + 1} / {SCENES.length}</div>
            </div>

            {/* Top-right controls */}
            <div className="absolute top-6 right-6 z-30 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => setPickerOpen(true)}
                    className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-xs font-medium flex items-center gap-2 transition-colors"
                >
                    <Grid3x3 className="w-3.5 h-3.5" />
                    Scenes
                </button>
                <button
                    onClick={prev}
                    disabled={index === 0}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-colors disabled:opacity-30"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={next}
                    disabled={index === SCENES.length - 1}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-colors disabled:opacity-30"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Bottom progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 z-30">
                <motion.div
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 26 }}
                    className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
                />
            </div>

            {/* Bottom-right hint */}
            <div className="absolute bottom-6 right-6 z-30 text-[10px] text-white/30 font-mono uppercase tracking-widest pointer-events-none">
                Space / → next   ·   ← prev   ·   Esc menu
            </div>

            {/* Scene picker overlay */}
            <AnimatePresence>
                {pickerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-12"
                        onClick={(e) => {
                            e.stopPropagation();
                            setPickerOpen(false);
                        }}
                    >
                        <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold">Jump to scene</h3>
                                <button
                                    onClick={() => setPickerOpen(false)}
                                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {SCENES.map((s, i) => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setIndex(i);
                                            setPickerOpen(false);
                                        }}
                                        className={`text-left p-4 rounded-xl transition-all border ${
                                            i === index
                                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="text-[10px] uppercase tracking-widest opacity-60">Act {s.act}</div>
                                        <div className="font-semibold mt-1 text-sm">{s.label}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-6 text-xs text-white/40">
                                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">Esc</kbd> to close
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
