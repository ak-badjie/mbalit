'use client';

import React from 'react';
import { Eye, EyeOff, Plus, Upload, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';

interface StatProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
}

const Stat: React.FC<StatProps> = ({ icon, label, value, sub }) => (
    <div className="flex-1 px-2 text-left">
        <div className="text-xs text-white/85 inline-flex items-center gap-1.5 mb-1">
            <span className="w-4 h-4 inline-flex items-center justify-center">{icon}</span>
            {label}
        </div>
        <div className="text-[15px] font-bold text-white leading-tight">{value}</div>
        <div className="text-[11px] text-white/75 mt-0.5">{sub}</div>
    </div>
);

interface WalletBalanceCardProps {
    balanceLabel?: string;
    balance: string;
    balanceWords?: string;
    totalAdded: string;
    totalSpent: string;
    pendingWithdrawal: string;
    pendingRequests?: number;
    visible?: boolean;
    onToggleVisibility?: () => void;
    onAddMoney?: () => void;
    onWithdraw?: () => void;
}

export const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
    balanceLabel = 'Available Balance',
    balance,
    balanceWords,
    totalAdded,
    totalSpent,
    pendingWithdrawal,
    pendingRequests = 0,
    visible = true,
    onToggleVisibility,
    onAddMoney,
    onWithdraw,
}) => {
    return (
        <div
            className="relative rounded-3xl p-5 overflow-hidden text-white"
            style={{ background: 'linear-gradient(160deg, #0E7A3B 0%, #1FA653 100%)' }}
        >
            {/* Decorative wallet illustration */}
            <img
                src="/illustrations/wallet.svg"
                alt=""
                aria-hidden
                className="absolute right-3 top-3 w-28 h-24 opacity-95 pointer-events-none"
            />
            {/* Soft circles */}
            <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-white/5" />
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative">
                <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                    {balanceLabel}
                    <button
                        type="button"
                        onClick={onToggleVisibility}
                        className="p-0.5 rounded-md hover:bg-white/10 transition-colors"
                        aria-label={visible ? 'Hide balance' : 'Show balance'}
                    >
                        {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>

                <div className="mt-1.5 text-[34px] font-extrabold leading-none tracking-tight">
                    {visible ? balance : '•••••••'}
                </div>
                {balanceWords && (
                    <div className="mt-1.5 text-xs text-white/80 max-w-[60%]">
                        {visible ? balanceWords : 'Hidden'}
                    </div>
                )}

                <div className="mt-4 flex gap-2.5">
                    <button
                        onClick={onAddMoney}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white text-[#0E7A3B] font-semibold text-sm shadow-sm"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        Add Money
                    </button>
                    <button
                        onClick={onWithdraw}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                    >
                        <Upload className="w-4 h-4" strokeWidth={2.5} />
                        Withdraw
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/15 flex items-stretch">
                    <Stat
                        icon={<ArrowDownCircle className="w-4 h-4" />}
                        label="Total Added"
                        value={totalAdded}
                        sub="This Month"
                    />
                    <div className="w-px bg-white/15" />
                    <Stat
                        icon={<ArrowUpCircle className="w-4 h-4" />}
                        label="Total Spent"
                        value={totalSpent}
                        sub="This Month"
                    />
                    <div className="w-px bg-white/15" />
                    <Stat
                        icon={<Clock className="w-4 h-4" />}
                        label="Pending Withdrawal"
                        value={pendingWithdrawal}
                        sub={`${pendingRequests} Request${pendingRequests !== 1 ? 's' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default WalletBalanceCard;
