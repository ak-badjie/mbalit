'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Leaf,
    Recycle,
    Trash2,
    Smartphone,
    HardHat,
    AlertTriangle,
    Home,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    Sparkles,
    Globe,
    Heart,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RecyclingTip {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    items: string[];
    tips: string[];
    doNot: string[];
}

const RECYCLING_TIPS: RecyclingTip[] = [
    {
        id: 'household',
        title: 'Household Waste',
        icon: <Home className="w-6 h-6" />,
        color: 'from-gray-400 to-gray-600',
        items: ['General garbage', 'Non-recyclable packaging', 'Broken items', 'Dust and dirt'],
        tips: [
            'Use sealed bags to contain odors',
            'Separate any recyclables first',
            'Schedule regular pickups to prevent buildup',
        ],
        doNot: [
            'Mix with recyclables',
            'Include hazardous materials',
            'Leave bags open',
        ],
    },
    {
        id: 'organic',
        title: 'Organic Waste',
        icon: <Leaf className="w-6 h-6" />,
        color: 'from-green-400 to-emerald-600',
        items: ['Food scraps', 'Fruit & vegetable peels', 'Garden waste', 'Leaves and grass'],
        tips: [
            'Consider starting a compost pile',
            'Use for garden fertilizer',
            'Store in covered bins to reduce flies',
            'Separate meat/dairy for proper disposal',
        ],
        doNot: [
            'Include plastic bags',
            'Mix with non-organic waste',
            'Include treated wood or chemicals',
        ],
    },
    {
        id: 'recyclables',
        title: 'Recyclables',
        icon: <Recycle className="w-6 h-6" />,
        color: 'from-blue-400 to-cyan-600',
        items: ['Plastic bottles', 'Paper and cardboard', 'Glass containers', 'Metal cans'],
        tips: [
            'Rinse containers before recycling',
            'Remove caps and labels when possible',
            'Flatten cardboard to save space',
            'Check recycling symbols',
        ],
        doNot: [
            'Recycle greasy pizza boxes',
            'Include broken glass without warning',
            'Mix plastic types',
        ],
    },
    {
        id: 'electronic',
        title: 'Electronic Waste',
        icon: <Smartphone className="w-6 h-6" />,
        color: 'from-purple-400 to-violet-600',
        items: ['Old phones', 'Computers & laptops', 'TVs & monitors', 'Batteries', 'Appliances'],
        tips: [
            'Remove personal data before disposal',
            'Check for recycling programs',
            'Donate working electronics',
            'Never burn e-waste',
        ],
        doNot: [
            'Throw in regular trash',
            'Break open batteries',
            'Burn electronic components',
        ],
    },
    {
        id: 'construction',
        title: 'Construction Waste',
        icon: <HardHat className="w-6 h-6" />,
        color: 'from-orange-400 to-amber-600',
        items: ['Concrete debris', 'Wood scraps', 'Metal materials', 'Tiles and bricks'],
        tips: [
            'Separate materials by type',
            'Reuse wood for other projects',
            'Consider donating usable materials',
            'Schedule bulk pickup for large amounts',
        ],
        doNot: [
            'Mix with regular household waste',
            'Include asbestos materials',
            'Burn treated wood',
        ],
    },
    {
        id: 'hazardous',
        title: 'Hazardous Waste',
        icon: <AlertTriangle className="w-6 h-6" />,
        color: 'from-red-400 to-rose-600',
        items: ['Batteries', 'Paint & solvents', 'Chemicals', 'Medical waste', 'Pesticides'],
        tips: [
            'Store in original containers',
            'Keep away from children',
            'Never mix different chemicals',
            'Use designated disposal sites',
        ],
        doNot: [
            'Pour down drains',
            'Throw in regular trash',
            'Burn hazardous materials',
            'Mix with other waste types',
        ],
    },
];

const TipCard: React.FC<{ tip: RecyclingTip }> = ({ tip }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div layout>
            <Card
                variant="elevated"
                padding="none"
                className="overflow-hidden"
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full p-4 flex items-center gap-4 text-left"
                >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tip.color} flex items-center justify-center text-white shadow-lg`}>
                        {tip.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900 ">{tip.title}</h3>
                        <p className="text-sm text-gray-500 ">
                            {tip.items.slice(0, 2).join(', ')}...
                        </p>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 space-y-4">
                                {/* What goes in */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                        What goes in:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {tip.items.map((item) => (
                                            <span
                                                key={item}
                                                className="px-3 py-1 bg-gray-100  rounded-full text-xs text-gray-700 "
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Tips */}
                                <div>
                                    <p className="text-xs font-semibold text-emerald-600 uppercase mb-2 flex items-center gap-1">
                                        <Lightbulb className="w-3 h-3" />
                                        Best Practices:
                                    </p>
                                    <ul className="space-y-1">
                                        {tip.tips.map((t) => (
                                            <li key={t} className="text-sm text-gray-600  flex items-start gap-2">
                                                <span className="text-emerald-500 mt-1">✓</span>
                                                {t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Don'ts */}
                                <div>
                                    <p className="text-xs font-semibold text-red-500 uppercase mb-2">
                                        ⚠️ Avoid:
                                    </p>
                                    <ul className="space-y-1">
                                        {tip.doNot.map((d) => (
                                            <li key={d} className="text-sm text-gray-600  flex items-start gap-2">
                                                <span className="text-red-500 mt-1">✗</span>
                                                {d}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

export default function RecyclingTipsPage() {
    return (
        <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-emerald-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80  backdrop-blur-xl border-b border-gray-200 ">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/dashboard">
                        <button className="p-2 rounded-xl hover:bg-gray-100  transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600 " />
                        </button>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 ">Recycling Guide</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
                {/* Hero Section */}
                <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Globe className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white mb-1">
                                Help Protect Our Planet 🌍
                            </h2>
                            <p className="text-sm text-white/80">
                                Proper waste disposal starts with you. Learn how to recycle right!
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <Card variant="default" padding="sm" className="text-center">
                        <div className="text-2xl mb-1">♻️</div>
                        <p className="text-xs text-gray-500">Reduce waste by</p>
                        <p className="font-bold text-emerald-600">60%</p>
                    </Card>
                    <Card variant="default" padding="sm" className="text-center">
                        <div className="text-2xl mb-1">🌱</div>
                        <p className="text-xs text-gray-500">Save water by</p>
                        <p className="font-bold text-blue-600">40%</p>
                    </Card>
                    <Card variant="default" padding="sm" className="text-center">
                        <div className="text-2xl mb-1">💚</div>
                        <p className="text-xs text-gray-500">Cut emissions by</p>
                        <p className="font-bold text-green-600">35%</p>
                    </Card>
                </div>

                {/* Tips List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500  uppercase tracking-wider px-1">
                        Waste Categories
                    </h3>
                    {RECYCLING_TIPS.map((tip) => (
                        <TipCard key={tip.id} tip={tip} />
                    ))}
                </div>

                {/* AI Assistant Prompt */}
                <Card variant="elevated" padding="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 border-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">
                                Need More Help?
                            </h3>
                            <p className="text-sm text-white/80">
                                Chat with MBALit AI for personalized recycling advice!
                            </p>
                        </div>
                    </div>
                </Card>
            </main>
        </div>
    );
}
