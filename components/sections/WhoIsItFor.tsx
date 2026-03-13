'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Truck, Landmark, Factory, Users, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const WhoIsItFor = () => {
    const generatorCards = [
        {
            title: 'Individuals',
            subtitle: 'Households',
            description: 'Convenient on-demand waste pickup for your home. Schedule collection when you need it.',
            icon: User,
            action: 'Get Started',
            href: '/auth?signup=true&role=individual',
            bg: 'bg-gradient-to-br from-rose-50 to-pink-100',
            iconBg: 'bg-rose-100',
            iconColor: 'text-rose-500',
            textColor: 'text-rose-900',
            subtitleColor: 'text-rose-400',
            descColor: 'text-rose-700/70',
            btnBg: 'bg-rose-500 hover:bg-rose-600',
            shape: 'rounded-[32px]',           // pill-like rounded square
            rotate: 'md:rotate-[-2deg] hover:rotate-0',
        },
        {
            title: 'Corporate',
            subtitle: 'Institutions',
            description: 'Tailored waste management for offices, schools, and NGOs. Track your environmental impact.',
            icon: Building2,
            action: 'Partner With Us',
            href: '/auth?signup=true&role=business',
            bg: 'bg-gradient-to-br from-sky-50 to-blue-100',
            iconBg: 'bg-sky-100',
            iconColor: 'text-sky-500',
            textColor: 'text-sky-900',
            subtitleColor: 'text-sky-400',
            descColor: 'text-sky-700/70',
            btnBg: 'bg-sky-500 hover:bg-sky-600',
            shape: 'rounded-[40px]',              // pill shape (no clip)
            rotate: 'md:rotate-[1deg] hover:rotate-0',
        },
        {
            title: 'Companies',
            subtitle: 'Businesses',
            description: 'Reliable disposal solutions for shops, restaurants, and small businesses.',
            icon: Factory,
            action: 'Business Solutions',
            href: '/auth?signup=true&role=business',
            bg: 'bg-gradient-to-br from-violet-50 to-purple-100',
            iconBg: 'bg-violet-100',
            iconColor: 'text-violet-500',
            textColor: 'text-violet-900',
            subtitleColor: 'text-violet-400',
            descColor: 'text-violet-700/70',
            btnBg: 'bg-violet-500 hover:bg-violet-600',
            shape: 'rounded-[28px]',            // softer rounded square
            rotate: 'md:rotate-[2deg] hover:rotate-0',
        },
    ];

    const collectorCards = [
        {
            title: 'Municipalities',
            subtitle: 'City Councils',
            description: 'Digitize waste collection management. Monitor city-wide cleanliness and collector performance.',
            icon: Landmark,
            action: 'Learn More',
            href: '/municipalities',
            bg: 'bg-gradient-to-br from-amber-50 to-yellow-100',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-500',
            textColor: 'text-amber-900',
            subtitleColor: 'text-amber-400',
            descColor: 'text-amber-700/70',
            btnBg: 'bg-amber-500 hover:bg-amber-600',
            shape: 'rounded-[36px]',            // big pill
            rotate: 'md:rotate-[1.5deg] hover:rotate-0',
        },
        {
            title: 'Companies',
            subtitle: 'Fleet Operators',
            description: 'Optimize routes, manage your fleet, and get more customers for your waste business.',
            icon: Truck,
            action: 'Join Fleet',
            href: '/auth?signup=true&role=collector',
            bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-500',
            textColor: 'text-orange-900',
            subtitleColor: 'text-orange-400',
            descColor: 'text-orange-700/70',
            btnBg: 'bg-orange-500 hover:bg-orange-600',
            shape: 'rounded-[40px]',              // pill shape (no clip)
            rotate: 'md:rotate-[-1.5deg] hover:rotate-0',
        },
        {
            title: 'Individuals',
            subtitle: 'Freelance Collectors',
            description: 'Earn money collecting waste with your tricycle or truck. Be your own boss.',
            icon: Users,
            action: 'Start Earning',
            href: '/auth?signup=true&role=collector',
            bg: 'bg-gradient-to-br from-emerald-50 to-teal-100',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-500',
            textColor: 'text-emerald-900',
            subtitleColor: 'text-emerald-400',
            descColor: 'text-emerald-700/70',
            btnBg: 'bg-emerald-500 hover:bg-emerald-600',
            shape: 'rounded-[24px]',            // soft rectangle
            rotate: 'md:rotate-[2.5deg] hover:rotate-0',
        },
    ];

    const CardGrid = ({ cards, label, accentColor }: { cards: typeof generatorCards; label: string; accentColor: string }) => (
        <div className="mb-20">
            <div className="flex items-center gap-3 mb-10">
                <div className={`w-1.5 h-10 rounded-full ${accentColor}`} />
                <h3 className="text-2xl font-bold text-gray-800">{label}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {cards.map((card, index) => (
                    <motion.div
                        key={card.title + card.subtitle}
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ delay: index * 0.12, duration: 0.6, type: "spring", bounce: 0.3 }}
                        className="group"
                    >
                        <motion.div
                            whileHover={{ y: -8, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`relative overflow-hidden ${card.shape} ${card.bg} ${card.rotate} p-8 md:p-10 border border-white/60 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all duration-500 flex flex-col min-h-[340px]`}
                        >
                            {/* Decorative floating circle */}
                            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/15 blur-xl" />

                            {/* Icon */}
                            <div className={`w-14 h-14 ${card.iconBg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                                <card.icon size={28} strokeWidth={2} className={card.iconColor} />
                            </div>

                            {/* Text */}
                            <h4 className={`text-xl font-bold mb-0.5 ${card.textColor}`}>{card.title}</h4>
                            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-3 ${card.subtitleColor}`}>{card.subtitle}</p>
                            <p className={`text-sm leading-relaxed mb-6 flex-1 ${card.descColor}`}>
                                {card.description}
                            </p>

                            {/* CTA */}
                            <Link href={card.href} className="block">
                                <motion.div
                                    whileTap={{ scale: 0.95 }}
                                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold ${card.btnBg} shadow-md transition-all duration-300`}
                                >
                                    {card.action}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </motion.div>
                            </Link>
                        </motion.div>
                    </motion.div>
                ))}
            </div>
        </div>
    );

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-rose-100/40 blur-3xl" />
                <div className="absolute top-60 right-[5%] w-96 h-96 rounded-full bg-sky-100/40 blur-3xl" />
                <div className="absolute bottom-20 left-[30%] w-80 h-80 rounded-full bg-violet-100/30 blur-3xl" />
                <div className="absolute bottom-40 right-[25%] w-64 h-64 rounded-full bg-amber-100/30 blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold mb-6"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        FOR EVERYONE
                    </motion.div>
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                        Who Is <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Mbalit</span> For?
                    </h2>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Connecting the entire waste management ecosystem — from households to city councils.
                    </p>
                </motion.div>

                <CardGrid cards={generatorCards} label="For Waste Generators" accentColor="bg-gradient-to-b from-rose-400 to-violet-500" />
                <CardGrid cards={collectorCards} label="For Waste Collectors" accentColor="bg-gradient-to-b from-amber-400 to-orange-500" />
            </div>
        </section>
    );
};

export default WhoIsItFor;
