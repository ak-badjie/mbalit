'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

interface RoleCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    selected?: boolean;
    badge?: string;
    onClick?: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
    icon,
    title,
    description,
    selected = false,
    badge,
    onClick,
}) => {
    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -2 }}
            onClick={onClick}
            className={`w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all
                ${selected
                    ? 'bg-[#ECFDF3] border-2 border-[#0E7A3B]'
                    : 'bg-white border border-gray-100 hover:border-[#A8E7C3]'}
            `}
        >
            <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B]">
                {icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-bold text-[#0F1A14] text-[17px] mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-snug">{description}</p>
                {badge && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#0E7A3B]">
                        <Check className="w-3 h-3" strokeWidth={3} />
                        {badge}
                    </span>
                )}
            </div>
            <div className="flex-shrink-0 self-center">
                {selected ? (
                    <div className="w-7 h-7 rounded-full bg-[#0E7A3B] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                ) : (
                    <div className="w-7 h-7 rounded-full bg-[#E8F6EE] flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-[#0E7A3B]" />
                    </div>
                )}
            </div>
        </motion.button>
    );
};

export default RoleCard;
