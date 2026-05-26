'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getCollectorSubscriptions } from '@/lib/subscriptions';
import { createJob } from '@/lib/realtime';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Subscription } from '@/types';
import { Calendar, Package, MapPin, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/waste-config';
import { toast } from 'sonner';

export default function SubscriptionsPage() {
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [customerDetails, setCustomerDetails] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [creatingJobFor, setCreatingJobFor] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;
        
        const loadSubscriptions = async () => {
            try {
                const subs = await getCollectorSubscriptions(user.id);
                setSubscriptions(subs);
                
                // Fetch customer details for each sub
                const details: Record<string, any> = {};
                for (const sub of subs) {
                    if (!details[sub.customerId]) {
                        const custDoc = await getDoc(doc(db, 'users', sub.customerId));
                        if (custDoc.exists()) {
                            details[sub.customerId] = custDoc.data();
                        }
                    }
                }
                setCustomerDetails(details);
            } catch (err) {
                console.error('Failed to load subscriptions:', err);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadSubscriptions();
    }, [user?.id]);

    const handleCreateJob = async (sub: Subscription) => {
        if (!user?.id) return;
        setCreatingJobFor(sub.id);
        try {
            const customer = customerDetails[sub.customerId];
            if (!customer) {
                alert('Customer data not found.');
                return;
            }
            
            // Create a realtime job
            const jobId = await createJob(
                sub.customerId,
                customer.name || 'Customer',
                customer.email || '',
                customer.phone || '',
                {
                    lat: customer.preciseLocation?.latitude || 0,
                    lng: customer.preciseLocation?.longitude || 0,
                    formattedAddress: customer.formattedAddress || 'Unknown Location'
                },
                'General Waste',
                ['general'], // wasteTypes array
                'Standard', // legacy wasteSize
                sub.pricePerPickup,
                sub.bucketCount,
                sub.largeBinCount,
                sub.collectorId // directly assigned
            );
            
            alert('Job created! Check your Active Pickups.');
        } catch (err) {
            console.error('Failed to create job:', err);
            alert('Failed to start pickup.');
        } finally {
            setCreatingJobFor(null);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-full bg-white pt-12 px-5 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#0E7A3B]" />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2">
                <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Subscriptions</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your regular pickups</p>
            </div>

            <div className="px-5 mt-4 pb-24 space-y-4">
                {subscriptions.length === 0 ? (
                    <div className="py-16 flex flex-col items-center text-center border border-gray-100 rounded-2xl bg-gray-50">
                        <div className="w-16 h-16 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                            <Calendar className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-[#0F1A14]">No active subscriptions</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            When customers subscribe to your services, they will appear here.
                        </p>
                    </div>
                ) : (
                    subscriptions.map((sub) => {
                        const customer = customerDetails[sub.customerId];
                        return (
                            <div key={sub.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-[#0F1A14]">{customer?.name || 'Loading...'}</h3>
                                        <p className="text-sm text-gray-500">{sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan</p>
                                    </div>
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                        {sub.preferredDay || 'Any day'}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            {sub.bucketCount} Bucket{sub.bucketCount !== 1 && 's'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600 truncate">
                                            {customer?.formattedAddress || 'Location pending'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600 font-medium">
                                            {formatPrice(sub.pricePerPickup)}/pickup
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            Next: {sub.nextPickupDate ? new Date(sub.nextPickupDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => handleCreateJob(sub)}
                                    disabled={creatingJobFor === sub.id}
                                    className="w-full py-3 bg-[#0F1A14] text-white rounded-xl font-semibold text-sm hover:bg-black transition-colors flex items-center justify-center gap-2"
                                >
                                    {creatingJobFor === sub.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Start Pickup Now
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
