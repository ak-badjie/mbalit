'use client';

import React, { useEffect, useState } from 'react';
import { Bell, UserPlus, Users, MoreVertical, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getOrganizationByOwner, getOrganizationMembers } from '@/lib/firestore';

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
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#A8E7C3] bg-[#F1FAF4] text-[#0E7A3B] font-bold">
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
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1FA653] to-[#0E7A3B] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                {(m.name || '?').charAt(0).toUpperCase()}
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
                            <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
