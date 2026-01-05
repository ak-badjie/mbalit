'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Star,
    Users,
    Truck,
    Check,
    Plus,
    X,
    Search,
    ArrowLeft,
    Loader2,
    MapPin,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    getAllAgencies,
    getUserPreferredAgencies,
    addAgencyToPreferred,
    removeAgencyFromPreferred,
    AgencyListing
} from '@/lib/user-agencies';

export default function AgenciesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [agencies, setAgencies] = useState<AgencyListing[]>([]);
    const [preferredAgencyIds, setPreferredAgencyIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [allAgencies, userPreferred] = await Promise.all([
                getAllAgencies(),
                getUserPreferredAgencies(user!.id)
            ]);
            setAgencies(allAgencies);
            setPreferredAgencyIds(userPreferred);
        } catch (error) {
            console.error('Failed to load agencies:', error);
        }
        setIsLoading(false);
    };

    const handleToggleAgency = async (agencyId: string) => {
        if (!user) return;
        setActionLoading(agencyId);

        try {
            if (preferredAgencyIds.includes(agencyId)) {
                await removeAgencyFromPreferred(user.id, agencyId);
                setPreferredAgencyIds(prev => prev.filter(id => id !== agencyId));
            } else {
                await addAgencyToPreferred(user.id, agencyId);
                setPreferredAgencyIds(prev => [...prev, agencyId]);
            }
        } catch (error) {
            console.error('Failed to update agency preference:', error);
        }

        setActionLoading(null);
    };

    const filteredAgencies = agencies.filter(agency =>
        agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const myAgencies = filteredAgencies.filter(a => preferredAgencyIds.includes(a.id));
    const otherAgencies = filteredAgencies.filter(a => !preferredAgencyIds.includes(a.id));

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50  flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-500 ">Loading agencies...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 ">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white  border-b border-gray-200  px-4 py-4">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full hover:bg-gray-100  transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 " />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 ">Agencies</h1>
                            <p className="text-sm text-gray-500 ">
                                Add agencies to your preferred list
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search agencies..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200  bg-gray-50  text-gray-900  placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* My Agencies Section */}
                {myAgencies.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h2 className="text-sm font-semibold text-gray-500  uppercase tracking-wider mb-3">
                            My Agencies ({myAgencies.length})
                        </h2>
                        <div className="grid gap-3">
                            {myAgencies.map((agency, index) => (
                                <AgencyCard
                                    key={agency.id}
                                    agency={agency}
                                    isPreferred={true}
                                    isLoading={actionLoading === agency.id}
                                    onToggle={() => handleToggleAgency(agency.id)}
                                    onViewDetails={() => router.push(`/dashboard/agencies/${agency.id}`)}
                                    delay={index * 0.05}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* All Agencies Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2 className="text-sm font-semibold text-gray-500  uppercase tracking-wider mb-3">
                        {myAgencies.length > 0 ? 'Other Agencies' : 'All Agencies'} ({otherAgencies.length})
                    </h2>

                    {otherAgencies.length === 0 && agencies.length === 0 ? (
                        <Card variant="elevated" padding="lg" className="text-center">
                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="font-semibold text-gray-900  mb-2">
                                No agencies yet
                            </h3>
                            <p className="text-gray-500  text-sm">
                                Agencies will appear here once they register
                            </p>
                        </Card>
                    ) : (
                        <div className="grid gap-3">
                            {otherAgencies.map((agency, index) => (
                                <AgencyCard
                                    key={agency.id}
                                    agency={agency}
                                    isPreferred={false}
                                    isLoading={actionLoading === agency.id}
                                    onToggle={() => handleToggleAgency(agency.id)}
                                    onViewDetails={() => router.push(`/dashboard/agencies/${agency.id}`)}
                                    delay={index * 0.05}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

// Agency Card Component
interface AgencyCardProps {
    agency: AgencyListing;
    isPreferred: boolean;
    isLoading: boolean;
    onToggle: () => void;
    onViewDetails: () => void;
    delay?: number;
}

function AgencyCard({ agency, isPreferred, isLoading, onToggle, onViewDetails, delay = 0 }: AgencyCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <Card
                variant="elevated"
                padding="md"
                className={`relative overflow-hidden ${isPreferred ? 'ring-2 ring-emerald-500' : ''}`}
            >
                {isPreferred && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                        Added
                    </div>
                )}

                <div className="flex items-start gap-4">
                    {/* Agency Icon */}
                    <div className={`p-3 rounded-xl ${isPreferred ? 'bg-emerald-100 ' : 'bg-gray-100 '}`}>
                        <Building2 className={`w-6 h-6 ${isPreferred ? 'text-emerald-600' : 'text-gray-600 '}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900  text-lg truncate">
                            {agency.name}
                        </h3>

                        {agency.description && (
                            <p className="text-sm text-gray-500  line-clamp-2 mt-1">
                                {agency.description}
                            </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1 text-sm text-gray-500 ">
                                <Star className="w-4 h-4 text-amber-400" />
                                <span>{agency.rating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500 ">
                                <Users className="w-4 h-4" />
                                <span>{agency.driversCount} drivers</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500 ">
                                <Truck className="w-4 h-4" />
                                <span>{agency.totalPickups} pickups</span>
                            </div>
                        </div>

                        {/* Service Areas */}
                        {agency.serviceAreas && agency.serviceAreas.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">
                                    {agency.serviceAreas.slice(0, 2).join(', ')}
                                    {agency.serviceAreas.length > 2 && ` +${agency.serviceAreas.length - 2}`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onViewDetails}
                        >
                            View
                        </Button>
                        <Button
                            variant={isPreferred ? 'ghost' : 'primary'}
                            size="sm"
                            onClick={onToggle}
                            disabled={isLoading}
                            className={isPreferred ? 'text-red-500 hover:bg-red-50' : ''}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isPreferred ? (
                                <X className="w-4 h-4" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
