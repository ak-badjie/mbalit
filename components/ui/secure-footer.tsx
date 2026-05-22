'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export const SecureFooter: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex items-center justify-center gap-2 text-xs text-gray-500 ${className}`}>
        <Shield className="w-4 h-4 text-[#0E7A3B]" />
        <span>Your data is secure and protected</span>
    </div>
);

export default SecureFooter;
