'use client';

import React from 'react';
import { Eye, EyeOff, Plus, Upload, ArrowDownCircle, ArrowUpCircle, Clock, Wallet } from 'lucide-react';

interface StatProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
}

const Stat: React.FC<StatProps> = ({ icon, label, value, sub }) => (
    <div className="flex-1 px-2 text-left">
        <div className="text-[11px] text-white/95 inline-flex items-center gap-1.5 mb-1 font-medium">
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center">{icon}</span>
            <span className="truncate">{label}</span>
        </div>
        <div className="text-[15px] font-extrabold text-white leading-tight">{value}</div>
        <div className="text-[10px] text-white/85 mt-0.5">{sub}</div>
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

/**
 * Green balance card.
 *
 * Background is intentionally rendered with a solid emerald base color AND
 * a CSS gradient layered via inline style — even if the gradient fails to
 * paint (older WebKit, blocked CSS layer, etc.) the solid green still
 * shows through so the card never appears as a transparent / white block.
 * The decorative wallet icon is a Lucide glyph rather than an external SVG
 * so it can't go missing or render as white-on-white.
 */
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
            className="relative rounded-3xl p-5 overflow-hidden text-white bg-[#0E7A3B]"
            style={{
                backgroundColor: '#0E7A3B',
                backgroundImage: 'linear-gradient(160deg, #0E7A3B 0%, #1FA653 100%)',
            }}
        >
            {/* Decorative wallet glyph — Lucide icon over a soft white halo so
                it always reads against the green even if image loading is
                blocked on the device. */}
            <div className="absolute right-4 top-4 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <Wallet className="w-8 h-8 text-white" strokeWidth={2} />
            </div>

            {/* Soft decorative circles */}
            <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />

            <div className="relative">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    {balanceLabel}
                    <button
                        type="button"
                        onClick={onToggleVisibility}
                        className="p-0.5 rounded-md hover:bg-white/15 transition-colors"
                        aria-label={visible ? 'Hide balance' : 'Show balance'}
                    >
                        {visible ? <Eye className="w-4 h-4 text-white" /> : <EyeOff className="w-4 h-4 text-white" />}
                    </button>
                </div>

                <div className="mt-1.5 text-[34px] font-extrabold leading-none tracking-tight text-white">
                    {visible ? balance : '•••••••'}
                </div>
                {balanceWords && (
                    <div className="mt-1.5 text-xs text-white/90 max-w-[60%]">
                        {visible ? balanceWords : 'Hidden'}
                    </div>
                )}

                <div className="mt-4 flex gap-2.5">
                    <button
                        onClick={onAddMoney}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white text-[#0E7A3B] font-bold text-sm shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        Add Money
                    </button>
                    <button
                        onClick={onWithdraw}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 border-white/70 bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors"
                    >
                        <Upload className="w-4 h-4" strokeWidth={2.5} />
                        Withdraw
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/25 flex items-stretch">
                    <Stat
                        icon={<ArrowDownCircle className="w-3.5 h-3.5 text-white" />}
                        label="Total Added"
                        value={totalAdded}
                        sub="This Month"
                    />
                    <div className="w-px bg-white/25" />
                    <Stat
                        icon={<ArrowUpCircle className="w-3.5 h-3.5 text-white" />}
                        label="Total Spent"
                        value={totalSpent}
                        sub="This Month"
                    />
                    <div className="w-px bg-white/25" />
                    <Stat
                        icon={<Clock className="w-3.5 h-3.5 text-white" />}
                        label="Pending"
                        value={pendingWithdrawal}
                        sub={`${pendingRequests} Request${pendingRequests !== 1 ? 's' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default WalletBalanceCard;
