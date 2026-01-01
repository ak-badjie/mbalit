'use client';

import React, { createContext, useContext } from 'react';

// Simplified theme context - light mode only
interface ThemeContextType {
    theme: 'light';
    resolvedTheme: 'light';
    setTheme: (theme: 'light') => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Always light mode - no dark mode support
    const value: ThemeContextType = {
        theme: 'light',
        resolvedTheme: 'light',
        setTheme: () => { }, // No-op, always light
        toggleTheme: () => { }, // No-op, always light
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeProvider;
