'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    className?: string;
}

// Static Recycling Bin Logo (for nav bars and headers)
export const RecyclingLogo: React.FC<LogoProps> = ({
    size = 'md',
    showText = true,
    className = '',
}) => {
    const dimensions = {
        sm: { width: 32, height: 32, textSize: 'text-xs' },
        md: { width: 48, height: 48, textSize: 'text-sm' },
        lg: { width: 80, height: 80, textSize: 'text-lg' },
        xl: { width: 120, height: 120, textSize: 'text-2xl' },
    };

    const { width, height, textSize } = dimensions[size];

    return (
        <div className={`flex flex-col items-center ${className}`}>
            <svg
                width={width}
                height={height}
                viewBox="-6.7 0 122.88 122.88"
                xmlns="http://www.w3.org/2000/svg"
            >
                <g>
                    {/* Body */}
                    <path fill="#10b981" d="M8.69,29.61h92.92c1.94,0,3.7,1.6,3.52,3.52 l-7.86,86.23c-0.18,1.93-1.59,3.52-3.52,3.52l-77.3,0c-1.93,0-3.35-1.59-3.52-3.52L5.17,33.13C4.99,31.2,6.75,29.61,8.69,29.61 L8.69,29.61L8.69,29.61z" />
                    {/* Arrows */}
                    <path fill="#ffffff" d="M33.93,95.11l-6.16-10.59c-1.11-1.92-1.53-3.42-0.6-5.64l3.62-6.09l-3.63-1.95l12.17-0.05l6.07,10.61 l-3.75-2.15l-6.08,10.78c-0.58,1.02-1.06,1.8-1.35,2.96C34.05,93.7,33.96,94.41,33.93,95.11L33.93,95.11z M36.38,62.36l5.86-10.2 c1.65-2.05,3.7-2.79,5.65-2.24c1.68,0.48,2.15,1.23,3.04,2.6c1.07,1.63,2,3.37,2.98,5.08l-6.55,11.26L36.38,62.36L36.38,62.36z M49.71,48.43l12.26-0.04c2.22-0.01,3.73,0.39,5.18,2.3l3.46,6.18l3.51-2.17l-6.04,10.56l-12.23-0.05l3.74-2.17l-6.3-10.66 c-0.6-1.01-1.03-1.81-1.89-2.65C50.88,49.23,50.31,48.81,49.71,48.43L49.71,48.43z M76.4,67.42l5.9,10.17 c0.95,2.45,0.57,4.6-0.89,6.01c-1.25,1.22-2.14,1.24-3.77,1.34c-1.95,0.11-3.92,0.05-5.89,0.04l-6.47-11.3L76.4,67.42L76.4,67.42z M81.8,85.93l-6.09,10.64c-1.1,1.92-2.2,3.03-4.58,3.34l-7.08-0.09l0.12,4.12l-6.13-10.52l6.15-10.56l0.01,4.32l12.38-0.12 c1.17-0.01,2.09,0.01,3.24-0.31C80.52,86.54,81.17,86.26,81.8,85.93L81.8,85.93z M52.67,99.7l-11.76,0.02 c-2.6-0.4-4.27-1.81-4.77-3.77c-0.43-1.69-0.01-2.48,0.73-3.94c0.88-1.74,1.92-3.42,2.91-5.12l13.02,0.05L52.67,99.7L52.67,99.7z" />
                    {/* Lid */}
                    <path fill="#10b981" d="M2.35,9.63h38.3V3.76C40.64,1.69,42.33,0,44.4,0h21.14c2.07,0,3.76,1.69,3.76,3.76v5.87h37.83 c1.29,0,2.35,1.06,2.35,2.35V23.5H0V11.98C0,10.69,1.05,9.63,2.35,9.63L2.35,9.63z" />
                </g>
            </svg>
            {showText && (
                <span
                    className={`font-bold text-emerald-600 mt-1 tracking-wide ${textSize}`}
                    style={{ fontFamily: "var(--font-outfit), 'Outfit', sans-serif" }}
                >
                    MBALIT
                </span>
            )}
        </div>
    );
};

// Alias for backwards compatibility
export const TruckLogo = RecyclingLogo;

// Animated logo for loading screen (larger with enhanced animation)
export const AnimatedRecyclingLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <svg
                width="160"
                height="160"
                viewBox="-6.7 0 122.88 122.88"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter id="glow-large" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <style>{`
                    .bin-group-anim {
                        animation: bounce-anim 2s ease-in-out infinite;
                        transform-origin: bottom center;
                    }
                    .lid-anim {
                        fill: #10b981;
                        transform-origin: 55px 25px;
                        animation: chomp-anim 0.5s cubic-bezier(0.11, 0, 0.5, 0) infinite alternate;
                    }
                    .body-anim {
                        fill: #10b981;
                        filter: url(#glow-large);
                    }
                    .arrows-anim {
                        fill: #ffffff;
                        transform-origin: 55px 72px;
                        animation: spin-anim 2s linear infinite;
                    }
                    @keyframes spin-anim {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(-360deg); }
                    }
                    @keyframes chomp-anim {
                        0% { transform: rotate(0deg) translateY(0); }
                        100% { transform: rotate(-20deg) translateY(-3px); }
                    }
                    @keyframes bounce-anim {
                        0%, 100% { transform: translateY(0) scale(1, 1); }
                        50% { transform: translateY(4px) scale(1.03, 0.97); }
                    }
                `}</style>

                <g className="bin-group-anim">
                    <path className="body-anim" d="M8.69,29.61h92.92c1.94,0,3.7,1.6,3.52,3.52 l-7.86,86.23c-0.18,1.93-1.59,3.52-3.52,3.52l-77.3,0c-1.93,0-3.35-1.59-3.52-3.52L5.17,33.13C4.99,31.2,6.75,29.61,8.69,29.61 L8.69,29.61L8.69,29.61z" />
                    <path className="arrows-anim" d="M33.93,95.11l-6.16-10.59c-1.11-1.92-1.53-3.42-0.6-5.64l3.62-6.09l-3.63-1.95l12.17-0.05l6.07,10.61 l-3.75-2.15l-6.08,10.78c-0.58,1.02-1.06,1.8-1.35,2.96C34.05,93.7,33.96,94.41,33.93,95.11L33.93,95.11z M36.38,62.36l5.86-10.2 c1.65-2.05,3.7-2.79,5.65-2.24c1.68,0.48,2.15,1.23,3.04,2.6c1.07,1.63,2,3.37,2.98,5.08l-6.55,11.26L36.38,62.36L36.38,62.36z M49.71,48.43l12.26-0.04c2.22-0.01,3.73,0.39,5.18,2.3l3.46,6.18l3.51-2.17l-6.04,10.56l-12.23-0.05l3.74-2.17l-6.3-10.66 c-0.6-1.01-1.03-1.81-1.89-2.65C50.88,49.23,50.31,48.81,49.71,48.43L49.71,48.43z M76.4,67.42l5.9,10.17 c0.95,2.45,0.57,4.6-0.89,6.01c-1.25,1.22-2.14,1.24-3.77,1.34c-1.95,0.11-3.92,0.05-5.89,0.04l-6.47-11.3L76.4,67.42L76.4,67.42z M81.8,85.93l-6.09,10.64c-1.1,1.92-2.2,3.03-4.58,3.34l-7.08-0.09l0.12,4.12l-6.13-10.52l6.15-10.56l0.01,4.32l12.38-0.12 c1.17-0.01,2.09,0.01,3.24-0.31C80.52,86.54,81.17,86.26,81.8,85.93L81.8,85.93z M52.67,99.7l-11.76,0.02 c-2.6-0.4-4.27-1.81-4.77-3.77c-0.43-1.69-0.01-2.48,0.73-3.94c0.88-1.74,1.92-3.42,2.91-5.12l13.02,0.05L52.67,99.7L52.67,99.7z" />
                    <path className="lid-anim" d="M2.35,9.63h38.3V3.76C40.64,1.69,42.33,0,44.4,0h21.14c2.07,0,3.76,1.69,3.76,3.76v5.87h37.83 c1.29,0,2.35,1.06,2.35,2.35V23.5H0V11.98C0,10.69,1.05,9.63,2.35,9.63L2.35,9.63z" />
                </g>
            </svg>
            <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="font-bold text-3xl text-emerald-600 mt-4 tracking-widest"
                style={{ fontFamily: "var(--font-outfit), 'Outfit', sans-serif" }}
            >
                MBALIT
            </motion.span>
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-sm text-gray-500  mt-1"
            >
                Waste Collection Made Easy
            </motion.span>
        </div>
    );
};

// Alias for backwards compatibility
export const AnimatedTruckLogo = AnimatedRecyclingLogo;

// Loading screen component
interface LoadingScreenProps {
    onComplete?: () => void;
    duration?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    onComplete,
    duration = 2000,
}) => {
    const [isVisible, setIsVisible] = React.useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50   "
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
            >
                <AnimatedRecyclingLogo />
            </motion.div>
        </motion.div>
    );
};

export default RecyclingLogo;
