'use client';

import React from 'react';

interface OtpInputProps {
    length?: number;
    value: string;
    error?: boolean;
    activeIndex?: number;
}

export const OtpInput: React.FC<OtpInputProps> = ({
    length = 6,
    value,
    error = false,
    activeIndex,
}) => {
    const cursor = activeIndex ?? value.length;
    return (
        <div className="flex gap-2.5 justify-center">
            {Array.from({ length }, (_, i) => {
                const filled = !!value[i];
                const isActive = i === cursor;
                return (
                    <div
                        key={i}
                        className={`
                            w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-all
                            text-xl font-bold
                            ${error
                                ? 'border-red-400 bg-red-50 text-red-600'
                                : isActive && !filled
                                    ? 'border-[#0E7A3B] bg-white text-[#0E7A3B]'
                                    : filled
                                        ? 'border-[#0E7A3B] bg-white text-[#0F1A14]'
                                        : 'border-gray-200 bg-white text-gray-300'}
                        `}
                    >
                        {filled ? value[i] : isActive ? (
                            <span className="w-px h-6 bg-[#0E7A3B] animate-pulse" />
                        ) : ''}
                    </div>
                );
            })}
        </div>
    );
};

export default OtpInput;
