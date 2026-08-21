'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
    Building2,
    Users,
    Wallet,
    Star,
    CheckCircle,
    XCircle,
    Copy,
    Settings,
    TrendingUp,
    ArrowDownToLine,
    Loader2,
    UserPlus,
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/waste-config';
import {
    getOrganizationByOwner,
    getOrganizationMembers,
    approveMember,
    removeMember,
    withdrawFromOrgWallet,
    getWalletTransactions,
} from '@/lib/firestore';
import { getCollectorSubscriptions } from '@/lib/subscriptions';

export default function OrganizationDashboard() {
    const { user } = useAuth();
    const router = useRouter();

    // Org state
    const [org, setOrg] = useState<any>(null);
    const [approvedMembers, setApprovedMembers] = useState<any[]>([]);
    const [pendingMembers, setPendingMembers] = useState<any[]>([]);
    const [orgTransactions, setOrgTransactions] = useState<any[]>([]);
    const [orgSubscriptions, setOrgSubscriptions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState(false);
    const [processingMember, setProcessingMember] = useState<string | null>(null);

    // Withdraw state
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPhone, setWithdrawPhone] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const handleWithdraw = async () => {
        if (!org?.id) {
            alert('Organization not loaded');
            return;
        }
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!withdrawPhone || withdrawPhone.length < 7) {
            alert('Please enter a valid phone number');
            return;
        }
        setIsWithdrawing(true);
        try {
            const result = await withdrawFromOrgWallet(org.id, amount, 'wave', withdrawPhone);
            if (result.success) {
                setOrg((prev: any) => prev ? { ...prev, walletBalance: (prev.walletBalance || 0) - amount } : prev);
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                setWithdrawPhone('');
                alert('Withdrawal request submitted! You will receive your funds shortly.');
            } else {
                alert(result.error || 'Withdrawal failed');
            }
        } catch (err) {
            console.error('Withdraw failed:', err);
            alert('Failed to process withdrawal');
        } finally {
            setIsWithdrawing(false);
        }
    };

    // Load org data
    useEffect(() => {
        if (!user?.id) return;
        loadOrganization();
    }, [user?.id]);

    const loadOrganization = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const orgData = await getOrganizationByOwner(user.id);
            if (orgData) {
                setOrg(orgData);
                const members = await getOrganizationMembers(orgData.id);
                setApprovedMembers(members.approved);
                setPendingMembers(members.pending);

                // Fetch transactions & subscriptions
                const txs = await getWalletTransactions(orgData.id);
                setOrgTransactions(txs);
                
                const subs = await getCollectorSubscriptions(undefined, orgData.id);
                setOrgSubscriptions(subs);
            }
        } catch (err) {
            console.error('Failed to load org:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (org?.orgCode || org?.id) {
            navigator.clipboard.writeText(org.orgCode || org.id);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const handleApproveMember = async (memberId: string) => {
        if (!org?.id) return;
        setProcessingMember(memberId);
        try {
            await approveMember(org.id, memberId);
            await loadOrganization();
        } catch (err) {
            console.error('Failed to approve member:', err);
        } finally {
            setProcessingMember(null);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!org?.id) return;
        setProcessingMember(memberId);
        try {
            await removeMember(org.id, memberId);
            await loadOrganization();
        } catch (err) {
            console.error('Failed to remove member:', err);
        } finally {
            setProcessingMember(null);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-amber-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                {user?.profileImage ? (
                                    <img src={user.profileImage} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">{org?.name || 'Organization'}</h1>
                                <p className="text-xs text-gray-500">Admin</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/organization/settings">
                                <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                                    <Settings className="w-5 h-5 text-gray-600" />
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
                {/* Org Code */}
                <Card variant="elevated" padding="lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Organization Code</p>
                            <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                                {org?.orgCode || org?.id}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Your organization&apos;s reference code</p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyCode}
                            leftIcon={copiedCode ? <CheckCircle size={16} /> : <Copy size={16} />}
                        >
                            {copiedCode ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                </Card>

                {/* Org Wallet */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-amber-500/20"
                    style={{
                        backgroundColor: '#F59E0B',
                        backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #EA580C 100%)'
                    }}
                >
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-white" />
                                <span className="text-amber-100 text-sm font-medium">Organization Wallet</span>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowWithdrawModal(true)}
                                leftIcon={<ArrowDownToLine size={16} />}
                                className="bg-white/20 hover:bg-white/30 border-0 text-white text-xs"
                            >
                                Withdraw
                            </Button>
                        </div>
                        <p className="text-white/70 text-sm">Available Balance</p>
                        <p className="text-4xl font-bold text-white mb-4">
                            {formatPrice(org?.walletBalance || 0)}
                        </p>
                        <div className="flex gap-4">
                            <div>
                                <p className="text-white/60 text-xs">Escrow Balance</p>
                                <p className="text-lg font-bold text-white">{formatPrice(org?.escrowBalance || 0)}</p>
                            </div>
                            <div>
                                <p className="text-white/60 text-xs">Total Pickups</p>
                                <p className="text-lg font-bold text-white">{org?.totalPickups || 0}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <Card variant="default" padding="sm" className="p-3">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-2 rounded-xl bg-blue-100 mb-2">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-xs text-gray-500">Drivers</p>
                            <p className="text-xl font-bold text-gray-900">{approvedMembers.length}</p>
                        </div>
                    </Card>
                    <Card variant="default" padding="sm" className="p-3">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-2 rounded-xl bg-amber-100 mb-2">
                                <Star className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-xs text-gray-500">Rating</p>
                            <p className="text-xl font-bold text-gray-900">{(org?.rating || 0).toFixed(1)} ⭐</p>
                        </div>
                    </Card>
                    <Card variant="default" padding="sm" className="p-3">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-2 rounded-xl bg-emerald-100 mb-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-xs text-gray-500">Active</p>
                            <p className="text-xl font-bold text-gray-900">
                                {approvedMembers.filter((m: any) => m.isAvailable).length}
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Community Reports (authority orgs only) */}
                {org?.isAuthority && (
                    <button
                        type="button"
                        onClick={() => router.push('/organization/reports')}
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-left text-white shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
                    >
                        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold">Community Reports</p>
                            <p className="text-xs text-white/80">Environmental hazards reported by residents</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/80 flex-shrink-0" />
                    </button>
                )}

                {/* Pending Approvals */}
                {pendingMembers.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <UserPlus className="w-5 h-5 text-amber-500" />
                            <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
                            <Badge variant="default" className="bg-amber-100 text-amber-700">{pendingMembers.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {pendingMembers.map((member: any) => (
                                <Card key={member.id} variant="default" padding="md" className="border border-amber-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                                            {member.profileImage ? (
                                                <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                (member.name?.charAt(0) || '?').toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{member.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{member.phone}</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button variant="secondary" size="sm" onClick={() => handleRemoveMember(member.id)} disabled={processingMember === member.id} className="text-red-600 border-red-200">
                                                <XCircle size={16} />
                                            </Button>
                                            <Button variant="primary" size="sm" onClick={() => handleApproveMember(member.id)} disabled={processingMember === member.id}>
                                                {processingMember === member.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Approved Drivers */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-semibold text-gray-900">Drivers</h3>
                    </div>
                    {approvedMembers.length === 0 ? (
                        <Card variant="default" padding="lg" className="text-center">
                            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No drivers yet</p>
                            <p className="text-xs text-gray-400 mt-1">Add them from the Team screen — you create their account and PIN</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {approvedMembers.map((member: any) => (
                                <Card key={member.id} variant="default" padding="md" className="border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                                {member.profileImage ? (
                                                    <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    (member.name?.charAt(0) || '?').toUpperCase()
                                                )}
                                            </div>
                                            {member.isAvailable && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{member.name || 'Driver'}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-amber-400" />{(member.rating || 0).toFixed(1)}
                                                </span>
                                                <span className="text-xs text-gray-500">{member.totalPickups || 0} pickups</span>
                                                <Badge variant={member.isAvailable ? 'success' : 'default'} className="text-xs">
                                                    {member.isAvailable ? 'Online' : 'Offline'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-gray-900">{formatPrice(member.earnings || 0)}</p>
                                            <p className="text-xs text-gray-400">earned</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="mt-6 mb-8 grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push('/organization/wallet')}
                        className="w-full p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center gap-2 text-center"
                    >
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Wallet & Txns</p>
                            <p className="text-xs text-gray-500">View all history</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push('/organization/subscriptions')}
                        className="w-full p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center gap-2 text-center"
                    >
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                            <Star className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Subscriptions</p>
                            <p className="text-xs text-gray-500">Manage packages</p>
                        </div>
                    </button>
                </div>
            </main>

            {/* Withdraw Modal */}
            <AnimatePresence>
                {showWithdrawModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowWithdrawModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Withdraw Funds
                            </h2>

                            <div className="mb-4 p-4 bg-amber-50 rounded-xl">
                                <p className="text-xs text-gray-600">Available Balance</p>
                                <p className="text-2xl font-bold text-amber-700">
                                    {formatPrice(org?.walletBalance || 0)}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Amount (GMD)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        placeholder="Enter amount (min 50 GMD)"
                                        min="50"
                                        max={org?.walletBalance || 0}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Wave Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={withdrawPhone}
                                        onChange={e => setWithdrawPhone(e.target.value)}
                                        placeholder="+220 XXXXXXXX"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleWithdraw}
                                    disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) > (org?.walletBalance || 0)}
                                    className="flex-1"
                                >
                                    {isWithdrawing ? 'Processing...' : 'Withdraw'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
