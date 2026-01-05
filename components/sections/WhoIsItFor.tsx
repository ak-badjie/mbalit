'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Truck, Landmark, Factory, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
            color: 'bg-emerald-50 text-emerald-600',
        },
        {
            title: 'Identify Corporate',
            subtitle: 'Institutions',
            description: 'Tailored waste management for offices, schools, and NGOs. Track your environmental impact.',
            icon: Building2,
            action: 'Partner With Us',
            href: '/auth?signup=true&role=business',
            color: 'bg-blue-50 text-blue-600',
        },
        {
            title: 'Companies',
            subtitle: 'Businesses',
            description: 'Reliable disposal solutions for shops, restaurants, and small businesses.',
            icon: Factory, // Changed icon for variety
            action: 'Business Solutions',
            href: '/auth?signup=true&role=business',
            color: 'bg-indigo-50 text-indigo-600',
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
            color: 'bg-amber-50 text-amber-600',
        },
        {
            title: 'Companies',
            subtitle: 'Fleet Operators',
            description: 'Optimize routes, manage your fleet, and get more customers for your waste business.',
            icon: Truck,
            action: 'Join Fleet',
            href: '/auth?signup=true&role=collector',
            color: 'bg-orange-50 text-orange-600',
        },
        {
            title: 'Individuals',
            subtitle: 'Freelance Collectors',
            description: 'Earn money collecting waste with your tricycle or truck. Be your own boss.',
            icon: Users,
            action: 'Start Earning',
            href: '/auth?signup=true&role=collector',
            color: 'bg-green-50 text-green-600', // Different shade
        },
    ];

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Who Is Mbalit For?</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Connecting the entire waste management ecosystem.
                    </p>
                </motion.div>

                {/* Waste Generators Section */}
                <div className="mb-16">
                    <h3 className="text-2xl font-bold text-gray-800 mb-8 border-l-4 border-emerald-500 pl-4">For Waste Generators</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {generatorCards.map((card, index) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group relative"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${card.color} group-hover:scale-110 transition-transform`}>
                                    <card.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{card.title}</h3>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">{card.subtitle}</p>
                                <p className="text-gray-600 mb-8 leading-relaxed text-sm">
                                    {card.description}
                                </p>
                                <Link href={card.href} className="block w-full mt-auto">
                                    <Button variant="outline" className="w-full rounded-xl py-5 font-semibold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all">
                                        {card.action}
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Waste Collectors Section */}
                <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-8 border-l-4 border-orange-500 pl-4">For Waste Collectors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {collectorCards.map((card, index) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${card.color} group-hover:scale-110 transition-transform`}>
                                    <card.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{card.title}</h3>
                                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-3">{card.subtitle}</p>
                                <p className="text-gray-600 mb-8 leading-relaxed text-sm">
                                    {card.description}
                                </p>
                                <Link href={card.href} className="block w-full mt-auto">
                                    <Button variant="outline" className="w-full rounded-xl py-5 font-semibold hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all">
                                        {card.action}
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default WhoIsItFor;
