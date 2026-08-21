'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Country {
    code: string;
    name: string;
    dialCode: string;
    flag: React.ReactNode;
}

// Gambia flag SVG
const GambiaFlag = () => (
    <svg width="24" height="16" viewBox="0 0 900 600" className="rounded-sm">
        <rect width="900" height="200" fill="#CE1126" />
        <rect y="200" width="900" height="25" fill="#FFFFFF" />
        <rect y="225" width="900" height="150" fill="#0C1C8C" />
        <rect y="375" width="900" height="25" fill="#FFFFFF" />
        <rect y="400" width="900" height="200" fill="#3A7728" />
    </svg>
);

// Senegal flag SVG
const SenegalFlag = () => (
    <svg width="24" height="16" viewBox="0 0 900 600" className="rounded-sm">
        <rect width="300" height="600" fill="#00853F" />
        <rect x="300" width="300" height="600" fill="#FDEF42" />
        <rect x="600" width="300" height="600" fill="#E31B23" />
        <text x="450" y="320" textAnchor="middle" fill="#00853F" fontSize="120">★</text>
    </svg>
);

// Guinea-Bissau flag SVG
const GuineaBissauFlag = () => (
    <svg width="24" height="16" viewBox="0 0 900 600" className="rounded-sm">
        <rect width="300" height="600" fill="#CE1126" />
        <rect x="300" width="600" height="300" fill="#FCD116" />
        <rect x="300" y="300" width="600" height="300" fill="#009E49" />
        <text x="150" y="330" textAnchor="middle" fill="#000" fontSize="160">★</text>
    </svg>
);

export const COUNTRIES: Country[] = [
    { code: 'GM', name: 'Gambia', dialCode: '+220', flag: <GambiaFlag /> },
    { code: 'SN', name: 'Senegal', dialCode: '+221', flag: <SenegalFlag /> },
    { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245', flag: <GuineaBissauFlag /> },
];

interface CountrySelectorProps {
    selectedCountry: Country;
    onSelect: (country: Country) => void;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
    selectedCountry,
    onSelect,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
            >
                {selectedCountry.flag}
                <span className="text-base font-semibold text-gray-900">{selectedCountry.dialCode}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40"
                        />
                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                        >
                            {COUNTRIES.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                        onSelect(country);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                                        selectedCountry.code === country.code ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    {country.flag}
                                    <span className="text-sm font-medium text-gray-900">{country.name}</span>
                                    <span className="text-sm text-gray-500 ml-auto">{country.dialCode}</span>
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Gambia
export type { Country };
export default CountrySelector;
