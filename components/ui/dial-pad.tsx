'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface DialPadProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    showLetters?: boolean;
}

const KEYS = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '', letters: '' }, // empty
    { num: '0', letters: '' },
    { num: 'delete', letters: '' },
];

export const DialPad: React.FC<DialPadProps> = ({
    value,
    onChange,
    maxLength = 10,
    showLetters = true,
}) => {
    const handlePress = (key: string) => {
        if (key === 'delete') {
            onChange(value.slice(0, -1));
        } else if (key !== '' && value.length < maxLength) {
            onChange(value + key);
        }
    };

    // Key height tracks the viewport height rather than sitting at a fixed
    // 64px. On a short handset that fixed height pushed the primary button
    // below the fold and forced the user to scroll to finish a step.
    const keyClass =
        'h-[clamp(3rem,7.4vh,4rem)] rounded-2xl flex items-center justify-center transition-colors';

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[320px] mx-auto">
            {KEYS.map((key, index) => {
                if (key.num === '') {
                    return <div key="empty" />;
                }

                if (key.num === 'delete') {
                    return (
                        <motion.button
                            key="delete"
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handlePress('delete')}
                            className={`${keyClass} active:bg-gray-100`}
                        >
                            <Delete className="w-6 h-6 text-gray-600" />
                        </motion.button>
                    );
                }

                return (
                    <motion.button
                        key={key.num}
                        type="button"
                        whileTap={{ scale: 0.92, backgroundColor: 'rgba(0,0,0,0.06)' }}
                        onClick={() => handlePress(key.num)}
                        className={`${keyClass} flex-col bg-gray-50 hover:bg-gray-100 border border-gray-100`}
                    >
                        <span className="text-[clamp(1.25rem,3.2vh,1.5rem)] leading-none font-semibold text-gray-900">
                            {key.num}
                        </span>
                        {showLetters && key.letters && (
                            <span className="text-[10px] font-medium text-gray-400 tracking-[0.2em] mt-0.5">
                                {key.letters}
                            </span>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};

export default DialPad;
