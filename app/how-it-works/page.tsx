'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowLeft,
    ArrowRight,
    MapPin,
    Package,
    CreditCard,
    Truck,
    CheckCircle,
    Clock,
    Star,
    Shield,
    Smartphone,
    Navigation,
    Recycle,
    Sparkles,
    Phone,
    MessageCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const fadeInLeft = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
};

const fadeInRight = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
};

// Animated Section Component
const AnimatedSection = ({
    children,
    className = ''
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <motion.section
            ref={ref}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className={className}
        >
            {children}
        </motion.section>
    );
};

// Step Card Component
const StepCard = ({
    number,
    icon: Icon,
    title,
    description,
    details,
    image,
    imageAlt,
    reverse = false,
}: {
    number: number;
    icon: React.ElementType;
    title: string;
    description: string;
    details: string[];
    image?: string;
    imageAlt?: string;
    reverse?: boolean;
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 items-center`}
        >
            {/* Content Side */}
            <motion.div
                variants={reverse ? fadeInRight : fadeInLeft}
                transition={{ duration: 0.6 }}
                className="flex-1"
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-xl shadow-lg">
                        {number}
                    </div>
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                        <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    {title}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                    {description}
                </p>
                <ul className="space-y-3">
                    {details.map((detail, index) => (
                        <motion.li
                            key={index}
                            variants={fadeInUp}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-3"
                        >
                            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">{detail}</span>
                        </motion.li>
                    ))}
                </ul>
            </motion.div>

            {/* Visual Side */}
            <motion.div
                variants={reverse ? fadeInLeft : fadeInRight}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex-1 w-full"
            >
                {image ? (
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                        <Image
                            src={image}
                            alt={imageAlt || title}
                            width={600}
                            height={400}
                            className="w-full h-auto"
                        />
                    </div>
                ) : (
                    <div className="aspect-video rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                        <Icon className="w-24 h-24 text-emerald-400 opacity-50" />
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

// Live Tracking Demo Component
const LiveTrackingDemo = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden shadow-2xl"
        >
            {/* Simulated Map Background */}
            <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 400 300">
                    {/* Grid lines */}
                    {[...Array(20)].map((_, i) => (
                        <line
                            key={`h-${i}`}
                            x1="0"
                            y1={i * 15}
                            x2="400"
                            y2={i * 15}
                            stroke="#10b981"
                            strokeWidth="0.5"
                            opacity="0.3"
                        />
                    ))}
                    {[...Array(27)].map((_, i) => (
                        <line
                            key={`v-${i}`}
                            x1={i * 15}
                            y1="0"
                            x2={i * 15}
                            y2="300"
                            stroke="#10b981"
                            strokeWidth="0.5"
                            opacity="0.3"
                        />
                    ))}
                </svg>
            </div>

            <div className="relative p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                    {/* Your Location */}
                    <div className="flex-1 text-center">
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                boxShadow: [
                                    '0 0 0 0 rgba(16, 185, 129, 0.4)',
                                    '0 0 0 20px rgba(16, 185, 129, 0)',
                                    '0 0 0 0 rgba(16, 185, 129, 0)',
                                ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-20 h-20 mx-auto rounded-full bg-emerald-500 flex items-center justify-center mb-4"
                        >
                            <MapPin className="w-10 h-10 text-white" />
                        </motion.div>
                        <h4 className="text-lg font-semibold text-white">Your Location</h4>
                        <p className="text-sm text-gray-400">4HMQ+3C Banjul</p>
                    </div>

                    {/* Connection Line with Moving Dot */}
                    <div className="relative w-full lg:w-48 h-2 lg:h-32 flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r lg:bg-gradient-to-b from-emerald-500 to-orange-500 rounded-full opacity-30" />
                        <motion.div
                            animate={{
                                x: ['0%', '100%', '0%'],
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute top-1/2 lg:top-0 -translate-y-1/2 lg:translate-y-0 w-4 h-4 bg-white rounded-full shadow-lg"
                        />
                        {/* Distance label */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 px-3 py-1 rounded-full text-xs text-white whitespace-nowrap">
                            2.5 km • 8 min
                        </div>
                    </div>

                    {/* Collector */}
                    <div className="flex-1 text-center">
                        <motion.div
                            animate={{
                                y: [0, -5, 0],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-20 h-20 mx-auto rounded-full bg-orange-500 flex items-center justify-center mb-4"
                        >
                            <Truck className="w-10 h-10 text-white" />
                        </motion.div>
                        <h4 className="text-lg font-semibold text-white">Collector En Route</h4>
                        <p className="text-sm text-gray-400">Amadou B. • ⭐ 4.9</p>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-8 bg-gray-800/50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-white font-medium">Live Tracking Active</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                            <Phone className="w-4 h-4" />
                            Call
                        </button>
                        <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            Message
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Payment Section Component
const PaymentSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 rounded-3xl overflow-hidden shadow-2xl"
        >
            <div className="p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                    {/* Wave Logo & Info */}
                    <motion.div
                        variants={fadeInLeft}
                        transition={{ duration: 0.6 }}
                        className="flex-1 text-white"
                    >
                        <div className="flex items-center gap-5 mb-6">
                            <div className="bg-white rounded-2xl p-4 shadow-lg">
                                <Image
                                    src="/wave.png"
                                    alt="Wave"
                                    width={160}
                                    height={96}
                                    className="w-40 h-24 object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">Pay with Wave</h3>
                                <p className="text-white/80">Fast, secure mobile payments</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">No Cash Needed</h4>
                                    <p className="text-sm text-white/70">Pay directly from your Wave account</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Secure & Instant</h4>
                                    <p className="text-sm text-white/70">Your payment is protected and confirmed instantly</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Pay After Service</h4>
                                    <p className="text-sm text-white/70">Only pay once you&apos;re satisfied with pickup</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Mock Phone Display */}
                    <motion.div
                        variants={fadeInRight}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="flex-1"
                    >
                        <div className="relative max-w-xs mx-auto">
                            {/* Phone Frame */}
                            <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                                <div className="bg-white rounded-[2.5rem] overflow-hidden">
                                    {/* Status Bar */}
                                    <div className="bg-gray-100 py-2 px-6 flex items-center justify-between text-xs">
                                        <span>9:41</span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-2 bg-gray-400 rounded-sm" />
                                        </div>
                                    </div>
                                    {/* App Content */}
                                    <div className="p-6 text-center">
                                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
                                            <CreditCard className="w-8 h-8 text-white" />
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-1">Payment Request</h4>
                                        <p className="text-3xl font-bold text-gray-900 mb-1">D 50.00</p>
                                        <p className="text-sm text-gray-500 mb-6">Mbalit Waste Collection</p>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-semibold"
                                        >
                                            Confirm Payment
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {/* Glow Effect */}
                            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-[4rem] blur-xl -z-10" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
            <Header />

            {/* Hero Section */}
            <section className="pt-24 pb-12 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                        <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                            How <span className="text-emerald-500">Mbalit</span> Works
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Getting rid of your waste has never been easier. Request a pickup in minutes,
                            track your collector in real-time, and pay securely with Wave.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* For Customers Section */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full mb-4">
                            <Recycle className="w-5 h-5" />
                            <span className="font-semibold">For Waste Owners</span>
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Schedule a Pickup in 4 Easy Steps
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            From request to collection, we&apos;ve made the process seamless and transparent.
                        </p>
                    </motion.div>

                    {/* Steps */}
                    <div className="space-y-24">
                        {/* Step 1: Select Waste Type */}
                        <StepCard
                            number={1}
                            icon={Package}
                            title="Select Your Waste Type"
                            description="Tell us what kind of waste you need picked up. We handle everything from household garbage to recyclables."
                            details={[
                                'Household Waste – Regular garbage and trash',
                                'Recyclables – Plastic, paper, glass, and metal',
                                'Garden Waste – Leaves, branches, and yard debris',
                                'Bulk Items – Furniture, appliances, and large items',
                                'Construction Debris – Renovation and building waste',
                            ]}
                        />

                        {/* Step 2: Share Your Location */}
                        <StepCard
                            number={2}
                            icon={MapPin}
                            title="Share Your Precise Location"
                            description="Use Google Plus Code for pinpoint accuracy, ensuring our collectors find you without any confusion."
                            details={[
                                'Get your Plus Code from Google Maps instantly',
                                'Works even in areas without street addresses',
                                'More accurate than traditional addresses',
                                'Collectors know exactly where to go',
                            ]}
                            image="/google_plus_code_sample.webp"
                            imageAlt="Google Plus Code example showing how to find your location code"
                            reverse
                        />

                        {/* Step 3: Live Tracking */}
                        <AnimatedSection>
                            <div className="flex flex-col gap-8">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-xl shadow-lg">
                                        3
                                    </div>
                                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                                        <Navigation className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <motion.div variants={fadeInUp}>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                                        Track Your Collector in Real-Time
                                    </h3>
                                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
                                        Watch as your assigned collector makes their way to you. Know exactly when they&apos;ll arrive with live GPS tracking.
                                    </p>
                                </motion.div>
                                <LiveTrackingDemo />
                                <motion.ul variants={staggerContainer} className="grid md:grid-cols-2 gap-4 mt-6">
                                    {[
                                        'See collector location in real-time',
                                        'Get accurate ETA updates',
                                        'Contact your collector directly',
                                        'Rate and review after pickup',
                                    ].map((feature, index) => (
                                        <motion.li
                                            key={index}
                                            variants={fadeInUp}
                                            className="flex items-center gap-3 bg-white dark:bg-gray-800/50 rounded-xl p-4 shadow-sm"
                                        >
                                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                        </motion.li>
                                    ))}
                                </motion.ul>
                            </div>
                        </AnimatedSection>

                        {/* Step 4: Payment */}
                        <AnimatedSection>
                            <div className="flex flex-col gap-8">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-xl shadow-lg">
                                        4
                                    </div>
                                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                                        <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <motion.div variants={fadeInUp}>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                                        Pay Securely with Wave
                                    </h3>
                                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
                                        No cash needed. Pay instantly through Wave mobile money – the most trusted payment method in The Gambia.
                                    </p>
                                </motion.div>
                                <PaymentSection />
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* Why Choose Us */}
            <AnimatedSection className="py-16 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                <div className="max-w-6xl mx-auto">
                    <motion.div variants={fadeInUp} className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Why Choose Mbalit?
                        </h2>
                    </motion.div>
                    <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Clock,
                                title: 'Fast Pickup',
                                description: 'Get your waste collected within hours, not days',
                            },
                            {
                                icon: Shield,
                                title: 'Verified Collectors',
                                description: 'All collectors are vetted and rated by the community',
                            },
                            {
                                icon: Sparkles,
                                title: 'Eco-Friendly',
                                description: 'We ensure proper disposal and recycling of your waste',
                            },
                        ].map((feature, index) => (
                            <motion.div key={index} variants={fadeInUp}>
                                <Card variant="elevated" padding="lg" className="h-full text-center">
                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                                        <feature.icon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {feature.description}
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </AnimatedSection>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                            Ready to Get Started?
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                            Schedule your first waste pickup in less than 2 minutes.
                        </p>
                        <Link href="/">
                            <Button
                                variant="primary"
                                size="lg"
                                rightIcon={<ArrowRight className="w-5 h-5" />}
                                className="px-10"
                            >
                                Request Pickup Now
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto text-center text-gray-500 dark:text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Mbalit. Making The Gambia cleaner, one pickup at a time.</p>
                </div>
            </footer>
        </div>
    );
}
