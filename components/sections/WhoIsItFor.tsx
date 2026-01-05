'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const WhoIsItFor = () => {
    const cards = [
        {
            title: 'Individuals',
            description: 'Request on-demand waste pickup for your home. Schedule conveniently and track your collector.',
            icon: User,
            action: 'Get Started',
            href: '/auth?signup=true&role=individual',
            color: 'bg-emerald-50 text-emerald-600',
        },
        {
            title: 'Businesses',
            description: 'Reliable waste management solutions for your office, restaurant, or shop. Keep your premises clean.',
            icon: Building2,
            action: 'Partner With Us',
            href: '/auth?signup=true&role=business',
            color: 'bg-blue-50 text-blue-600',
        },
        {
            title: 'Collectors',
            description: 'Join our network of verified collectors. Get jobs, optimize routes, and grow your business.',
            icon: Truck,
            action: 'Join Fleet',
            href: '/auth?signup=true&role=collector',
            color: 'bg-orange-50 text-orange-600',
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
                        We connect the entire waste management ecosystem in The Gambia using technology.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {cards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.5 }}
                            className="bg-gray-50 rounded-3xl p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-100"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${card.color}`}>
                                <card.icon size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                {card.description}
                            </p>
                            <Link href={card.href} className="block w-full">
                                <Button variant="outline" className="w-full rounded-xl py-6 font-semibold hover:bg-white hover:border-gray-300 transition-all">
                                    {card.action}
                                </Button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhoIsItFor;
