'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    className?: string;
}

const DIMENSIONS = {
    sm: { width: 40, height: 40, text: 'text-sm' },
    md: { width: 56, height: 56, text: 'text-base' },
    lg: { width: 80, height: 80, text: 'text-xl' },
    xl: { width: 120, height: 120, text: 'text-2xl' },
} as const;

/**
 * MBalit brand mark + optional wordmark.
 * Uses /logo.png (the actual MBalit logo in /public).
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
                src="/logo.png"
                alt="MBalit"
                width={width}
                height={height}
                className="object-contain"
            />
            {showText && (
                <span className={`font-extrabold tracking-tight text-brand-strong mt-1 ${text}`}>
                    MBalit
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
            src="/logo.png"
            alt="MBalit"
            width={120}
            height={120}
            className="object-contain"
        />
        <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-extrabold tracking-tight text-2xl text-brand-strong mt-2"
        >
            MBalit
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
