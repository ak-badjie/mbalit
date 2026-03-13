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

    return (
        <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] mx-auto">
            {KEYS.map((key, index) => {
                if (key.num === '') {
                    return <div key={index} />;
                }

                if (key.num === 'delete') {
                    return (
                        <motion.button
                            key="delete"
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handlePress('delete')}
                            className="h-16 rounded-2xl flex items-center justify-center transition-colors active:bg-gray-100"
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
                        className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center transition-colors border border-gray-100"
                    >
                        <span className="text-2xl font-semibold text-gray-900">{key.num}</span>
                        {showLetters && key.letters && (
                            <span className="text-[10px] font-medium text-gray-400 tracking-[0.2em] mt-[-2px]">
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
