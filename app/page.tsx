'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Recycle, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

// Component Imports
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import WhoIsItFor from '@/components/sections/WhoIsItFor';
import Footer from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Hero Section - Strict Height but allows scrolling below */}
      <section className="relative h-[100dvh] w-full flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">

          {/* Desktop Image (Hidden on Mobile) */}
          <div className="hidden md:block absolute inset-0">
            <Image
              src="/hero.jpeg"
              alt="Mbalit Hero Background Desktop"
              fill
              className="object-cover object-center"
              priority
              quality={100}
            />
          </div>

          {/* Mobile Image (Visible on Mobile) */}
          <div className="block md:hidden absolute inset-0">
            <Image
              src="/hero-mobile.jpeg"
              alt="Mbalit Hero Background Mobile"
              fill
              className="object-cover object-center"
              priority
              quality={100}
            />
          </div>

          {/* Gradient Overlay for Readability - Consistent on both */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Hero Content - Added top padding to prevent header overlap */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col items-center justify-center h-full pt-32 md:pt-40">
          <div className="text-center max-w-4xl mx-auto">
            {/* Hero Badge */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-medium mb-6"
            >
              <Recycle className="w-3 h-3 text-emerald-300" />
              <span className="tracking-widest uppercase text-[10px] sm:text-xs">Making The Gambia cleaner</span>
            </motion.div>

            {/* Hero Title - Adjusted size for mobile fit */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight"
            >
              Waste Collection
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                Made Easy
              </span>
            </motion.h1>

            {/* Hero Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-sm sm:text-lg md:text-xl text-gray-100 max-w-xl md:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light drop-shadow-md px-2"
            >
              Connect with verified waste collectors in your area. Schedule pickups,
              track in real-time, and contribute to a cleaner environment.
            </motion.p>

            {/* CTA Buttons - PLAIN WHITE & SMALLER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4"
            >
              {/* Primary: Have Your Waste Collected */}
              <Link href="/auth?signup=true" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  rightIcon={<ArrowRight size={16} />}
                  className="w-full sm:w-auto px-5 py-3 text-sm sm:text-base rounded-xl bg-white text-gray-900 border-none hover:bg-gray-100 font-semibold shadow-xl"
                >
                  Have Your Waste Collected
                </Button>
              </Link>

              {/* Secondary: Become a Collector - IDENTICAL STYLE */}
              <Link href="/auth?signup=true&role=collector" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Truck size={16} />}
                  className="w-full sm:w-auto px-5 py-3 text-sm sm:text-base rounded-xl bg-white text-gray-900 border-none hover:bg-gray-100 font-semibold shadow-xl"
                >
                  Become a Collector
                </Button>
              </Link>
            </motion.div>

            {/* Login Link - BOLD & VISIBLE */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 sm:mt-12 bg-black/40 backdrop-blur-sm inline-block px-5 py-2 rounded-full border border-white/10"
            >
              <span className="text-gray-300 text-xs sm:text-sm mr-2">Already have an account?</span>
              <Link href="/auth" className="text-white hover:text-emerald-300 transition-colors text-xs sm:text-sm font-bold uppercase tracking-wide">
                Login Here
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Mouse/Scroll Animation Removed as requested */}

      </section>

      {/* Additional Sections added after Hero */}
      <WhoIsItFor />
      <Footer />
    </div>
  );
}
