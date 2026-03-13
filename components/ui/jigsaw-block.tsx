'use client';

import React from 'react';
import { HTMLMotionProps, motion } from 'framer-motion';

export interface JigsawBlockProps extends HTMLMotionProps<"div"> {
    tabPosition?: 'bottom' | 'right' | 'top' | 'left' | 'none';
    colorClass?: string;
    contentClassName?: string;
    width?: number;
    height?: number;
    strokeColor?: string;
    /** Size of the puzzle tab. Default 20 */
    tabSize?: number;
    /** Corner radius of the block body. Default 24 */
    cornerRadius?: number;
}

/**
 * Premium JigsawBlock with squarish tabs with rounded corners.
 * The tab is a rounded rectangle (stadium shape) that protrudes from one edge.
 */
export const JigsawBlock = React.forwardRef<HTMLDivElement, JigsawBlockProps>(({
    tabPosition = 'bottom',
    colorClass = 'text-emerald-500 fill-current',
    contentClassName = '',
    width = 300,
    height = 140,
    strokeColor = 'rgba(255,255,255,0.35)',
    tabSize = 20,
    cornerRadius = 24,
    children,
    className = '',
    ...props
}, ref) => {
    const r = cornerRadius;
    const ts = tabSize;       // how far the tab protrudes
    const tw = 50;            // tab width (half-width = 25 on each side)
    const tr = Math.min(10, ts / 2); // tab corner radius (rounded corners on the tab)

    let pathD = '';
    let svgW = width;
    let svgH = height;

    if (tabPosition === 'none') {
        pathD = `M ${r},0 L ${width-r},0 A ${r},${r} 0 0 1 ${width},${r} L ${width},${height-r} A ${r},${r} 0 0 1 ${width-r},${height} L ${r},${height} A ${r},${r} 0 0 1 0,${height-r} L 0,${r} A ${r},${r} 0 0 1 ${r},0 Z`;
    }
    else if (tabPosition === 'bottom') {
        svgH = height + ts;
        const cx = width / 2;
        const by = height;
        pathD = `
            M ${r},0
            L ${width-r},0 A ${r},${r} 0 0 1 ${width},${r}
            L ${width},${by-r} A ${r},${r} 0 0 1 ${width-r},${by}
            L ${cx + tw/2},${by}
            A ${tr},${tr} 0 0 1 ${cx + tw/2 + tr},${by + tr}
            L ${cx + tw/2 + tr},${by + ts - tr}
            A ${tr},${tr} 0 0 1 ${cx + tw/2},${by + ts}
            L ${cx - tw/2},${by + ts}
            A ${tr},${tr} 0 0 1 ${cx - tw/2 - tr},${by + ts - tr}
            L ${cx - tw/2 - tr},${by + tr}
            A ${tr},${tr} 0 0 1 ${cx - tw/2},${by}
            L ${r},${by} A ${r},${r} 0 0 1 0,${by-r}
            L 0,${r} A ${r},${r} 0 0 1 ${r},0 Z
        `.replace(/\s+/g, ' ').trim();
    }
    else if (tabPosition === 'top') {
        svgH = height + ts;
        const cx = width / 2;
        const ty = ts;
        pathD = `
            M ${r},${ty}
            L ${cx - tw/2},${ty}
            A ${tr},${tr} 0 0 1 ${cx - tw/2 - tr},${ty - tr}
            L ${cx - tw/2 - tr},${tr}
            A ${tr},${tr} 0 0 1 ${cx - tw/2},0
            L ${cx + tw/2},0
            A ${tr},${tr} 0 0 1 ${cx + tw/2 + tr},${tr}
            L ${cx + tw/2 + tr},${ty - tr}
            A ${tr},${tr} 0 0 1 ${cx + tw/2},${ty}
            L ${width-r},${ty} A ${r},${r} 0 0 1 ${width},${ty+r}
            L ${width},${ty+height-r} A ${r},${r} 0 0 1 ${width-r},${ty+height}
            L ${r},${ty+height} A ${r},${r} 0 0 1 0,${ty+height-r}
            L 0,${ty+r} A ${r},${r} 0 0 1 ${r},${ty} Z
        `.replace(/\s+/g, ' ').trim();
    }
    else if (tabPosition === 'right') {
        svgW = width + ts;
        const cy = height / 2;
        const rx = width;
        pathD = `
            M ${r},0
            L ${rx-r},0 A ${r},${r} 0 0 1 ${rx},${r}
            L ${rx},${cy - tw/2}
            A ${tr},${tr} 0 0 1 ${rx + tr},${cy - tw/2 - tr}
            L ${rx + ts - tr},${cy - tw/2 - tr}
            A ${tr},${tr} 0 0 1 ${rx + ts},${cy - tw/2}
            L ${rx + ts},${cy + tw/2}
            A ${tr},${tr} 0 0 1 ${rx + ts - tr},${cy + tw/2 + tr}
            L ${rx + tr},${cy + tw/2 + tr}
            A ${tr},${tr} 0 0 1 ${rx},${cy + tw/2}
            L ${rx},${height-r} A ${r},${r} 0 0 1 ${rx-r},${height}
            L ${r},${height} A ${r},${r} 0 0 1 0,${height-r}
            L 0,${r} A ${r},${r} 0 0 1 ${r},0 Z
        `.replace(/\s+/g, ' ').trim();
    }
    else if (tabPosition === 'left') {
        svgW = width + ts;
        const cy = height / 2;
        pathD = `
            M ${ts + r},0
            L ${ts + width - r},0 A ${r},${r} 0 0 1 ${ts + width},${r}
            L ${ts + width},${height-r} A ${r},${r} 0 0 1 ${ts + width - r},${height}
            L ${ts + r},${height} A ${r},${r} 0 0 1 ${ts},${height-r}
            L ${ts},${cy + tw/2}
            A ${tr},${tr} 0 0 1 ${ts - tr},${cy + tw/2 + tr}
            L ${tr},${cy + tw/2 + tr}
            A ${tr},${tr} 0 0 1 0,${cy + tw/2}
            L 0,${cy - tw/2}
            A ${tr},${tr} 0 0 1 ${tr},${cy - tw/2 - tr}
            L ${ts - tr},${cy - tw/2 - tr}
            A ${tr},${tr} 0 0 1 ${ts},${cy - tw/2}
            L ${ts},${r} A ${r},${r} 0 0 1 ${ts + r},0 Z
        `.replace(/\s+/g, ' ').trim();
    }

    return (
        <motion.div ref={ref} className={`relative flex items-center justify-center ${className}`} {...props}>
            <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="none"
                className={`absolute inset-0 w-full h-full drop-shadow-lg filter ${colorClass}`}
            >
                <path d={pathD} fill="currentColor" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
                {/* Subtle top highlight for 3D glass effect */}
                <path d={pathD} fill="url(#jigsawHighlight)" opacity="0.12" />
                <defs>
                    <linearGradient id="jigsawHighlight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="1" />
                        <stop offset="40%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
            <div className={`relative z-10 w-full h-full flex flex-col ${contentClassName}`}>
                {children as React.ReactNode}
            </div>
        </motion.div>
    );
});

JigsawBlock.displayName = 'JigsawBlock';
