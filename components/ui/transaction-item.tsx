'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';

export type TransactionKind = 'credit' | 'debit' | 'refund';

interface TransactionItemProps {
    kind: TransactionKind;
    title: string;
    subtitle: string;
    timestamp: string;
    amount: string;
    balanceAfter?: string;
    onClick?: () => void;
}

const KIND_STYLES: Record<TransactionKind, { bg: string; iconColor: string; icon: React.ReactNode; amountColor: string; sign: string }> = {
    credit: {
        bg: 'bg-[#E8F6EE]',
        iconColor: 'text-[#0E7A3B]',
        icon: <ArrowDown className="w-4 h-4" strokeWidth={2.5} />,
        amountColor: 'text-[#0E7A3B]',
        sign: '+',
    },
    debit: {
        bg: 'bg-[#FFEDD5]',
        iconColor: 'text-[#C2410C]',
        icon: <ArrowUp className="w-4 h-4" strokeWidth={2.5} />,
        amountColor: 'text-[#C2410C]',
        sign: '-',
    },
    refund: {
        bg: 'bg-[#E8F6EE]',
        iconColor: 'text-[#0E7A3B]',
        icon: <RotateCcw className="w-4 h-4" strokeWidth={2.5} />,
        amountColor: 'text-[#0E7A3B]',
        sign: '+',
    },
};

export const TransactionItem: React.FC<TransactionItemProps> = ({
    kind,
    title,
    subtitle,
    timestamp,
    amount,
    balanceAfter,
    onClick,
}) => {
    const style = KIND_STYLES[kind];
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-3 py-3 text-left border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
        >
            <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center ${style.iconColor} flex-shrink-0`}>
                {style.icon}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[#0F1A14] text-sm leading-tight">{title}</h4>
                <p className="text-xs text-gray-500 truncate">{subtitle}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{timestamp}</p>
            </div>
            <div className="text-right flex-shrink-0">
                <div className={`font-bold text-sm ${style.amountColor}`}>{style.sign}{amount}</div>
                {balanceAfter && (
                    <div className="text-[11px] text-gray-400 mt-0.5">Balance: {balanceAfter}</div>
                )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        </button>
    );
};

export default TransactionItem;
