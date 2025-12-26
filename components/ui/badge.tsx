import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-emerald-500 text-white hover:bg-emerald-600',
                secondary:
                    'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100',
                destructive:
                    'border-transparent bg-red-500 text-white hover:bg-red-600',
                outline:
                    'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
                success:
                    'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                warning:
                    'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={badgeVariants({ variant, className })} {...props} />
    );
}

export { Badge, badgeVariants };
