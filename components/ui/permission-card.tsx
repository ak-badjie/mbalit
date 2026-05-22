'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

interface PermissionCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    required?: boolean;
    granted: boolean;
    onToggle?: () => void;
}

export const PermissionCard: React.FC<PermissionCardProps> = ({
    icon,
    title,
    description,
    required = false,
    granted,
    onToggle,
}) => {
    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onToggle}
            className="w-full flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl text-left hover:border-[#A8E7C3] transition-colors"
        >
            <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-[#E8F6EE] flex items-center justify-center text-[#0E7A3B]">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="font-bold text-[#0F1A14] text-[15px]">{title}</h3>
                    <span
                        className={`mb-badge ${required ? 'mb-badge-required' : 'mb-badge-optional'}`}
                    >
                        {required ? 'Required' : 'Optional'}
                    </span>
                </div>
                <p className="text-sm text-gray-500 leading-snug">{description}</p>
            </div>
            {granted ? (
                <div className="w-7 h-7 rounded-full bg-[#0E7A3B] flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
            ) : (
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
            )}
        </motion.button>
    );
};

export default PermissionCard;
