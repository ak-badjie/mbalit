import { WasteType, WasteTypeInfo, ContainerType, ContainerInfo, PriceEstimate } from '@/types';

// =====================================
// CONTAINER TYPES (New Pricing System)
// =====================================

// Container pricing - NO distance factoring
export const CONTAINER_PRICES = {
    bucket: 25,      // D25 per small bucket (~10L)
    large_bin: 500,  // D500 per large bin (~200L)
};

export const CONTAINER_TYPES: ContainerInfo[] = [
    {
        id: 'bucket',
        name: 'Small Bucket',
        description: 'Standard small bucket/pail for regular household waste',
        capacity: '10L',
        pricePerUnit: CONTAINER_PRICES.bucket,
        icon: '🪣',
    },
    {
        id: 'large_bin',
        name: 'Large Trash Bin',
        description: 'Large wheelie bin or trash container',
        capacity: '200L',
        pricePerUnit: CONTAINER_PRICES.large_bin,
        icon: '🗑️',
    },
];

// =====================================
// WASTE TYPES (Categories - no price multiplier in new system)
// =====================================

export const WASTE_TYPES: WasteTypeInfo[] = [
    {
        id: 'household',
        name: 'Household Waste',
        description: 'General household items, furniture, appliances',
        icon: '🏠',
        priceMultiplier: 1.0, // Legacy, not used in new pricing
        color: '#10b981',
    },
    {
        id: 'kitchen',
        name: 'Kitchen Waste',
        description: 'Food waste, organic materials, kitchen scraps',
        icon: '🍳',
        priceMultiplier: 1.0,
        color: '#f59e0b',
    },
    {
        id: 'chemical',
        name: 'Chemical Waste',
        description: 'Paints, solvents, cleaning products',
        icon: '⚗️',
        priceMultiplier: 1.0,
        color: '#ef4444',
    },
    {
        id: 'electronic',
        name: 'Electronic Waste',
        description: 'Computers, phones, TVs, electronic devices',
        icon: '📱',
        priceMultiplier: 1.0,
        color: '#8b5cf6',
    },
    {
        id: 'construction',
        name: 'Construction Waste',
        description: 'Building materials, debris, renovation waste',
        icon: '🏗️',
        priceMultiplier: 1.0,
        color: '#6b7280',
    },
    {
        id: 'garden',
        name: 'Garden Waste',
        description: 'Leaves, branches, grass clippings',
        icon: '🌿',
        priceMultiplier: 1.0,
        color: '#22c55e',
    },
    {
        id: 'medical',
        name: 'Medical Waste',
        description: 'Medical supplies, equipment (non-hazardous)',
        icon: '🏥',
        priceMultiplier: 1.0,
        color: '#ec4899',
    },
    {
        id: 'recyclable',
        name: 'Recyclable Waste',
        description: 'Paper, cardboard, plastics, glass, metals',
        icon: '♻️',
        priceMultiplier: 1.0,
        color: '#06b6d4',
    },
];

// =====================================
// PRICING CONFIGURATION
// =====================================

export const PRICING = {
    bucketPrice: CONTAINER_PRICES.bucket,      // D25
    largeBinPrice: CONTAINER_PRICES.large_bin, // D500
    currency: 'GMD',
    currencySymbol: 'D',
    minPrice: 25,       // Minimum is 1 bucket
    maxBuckets: 50,     // Max buckets per request
    maxLargeBins: 20,   // Max large bins per request
    // Platform fee split
    platformFeePercentage: 0.30,  // 30% platform
    collectorSharePercentage: 0.70, // 70% collector
};

// =====================================
// HELPER FUNCTIONS
// =====================================

// Get container info by ID
export const getContainerType = (id: ContainerType): ContainerInfo | undefined => {
    return CONTAINER_TYPES.find((type) => type.id === id);
};

// Get waste type by ID
export const getWasteType = (id: WasteType): WasteTypeInfo | undefined => {
    return WASTE_TYPES.find((type) => type.id === id);
};

// Calculate price from container quantities (NEW - no distance)
export const calculatePrice = (
    bucketCount: number,
    largeBinCount: number
): PriceEstimate => {
    const bucketCost = bucketCount * PRICING.bucketPrice;
    const largeBinCost = largeBinCount * PRICING.largeBinPrice;
    const totalPrice = bucketCost + largeBinCost;

    return {
        bucketCount,
        bucketCost,
        largeBinCount,
        largeBinCost,
        totalPrice: Math.max(PRICING.minPrice, totalPrice),
        currency: PRICING.currency,
    };
};

// Calculate collector's share (70%)
export const calculateCollectorShare = (totalAmount: number): number => {
    return Math.round(totalAmount * PRICING.collectorSharePercentage);
};

// Calculate platform fee (30%)
export const calculatePlatformFee = (totalAmount: number): number => {
    return Math.round(totalAmount * PRICING.platformFeePercentage);
};

// Format price for display
export const formatPrice = (price: number): string => {
    return `${PRICING.currencySymbol}${price.toLocaleString()}`;
};

// Convert large bins to bucket equivalent (for display)
export const largeBinToBucketEquivalent = (largeBinCount: number): number => {
    // 1 large bin (200L) = 20 buckets (10L each)
    return largeBinCount * 20;
};

// =====================================
// SUBSCRIPTION PRICING
// =====================================

export const SUBSCRIPTION_PLANS = {
    weekly: {
        id: 'weekly',
        name: 'Weekly',
        pickupsPerMonth: 4,
        description: 'Collection once every week',
    },
    biweekly: {
        id: 'biweekly',
        name: 'Bi-Weekly',
        pickupsPerMonth: 2,
        description: 'Collection every two weeks',
    },
    monthly: {
        id: 'monthly',
        name: 'Monthly',
        pickupsPerMonth: 1,
        description: 'Collection once a month',
    },
};

// Calculate subscription price
export const calculateSubscriptionPrice = (
    bucketCount: number,
    largeBinCount: number,
    plan: 'weekly' | 'biweekly' | 'monthly'
): { pricePerPickup: number; totalMonthlyPrice: number } => {
    const pricePerPickup = calculatePrice(bucketCount, largeBinCount).totalPrice;
    const pickupsPerMonth = SUBSCRIPTION_PLANS[plan].pickupsPerMonth;
    const totalMonthlyPrice = pricePerPickup * pickupsPerMonth;

    return {
        pricePerPickup,
        totalMonthlyPrice,
    };
};

// =====================================
// LEGACY SUPPORT (for backwards compatibility)
// =====================================

import { WasteSize, WasteSizeInfo } from '@/types';

// Legacy waste sizes (deprecated, use container types instead)
export const WASTE_SIZES: WasteSizeInfo[] = [
    {
        id: 'small',
        name: 'Small',
        description: '1-2 buckets worth',
        estimatedWeight: 'Up to 10 kg',
        priceMultiplier: 1.0,
    },
    {
        id: 'medium',
        name: 'Medium',
        description: '3-5 buckets worth',
        estimatedWeight: '10 - 50 kg',
        priceMultiplier: 2.0,
    },
    {
        id: 'large',
        name: 'Large',
        description: '1-2 large bins',
        estimatedWeight: '50 - 150 kg',
        priceMultiplier: 5.0,
    },
    {
        id: 'extra-large',
        name: 'Extra Large',
        description: '3+ large bins',
        estimatedWeight: '150+ kg',
        priceMultiplier: 10.0,
    },
];

// Legacy function for backwards compatibility
export const getWasteSize = (id: WasteSize): WasteSizeInfo | undefined => {
    return WASTE_SIZES.find((size) => size.id === id);
};

// Legacy price calculation (deprecated)
export const calculateLegacyPrice = (
    wasteType: WasteType,
    wasteSize: WasteSize,
    _distanceKm: number = 0 // Ignored now
): number => {
    const sizeInfo = getWasteSize(wasteSize);

    if (!sizeInfo) {
        return PRICING.minPrice;
    }

    // Convert legacy size to approximate container count
    const bucketEquivalent = {
        'small': 2,
        'medium': 5,
        'large': 20,  // ~1 large bin
        'extra-large': 40, // ~2 large bins
    };

    const bucketCount = bucketEquivalent[wasteSize] || 2;
    return calculatePrice(bucketCount, 0).totalPrice;
};
