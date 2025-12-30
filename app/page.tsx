'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  Truck,
  Users,
  Building2,
  Recycle,
  CheckCircle,
  MapPin,
  Package,
  CreditCard,
  Navigation,
  Phone,
  MessageCircle,
  Smartphone,
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

// Features list
const FEATURES = [
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Fast Pickup',
    description: 'Get your waste collected within hours, not days',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Verified Collectors',
    description: 'All collectors are verified and rated by users',
  },
  {
    icon: <Recycle className="w-6 h-6" />,
    title: 'Eco-Friendly',
    description: 'Proper waste disposal and recycling practices',
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: 'Real-time Tracking',
    description: 'Track your collector in real-time on the map',
  },
];

// Account types for display
const ACCOUNT_TYPES = [
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Individuals',
    description: 'Home waste collection',
  },
  {
    icon: <Building2 className="w-8 h-8" />,
    title: 'Businesses',
    description: 'Small to medium businesses',
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: 'Corporate',
    description: 'Large organizations & NGOs',
  },
];

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

// Payment brands configuration
const PAYMENT_BRANDS = [
  {
    id: 'wave',
    name: 'Wave',
    logo: '/wave.png',
    color: '#0EA5E9', // Sky blue
    description: 'Fast, secure mobile payments',
  },
  {
    id: 'aps',
    name: 'APS Wallet',
    logo: '/asplogo.svg',
    color: '#3B82F6', // Blue
    description: 'Your trusted digital wallet',
  },
  {
    id: 'qmoney',
    name: 'QMoney',
    logo: '/qmoneylogo.png',
    color: '#F97316', // Orange
    description: 'Quick and easy payments',
  },
  {
    id: 'afrimoney',
    name: 'Afrimoney',
    logo: '/afrimoneylogo.png',
    color: '#a11776', // Magenta/Pink
    description: 'Africa\'s payment solution',
  },
  {
    id: 'yonnawallet',
    name: 'YonnaWallet',
    logo: '/yonnawalletlogo.png',
    color: '#8B5CF6', // Purple
    description: 'The Gambian way to pay',
  },
];

// Payment Section Component with Brand Carousel
const PaymentSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-rotate brands
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PAYMENT_BRANDS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeBrand = PAYMENT_BRANDS[activeIndex];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className="rounded-3xl overflow-hidden shadow-2xl transition-colors duration-700"
      style={{ backgroundColor: activeBrand.color }}
    >
      <div className="p-8 lg:p-12">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Brand Logo & Info */}
          <motion.div
            variants={fadeInLeft}
            transition={{ duration: 0.6 }}
            className="flex-1 text-white"
          >
            <div className="flex items-center gap-5 mb-6">
              <motion.div
                key={activeBrand.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl p-4 shadow-lg"
              >
                <Image
                  src={activeBrand.logo}
                  alt={activeBrand.name}
                  width={160}
                  height={96}
                  className="w-40 h-24 object-contain"
                />
              </motion.div>
              <motion.div
                key={`text-${activeBrand.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <h3 className="text-2xl font-bold">Pay with {activeBrand.name}</h3>
                <p className="text-white/80">{activeBrand.description}</p>
              </motion.div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold">No Cash Needed</h4>
                  <p className="text-sm text-white/70">Pay directly from your mobile wallet</p>
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

            {/* Brand Selector Dots */}
            <div className="flex items-center gap-3 mt-8">
              {PAYMENT_BRANDS.map((brand, index) => (
                <button
                  key={brand.id}
                  onClick={() => setActiveIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${index === activeIndex
                    ? 'bg-white scale-125'
                    : 'bg-white/40 hover:bg-white/60'
                    }`}
                  aria-label={`View ${brand.name}`}
                />
              ))}
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
                    <motion.div
                      key={`phone-icon-${activeBrand.id}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: activeBrand.color }}
                    >
                      <CreditCard className="w-8 h-8 text-white" />
                    </motion.div>
                    <h4 className="font-bold text-gray-900 mb-1">Payment Request</h4>
                    <p className="text-3xl font-bold text-gray-900 mb-1">D 50.00</p>
                    <p className="text-sm text-gray-500 mb-6">Mbalit Waste Collection</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="w-full text-white py-3 rounded-xl font-semibold transition-colors duration-300"
                      style={{ backgroundColor: activeBrand.color }}
                    >
                      Pay with {activeBrand.name}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <motion.div
                className="absolute -inset-4 rounded-[4rem] blur-xl -z-10 opacity-40 transition-colors duration-700"
                style={{ backgroundColor: activeBrand.color }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Hero Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-6"
            >
              <Recycle className="w-4 h-4" />
              <span>Making The Gambia cleaner, one pickup at a time</span>
            </motion.div>

            {/* Hero Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Waste Collection
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                Made Easy
              </span>
            </motion.h1>

            {/* Hero Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10"
            >
              Connect with verified waste collectors in your area. Schedule pickups,
              track in real-time, and contribute to a cleaner environment.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/auth?signup=true">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight size={20} />}
                  className="px-8 py-4 text-lg"
                >
                  Get Started
                </Button>
              </Link>
              <Link href="/auth?signup=true&role=collector">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Truck size={20} />}
                  className="px-8 py-4 text-lg"
                >
                  Become a Collector
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Account Types Section */}
      <section className="py-16 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              For Everyone
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Whether you're an individual, business, or organization
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {ACCOUNT_TYPES.map((type, index) => (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  variant="elevated"
                  padding="lg"
                  className="text-center hover:shadow-xl transition-shadow"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
                    {type.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {type.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {type.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Mbalit?
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              The smarter way to handle waste collection
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Detailed Steps */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-emerald-50 mb-8 max-w-xl mx-auto">
              Join thousands of users who are making their communities cleaner
              with Mbalit.
            </p>
            <Link href="/auth?signup=true">
              <Button
                variant="secondary"
                size="lg"
                rightIcon={<ArrowRight size={20} />}
                className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4 text-lg"
              >
                Create Your Account
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Mbalit. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/auth" className="hover:text-emerald-500 transition-colors">
                Login
              </Link>
              <Link href="/auth?signup=true" className="hover:text-emerald-500 transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
