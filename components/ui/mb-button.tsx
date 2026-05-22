'use client';

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface MbButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
    variant?: Variant;
    size?: Size;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
    primary: 'bg-[#0E7A3B] hover:bg-[#0a6230] text-white shadow-[0_10px_25px_rgba(14,122,59,0.25)]',
    outline: 'bg-white border-2 border-[#0E7A3B] text-[#0E7A3B] hover:bg-[#ECFDF3]',
    ghost: 'bg-transparent text-[#0E7A3B] hover:bg-[#ECFDF3]',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md',
};

const sizeStyles: Record<Size, string> = {
    md: 'py-3 px-4 text-sm',
    lg: 'py-4 px-6 text-base',
};

export const MbButton = forwardRef<HTMLButtonElement, MbButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'lg',
            isLoading = false,
            leftIcon,
            rightIcon,
            fullWidth = true,
            disabled,
            className = '',
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || isLoading;
        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                disabled={isDisabled}
                className={`
                    inline-flex items-center justify-center gap-2 font-bold rounded-2xl
                    transition-colors duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7A3B] focus-visible:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}
                `}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                        <span>{children as React.ReactNode}</span>
                        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
                    </>
                )}
            </motion.button>
        );
    }
);
MbButton.displayName = 'MbButton';
export default MbButton;
