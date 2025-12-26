'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Search, Loader2, Truck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface TrackOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ isOpen, onClose }) => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const handleSearch = async () => {
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setIsSearching(true);
        setError(null);
        setNotFound(false);

        try {
            // Query Firebase for jobs with this email
            const jobsRef = ref(realtimeDb, 'jobs');
            const jobsQuery = query(jobsRef, orderByChild('customerEmail'), equalTo(email.trim().toLowerCase()));
            const snapshot = await get(jobsQuery);

            if (snapshot.exists()) {
                const jobs = snapshot.val();
                // Find the most recent non-completed/cancelled job
                const jobIds = Object.keys(jobs);
                const activeJob = jobIds.find(id => {
                    const job = jobs[id];
                    return job.status !== 'completed' && job.status !== 'cancelled';
                });

                if (activeJob) {
                    // Save email and redirect to tracking
                    localStorage.setItem('mbalit_email', email);
                    onClose();
                    router.push(`/track/${activeJob}`);
                } else {
                    // All jobs are completed/cancelled
                    setNotFound(true);
                }
            } else {
                setNotFound(true);
            }
        } catch (err) {
            console.error('Error searching for order:', err);
            setError('Failed to search. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                <Truck className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Track Your Order</h2>
                                <p className="text-sm text-white/80">Enter the email you used to place your order</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError(null);
                                            setNotFound(false);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="your@email.com"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-red-500 text-sm"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </motion.div>
                            )}

                            {notFound && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
                                >
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        No active orders found for this email. If you just placed an order, please wait a moment and try again.
                                    </p>
                                </motion.div>
                            )}

                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleSearch}
                                disabled={isSearching || !email.trim()}
                                isLoading={isSearching}
                                leftIcon={<Search className="w-5 h-5" />}
                                className="w-full"
                            >
                                Find My Order
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TrackOrderModal;
