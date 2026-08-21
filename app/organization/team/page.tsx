'use client';

import React, { useEffect, useState } from 'react';
import {
    Bell,
    UserPlus,
    Users,
    MoreVertical,
    Loader2,
    X,
    CheckCircle,
    XCircle,
    Copy,
    Check,
    KeyRound,
    RefreshCw,
    Phone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getOrganizationByOwner, getOrganizationMembers, approveMember, removeMember } from '@/lib/firestore';
import { createDriverAccount, generateTempPin } from '@/lib/drivers';
import { CountrySelector, DEFAULT_COUNTRY } from '@/components/ui/country-selector';
import type { Country } from '@/components/ui/country-selector';
import { buildFullPhone, digitsOnly, formatLocalNumber } from '@/lib/phone';
import { MbButton } from '@/components/ui/mb-button';
import { WasteType } from '@/types';

interface Member {
    id: string;
    name?: string;
    phone?: string;
    isApproved?: boolean;
    isAvailable?: boolean;
    [key: string]: unknown;
}

interface OrgSummary {
    id: string;
    orgCode?: string;
    name?: string;
    wasteTypesHandled?: WasteType[];
}

/** Credentials handed back after a driver is created, for the admin to relay. */
interface NewDriverCredentials {
    name: string;
    phone: string;
    pin: string;
}

export default function TeamPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [org, setOrg] = useState<OrgSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [processingMember, setProcessingMember] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);

    // Add-driver form
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [driverName, setDriverName] = useState('');
    const [driverCountry, setDriverCountry] = useState<Country>(DEFAULT_COUNTRY);
    const [driverPhone, setDriverPhone] = useState('');
    const [driverPin, setDriverPin] = useState(generateTempPin());
    const [isCreating, setIsCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [createdDriver, setCreatedDriver] = useState<NewDriverCredentials | null>(null);
    const [copiedCreds, setCopiedCreds] = useState(false);

    const orgCode = org?.orgCode || org?.id || null;

    const refreshMembers = async (code: string) => {
        const groups = await getOrganizationMembers(code);
        const approved = (groups.approved || []).map((m: Member) => ({ ...m, isApproved: true }));
        const pending = (groups.pending || []).map((m: Member) => ({ ...m, isApproved: false }));
        // The owner is a member of their own org — don't list them as a driver.
        setMembers([...approved, ...pending].filter((m) => m.id !== user?.id));
    };

    const handleApproveMember = async (memberId: string) => {
        if (!orgCode) return;
        setProcessingMember(memberId);
        try {
            await approveMember(orgCode, memberId);
            await refreshMembers(orgCode);
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
            await refreshMembers(orgCode);
        } catch (err) {
            console.error('Failed to remove:', err);
        } finally {
            setProcessingMember(null);
        }
    };

    const openAddDriver = () => {
        setDriverName('');
        setDriverPhone('');
        setDriverPin(generateTempPin());
        setFormError(null);
        setCreatedDriver(null);
        setCopiedCreds(false);
        setShowAddDriver(true);
    };

    const handleCreateDriver = async () => {
        if (!orgCode || !user?.id) return;
        setFormError(null);
        setIsCreating(true);
        try {
            const phone = buildFullPhone(driverCountry.dialCode, driverPhone);
            await createDriverAccount({
                orgCode,
                orgName: org?.name || user.name || 'Organization',
                ownerId: user.id,
                name: driverName,
                phone,
                tempPin: driverPin,
                wasteTypesHandled: org?.wasteTypesHandled,
            });
            setCreatedDriver({ name: driverName.trim(), phone, pin: driverPin });
            await refreshMembers(orgCode);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not create this driver.');
        } finally {
            setIsCreating(false);
        }
    };

    const copyCredentials = () => {
        if (!createdDriver) return;
        const text =
            `MBalit sign-in for ${createdDriver.name}\n` +
            `Phone: ${createdDriver.phone}\n` +
            `Temporary PIN: ${createdDriver.pin}\n` +
            `Open MBalit, tap Log In, enter the phone number and this PIN. ` +
            `You'll be asked to choose your own PIN straight away.`;
        navigator.clipboard?.writeText(text);
        setCopiedCreds(true);
        setTimeout(() => setCopiedCreds(false), 2500);
    };

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const found = (await getOrganizationByOwner(user.id)) as OrgSummary | null;
                if (cancelled) return;
                if (!found?.orgCode && !found?.id) {
                    setMembers([]);
                    return;
                }
                setOrg(found);
                await refreshMembers(found.orgCode || found.id);
            } catch (err) {
                console.error('Team load failed:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const canSubmit =
        driverName.trim().length > 1 &&
        digitsOnly(driverPhone).length >= 7 &&
        /^\d{6}$/.test(driverPin);

    return (
        <div className="min-h-full bg-white">
            <div className="px-5 pt-12 pb-2 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#0F1A14] leading-tight">Team</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isLoading ? '…' : `${members.length} driver${members.length === 1 ? '' : 's'}`}
                    </p>
                </div>
                <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-gray-700" />
                </button>
            </div>

            {orgCode && (
                <div className="px-5 mt-3">
                    <div className="p-3 rounded-2xl bg-[#F1FAF4] border border-[#D2F4E1] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500">Organization code</p>
                            <p className="font-mono font-bold text-lg text-[#0E7A3B] tracking-wider truncate">{orgCode}</p>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard?.writeText(orgCode);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="flex-shrink-0 text-sm font-semibold text-[#0E7A3B] px-3 py-1.5 rounded-full bg-white border border-[#D2F4E1]"
                        >
                            {copiedCode ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            <div className="px-5 mt-4">
                <button
                    onClick={openAddDriver}
                    disabled={!orgCode}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#A8E7C3] bg-[#F1FAF4] text-[#0E7A3B] font-bold hover:bg-[#E8F6EE] transition-colors disabled:opacity-50"
                >
                    <UserPlus className="w-5 h-5" />
                    Add Driver
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
                        <h3 className="font-bold text-[#0F1A14]">No drivers yet</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-[20rem]">
                            Tap <span className="font-semibold">Add Driver</span> to create an account
                            for them, then give them the phone number and temporary PIN.
                        </p>
                    </div>
                ) : (
                    members.map((m) => {
                        // An active driver's row links through to their detail
                        // page; a pending one is inert until it's approved.
                        const cardClass =
                            'bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3' +
                            (m.isApproved ? ' hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.98]' : '');

                        const body = (
                            <>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1FA653] to-[#0E7A3B] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                                {m.profileImage ? (
                                    <img src={m.profileImage as string} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    (m.name || '?').charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-[#0F1A14] text-sm">{m.name || 'Driver'}</h3>
                                    <span className={`mb-badge ${m.isApproved ? 'mb-badge-required' : 'mb-badge-optional'}`}>
                                        {m.isApproved ? 'Active' : 'Pending'}
                                    </span>
                                    {m.mustChangePin === true && (
                                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                            PIN not changed yet
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{m.phone || ''}</p>
                            </div>
                            {!m.isApproved && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleRemoveMember(m.id); }}
                                        disabled={processingMember === m.id}
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                        {processingMember === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleApproveMember(m.id); }}
                                        disabled={processingMember === m.id}
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#E8F6EE] text-[#0E7A3B] hover:bg-[#D2F4E1] transition-colors disabled:opacity-50"
                                    >
                                        {processingMember === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}
                            {m.isApproved && (
                                <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                </div>
                            )}
                            </>
                        );

                        return m.isApproved ? (
                            <Link key={m.id} href={`/organization/team/${m.id}`} className={cardClass}>
                                {body}
                            </Link>
                        ) : (
                            <div key={m.id} className={cardClass}>{body}</div>
                        );
                    })
                )}
            </div>

            {/* ==========================================
                ADD DRIVER — the admin creates the account
                outright (name + phone + temporary PIN) and
                reads the credentials out to the driver.
            ========================================== */}
            <AnimatePresence>
                {showAddDriver && orgCode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => !isCreating && setShowAddDriver(false)}
                    >
                        <motion.div
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 40, opacity: 0 }}
                            className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl relative max-h-[92dvh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => !isCreating && setShowAddDriver(false)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>

                            {createdDriver ? (
                                /* ---------- Credentials to hand over ---------- */
                                <>
                                    <div className="w-12 h-12 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                                        <Check className="w-6 h-6" strokeWidth={3} />
                                    </div>
                                    <h2 className="text-xl font-bold text-[#0F1A14] mb-1">
                                        {createdDriver.name} is ready
                                    </h2>
                                    <p className="text-sm text-gray-500 mb-5">
                                        Give them these two details. They log in on the normal Log In
                                        screen and will be asked to pick their own PIN immediately.
                                    </p>

                                    <div className="rounded-2xl border border-[#D2F4E1] bg-[#F1FAF4] p-4 space-y-3 mb-5">
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4 text-[#0E7A3B] flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Phone number</p>
                                                <p className="font-bold text-[#0F1A14]">{createdDriver.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <KeyRound className="w-4 h-4 text-[#0E7A3B] flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500">Temporary PIN</p>
                                                <p className="font-mono font-bold text-2xl tracking-[0.3em] text-[#0F1A14]">
                                                    {createdDriver.pin}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 mb-4 leading-snug">
                                        This PIN is shown once. If it gets lost, remove the driver and add
                                        them again with a new one.
                                    </p>

                                    <MbButton
                                        size="lg"
                                        variant="outline"
                                        leftIcon={copiedCreds ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                        onClick={copyCredentials}
                                        className="mb-2"
                                    >
                                        {copiedCreds ? 'Copied' : 'Copy details'}
                                    </MbButton>
                                    <MbButton size="lg" onClick={() => setShowAddDriver(false)}>
                                        Done
                                    </MbButton>
                                </>
                            ) : (
                                /* ---------- The form ---------- */
                                <>
                                    <div className="w-12 h-12 rounded-full bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B] mb-4">
                                        <UserPlus className="w-6 h-6" />
                                    </div>

                                    <h2 className="text-xl font-bold text-[#0F1A14] mb-1">Add Driver</h2>
                                    <p className="text-sm text-gray-500 mb-5">
                                        You create the account — the driver just signs in. They inherit
                                        your organization&apos;s waste types, so there&apos;s nothing for
                                        them to set up.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-[#0F1A14] mb-1.5">
                                                Driver&apos;s name
                                            </label>
                                            <input
                                                type="text"
                                                value={driverName}
                                                onChange={e => setDriverName(e.target.value)}
                                                placeholder="e.g. Lamin Ceesay"
                                                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#0E7A3B] outline-none text-[#0F1A14] font-semibold"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-[#0F1A14] mb-1.5">
                                                Phone number
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <CountrySelector selectedCountry={driverCountry} onSelect={setDriverCountry} />
                                                <input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    value={formatLocalNumber(driverPhone)}
                                                    onChange={e => setDriverPhone(digitsOnly(e.target.value).slice(0, 7))}
                                                    placeholder="000 00 00"
                                                    className="flex-1 min-w-0 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#0E7A3B] outline-none text-[#0F1A14] font-bold tracking-wider"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                This is how they sign in — make sure it&apos;s right.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-[#0F1A14] mb-1.5">
                                                Temporary PIN
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={driverPin}
                                                    onChange={e => setDriverPin(digitsOnly(e.target.value).slice(0, 6))}
                                                    className="flex-1 min-w-0 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#0E7A3B] outline-none text-[#0F1A14] font-mono font-bold text-xl tracking-[0.3em]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setDriverPin(generateTempPin())}
                                                    className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-gray-100 flex items-center justify-center text-[#0E7A3B] hover:bg-gray-50"
                                                    aria-label="Generate a new PIN"
                                                >
                                                    <RefreshCw className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                The driver must replace this the first time they sign in.
                                            </p>
                                        </div>

                                        {formError && (
                                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                                <p className="text-sm text-red-600">{formError}</p>
                                            </div>
                                        )}

                                        <MbButton
                                            size="lg"
                                            onClick={handleCreateDriver}
                                            disabled={!canSubmit}
                                            isLoading={isCreating}
                                        >
                                            Create driver account
                                        </MbButton>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
