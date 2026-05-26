'use client';

import React, { useEffect, useState } from 'react';
import { Bell, UserPlus, Users, MoreVertical, Loader2, X, MessageCircle, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { getOrganizationByOwner, getOrganizationMembers, approveMember, removeMember } from '@/lib/firestore';

interface Member {
    id: string;
    name?: string;
    phone?: string;
    isApproved?: boolean;
    isAvailable?: boolean;
    [key: string]: unknown;
}

export default function TeamPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [orgCode, setOrgCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [invitePhone, setInvitePhone] = useState('');
    const [processingMember, setProcessingMember] = useState<string | null>(null);

    const handleApproveMember = async (memberId: string) => {
        if (!orgCode) return;
        setProcessingMember(memberId);
        try {
            await approveMember(orgCode, memberId);
            const groups = await getOrganizationMembers(orgCode);
            const approved = (groups.approved || []).map((m: Member) => ({ ...m, isApproved: true }));
            const pending = (groups.pending || []).map((m: Member) => ({ ...m, isApproved: false }));
            setMembers([...approved, ...pending]);
        } catch (err) {
            console.error('Failed to approve:', err);
        } finally {
            setProcessingMember(null);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!orgCode) return;
        setProcessingMember(memberId);
        try {
            await removeMember(orgCode, memberId);
            const groups = await getOrganizationMembers(orgCode);
            const approved = (groups.approved || []).map((m: Member) => ({ ...m, isApproved: true }));
            const pending = (groups.pending || []).map((m: Member) => ({ ...m, isApproved: false }));
            setMembers([...approved, ...pending]);
        } catch (err) {
            console.error('Failed to remove:', err);
        } finally {
            setProcessingMember(null);
        }
    };

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const org = (await getOrganizationByOwner(user.id)) as { id: string; orgCode?: string } | null;
                if (cancelled) return;
                if (!org?.orgCode) {
                    setMembers([]);
                    return;
                }
                setOrgCode(org.orgCode);
                const groups = await getOrganizationMembers(org.orgCode);
                if (cancelled) return;
                const approved = (groups.approved || []).map((m: Member) => ({ ...m, isApproved: true }));
                const pending = (groups.pending || []).map((m: Member) => ({ ...m, isApproved: false }));
                setMembers([...approved, ...pending]);
            } catch (err) {
                console.error('Team load failed:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Team</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isLoading ? '…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
                    </p>
                </div>
                <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-gray-700" />
                </button>
            </div>

            {orgCode && (
                <div className="px-5 mt-3">
                    <div className="p-3 rounded-2xl bg-[#F1FAF4] border border-[#D2F4E1] flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">Organization code</p>
                            <p className="font-mono font-bold text-[#0E7A3B]">{orgCode}</p>
                        </div>
                        <button
                            onClick={() => navigator.clipboard?.writeText(orgCode)}
                            className="text-sm font-semibold text-[#0E7A3B] px-3 py-1.5 rounded-full bg-white border border-[#D2F4E1]"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            )}

            <div className="px-5 mt-4">
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#A8E7C3] bg-[#F1FAF4] text-[#0E7A3B] font-bold hover:bg-[#E8F6EE] transition-colors"
                >
                    <UserPlus className="w-5 h-5" />
                    Invite Member
                </button>
            </div>

            <div className="px-5 mt-4 space-y-3 mb-6">
                {isLoading ? (
                    <div className="py-16 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0E7A3B]" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="py-16 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                            <Users className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-[#0F1A14]">No team members yet</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-[20rem]">
                            Share your organization code with collectors to invite them.
                        </p>
                    </div>
                ) : (
                    members.map((m) => (
                        <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1FA653] to-[#0E7A3B] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                                {m.profileImage ? (
                                    <img src={m.profileImage as string} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    (m.name || '?').charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-[#0F1A14] text-sm">{m.name || 'Collector'}</h3>
                                    <span className={`mb-badge ${m.isApproved ? 'mb-badge-required' : 'mb-badge-optional'}`}>
                                        {m.isApproved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{m.phone || ''}</p>
                            </div>
                            {!m.isApproved && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleRemoveMember(m.id)}
                                        disabled={processingMember === m.id}
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                        {processingMember === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleApproveMember(m.id)}
                                        disabled={processingMember === m.id}
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#E8F6EE] text-[#0E7A3B] hover:bg-[#D2F4E1] transition-colors disabled:opacity-50"
                                    >
                                        {processingMember === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}
                            {m.isApproved && (
                                <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50">
                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
            <AnimatePresence>
                {showInviteModal && orgCode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowInviteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setShowInviteModal(false)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                            
                            <div className="w-12 h-12 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                                <UserPlus className="w-6 h-6" />
                            </div>
                            
                            <h2 className="text-xl font-bold text-[#0F1A14] mb-2">Invite Driver</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Enter a phone number to send an invite link. When they sign up, they'll be automatically added to your team.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#0F1A14] mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={invitePhone}
                                        onChange={e => setInvitePhone(e.target.value)}
                                        placeholder="+220 XXXXXXXX"
                                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#0E7A3B] outline-none text-[#0F1A14] font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            const url = encodeURIComponent(`${window.location.origin}/auth?invite=${orgCode}`);
                                            const text = encodeURIComponent(`Join my Mbalit team! Use this link to sign up: `);
                                            window.open(`https://wa.me/${invitePhone.replace(/\+/g, '')}?text=${text}${url}`, '_blank');
                                            setShowInviteModal(false);
                                        }}
                                        disabled={!invitePhone}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold transition-colors disabled:opacity-50"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/auth?invite=${orgCode}`;
                                            const text = `Join my Mbalit team! Use this link to sign up: ${url}`;
                                            window.open(`sms:${invitePhone}?body=${encodeURIComponent(text)}`, '_blank');
                                            setShowInviteModal(false);
                                        }}
                                        disabled={!invitePhone}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors disabled:opacity-50"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                        SMS
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
