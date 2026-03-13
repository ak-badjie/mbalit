'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Recycle, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

// Component Imports
import TruckLogo from '@/components/ui/truck-logo';
import Header from '@/components/layout/header';
import WhoIsItFor from '@/components/sections/WhoIsItFor';
import Footer from '@/components/layout/Footer';
import { JigsawBlock } from '@/components/ui/jigsaw-block';

export default function Home() {
  return (
    <div className="min-h-screen bg-emerald-950 overflow-hidden font-sans selection:bg-emerald-500/30">
        <Header />

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-20 pb-0 md:pt-32 overflow-hidden px-4">
        {/* Assets & Overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Desktop Hero Image */}
            <div className="absolute inset-0 z-0 hidden sm:block opacity-60 brightness-75">
                <Image
                  src="/hero.png"
                  alt="Waste truck collection"
                  fill
                  className="object-cover object-center scale-105"
                  priority
                />
            </div>

            {/* Mobile Hero Image */}
            <div className="absolute inset-0 z-0 sm:hidden opacity-60 brightness-75">
                <Image
                  src="/hero-mobile.png"
                  alt="Waste truck collection mobile"
                  fill
                  className="object-cover object-center"
                  priority
                />
            </div>

            {/* Premium Gradient Orbs with Slight Dark Tint */}
            <div className="absolute inset-0 bg-black/40 z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[120px] rounded-full mix-blend-screen" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/20 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            {/* Grain/Noise Overlay */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />

            {/* Binary Data Overlay */}
            <div className="absolute inset-0 overflow-hidden opacity-[0.03] select-none z-0 mt-20">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-emerald-100 font-mono text-[10px] sm:text-xs tracking-widest whitespace-nowrap"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${(i % 10) * 10}%`,
                  }}
                >
                  {[...Array(12)].map(() => (Math.random() > 0.5 ? '1' : '0')).join(' ')}
                </div>
              ))}
            </div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center -mt-8 sm:mt-0">
          
          {/* Main Content Group */}
          <div className="w-full flex flex-col items-center justify-center relative mt-8 sm:mt-12 text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="mb-8"
            >
                <TruckLogo size="xl" className="mx-auto drop-shadow-2xl" showText={false} />
            </motion.div>

            <motion.h1 
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight px-2 leading-tight drop-shadow-xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Smart <span className="text-emerald-400 relative inline-block">
                Waste
                <motion.span 
                  className="absolute -bottom-2 left-0 w-full h-1.5 bg-emerald-400 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                />
              </span>
              <br className="sm:hidden" /> Management
            </motion.h1>

            {/* Hero Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-sm sm:text-lg md:text-xl text-gray-200 max-w-xl md:max-w-2xl mx-auto mb-10 leading-relaxed font-light drop-shadow-md px-4"
            >
              Connect with verified waste collectors in your area. Schedule pickups,
              track in real-time, and contribute to a cleaner environment.
            </motion.p>

            {/* CTA Buttons - Diagonal Interlocking Puzzle Pair */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="relative w-[320px] h-[180px] mx-auto mt-8 pb-10"
            >
                {/* Sign Up Piece — top-left, with bottom-right corner notch */}
                <Link href="/auth?signup=true" className="absolute top-0 left-0 block group cursor-pointer z-20">
                    <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -3, x: -2 }}>
                        <div className="relative w-[200px] h-[90px]">
                            <svg viewBox="0 0 200 90" fill="none" className="absolute inset-0 w-full h-full drop-shadow-lg">
                                <path d={`
                                    M 20,0
                                    L 180,0 A 20,20 0 0 1 200,20
                                    L 200,42
                                    L 172,42 A 10,10 0 0 0 162,52
                                    L 162,70 A 20,20 0 0 1 142,90
                                    L 20,90 A 20,20 0 0 1 0,70
                                    L 0,20 A 20,20 0 0 1 20,0 Z
                                `} fill="#10b981" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                                {/* Glass highlight */}
                                <path d={`
                                    M 20,0
                                    L 180,0 A 20,20 0 0 1 200,20
                                    L 200,42
                                    L 172,42 A 10,10 0 0 0 162,52
                                    L 162,70 A 20,20 0 0 1 142,90
                                    L 20,90 A 20,20 0 0 1 0,70
                                    L 0,20 A 20,20 0 0 1 20,0 Z
                                `} fill="url(#signupGrad)" opacity="0.15" />
                                <defs>
                                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="white" stopOpacity="1" />
                                        <stop offset="50%" stopColor="white" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="relative z-10 flex items-center justify-center h-full pr-6">
                                <span className="font-black tracking-wider text-2xl text-white drop-shadow-sm">SIGN UP</span>
                            </div>
                        </div>
                    </motion.div>
                </Link>

                {/* Log In Piece — bottom-right, with top-left corner tab that fits into Sign Up's notch */}
                <Link href="/auth" className="absolute bottom-0 right-0 block group cursor-pointer z-10">
                    <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -3, x: 2 }}>
                        <div className="relative w-[200px] h-[90px]">
                            <svg viewBox="0 0 200 90" fill="none" className="absolute inset-0 w-full h-full drop-shadow-lg">
                                <path d={`
                                    M 58,0 A 20,20 0 0 1 78,0
                                    L 180,0 A 20,20 0 0 1 200,20
                                    L 200,70 A 20,20 0 0 1 180,90
                                    L 20,90 A 20,20 0 0 1 0,70
                                    L 0,48
                                    L 28,48 A 10,10 0 0 0 38,38
                                    L 38,20 A 20,20 0 0 1 58,0 Z
                                `} fill="white" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                                {/* Glass highlight */}
                                <path d={`
                                    M 58,0 A 20,20 0 0 1 78,0
                                    L 180,0 A 20,20 0 0 1 200,20
                                    L 200,70 A 20,20 0 0 1 180,90
                                    L 20,90 A 20,20 0 0 1 0,70
                                    L 0,48
                                    L 28,48 A 10,10 0 0 0 38,38
                                    L 38,20 A 20,20 0 0 1 58,0 Z
                                `} fill="url(#loginGrad)" opacity="0.08" />
                                <defs>
                                    <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="black" stopOpacity="0" />
                                        <stop offset="100%" stopColor="black" stopOpacity="0.1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="relative z-10 flex items-center justify-center h-full pl-6">
                                <span className="font-extrabold tracking-wider text-2xl text-emerald-900">LOG IN</span>
                            </div>
                        </div>
                    </motion.div>
                </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Additional Sections */}
      <WhoIsItFor />
      <Footer />
    </div>
  );
}
