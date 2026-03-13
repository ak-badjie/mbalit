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
        sm: { width: 56, height: 56 },
        md: { width: 72, height: 72 },
        lg: { width: 110, height: 110 },
        xl: { width: 150, height: 150 },
    };

    const { width, height } = dimensions[size];

    return (
        <div className={`flex flex-col items-center ${className}`}>
            <img
                src="/logo.png"
                alt="MBALit Logo"
                width={width}
                height={height}
                className="object-contain"
            />
        </div>
    );
};

// Alias for backwards compatibility
export const TruckLogo = RecyclingLogo;

// Animated logo for loading screen (larger with enhanced animation)
export const AnimatedRecyclingLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                src="/logo.png"
                alt="MBALit Logo"
                width={120}
                height={120}
                className="object-contain"
            />
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
