'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    className?: string;
}

const DIMENSIONS = {
    sm: { width: 36, height: 42, text: 'text-sm' },
    md: { width: 52, height: 60, text: 'text-base' },
    lg: { width: 72, height: 84, text: 'text-xl' },
    xl: { width: 110, height: 128, text: 'text-2xl' },
} as const;

/**
 * MbalitApp brand mark (M with location pin) + optional wordmark.
 * Placeholder asset lives at /brand/mbalitapp-logo.svg — swap with the real logo later.
 */
export const RecyclingLogo: React.FC<LogoProps> = ({
    size = 'md',
    showText = true,
    className = '',
}) => {
    const { width, height, text } = DIMENSIONS[size];

    return (
        <div className={`flex flex-col items-center ${className}`}>
            <img
                src="/brand/mbalitapp-logo.svg"
                alt="MbalitApp"
                width={width}
                height={height}
                className="object-contain"
            />
            {showText && (
                <span className={`font-extrabold tracking-tight text-brand-strong mt-1 ${text}`}>
                    MbalitApp
                </span>
            )}
        </div>
    );
};

export const TruckLogo = RecyclingLogo;

export const AnimatedRecyclingLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex flex-col items-center ${className}`}>
        <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            src="/brand/mbalitapp-logo.svg"
            alt="MbalitApp"
            width={120}
            height={140}
            className="object-contain"
        />
        <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-extrabold tracking-tight text-2xl text-brand-strong mt-2"
        >
            MbalitApp
        </motion.span>
    </div>
);

export const AnimatedTruckLogo = AnimatedRecyclingLogo;

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
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #EFF9F3 0%, #FFFFFF 100%)' }}
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
