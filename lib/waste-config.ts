import { WasteType, WasteTypeInfo, WasteSize, WasteSizeInfo } from '@/types';

// Waste Types Configuration
export const WASTE_TYPES: WasteTypeInfo[] = [
    {
        id: 'household',
        name: 'Household Waste',
        description: 'General household items, furniture, appliances',
        icon: '🏠',
        priceMultiplier: 1.0,
        color: '#10b981',
    },
    {
        id: 'kitchen',
        name: 'Kitchen Waste',
        description: 'Food waste, organic materials, kitchen scraps',
        icon: '🍳',
        priceMultiplier: 1.2,
        color: '#f59e0b',
    },
    {
        id: 'chemical',
        name: 'Chemical Waste',
        description: 'Paints, solvents, cleaning products',
        icon: '⚗️',
        priceMultiplier: 2.0,
        color: '#ef4444',
    },
    {
        id: 'electronic',
        name: 'Electronic Waste',
        description: 'Computers, phones, TVs, electronic devices',
        icon: '📱',
        priceMultiplier: 1.5,
        color: '#8b5cf6',
    },
    {
        id: 'construction',
        name: 'Construction Waste',
        description: 'Building materials, debris, renovation waste',
        icon: '🏗️',
        priceMultiplier: 1.8,
        color: '#6b7280',
    },
    {
        id: 'garden',
        name: 'Garden Waste',
        description: 'Leaves, branches, grass clippings',
        icon: '🌿',
        priceMultiplier: 0.8,
        color: '#22c55e',
    },
    {
        id: 'medical',
        name: 'Medical Waste',
        description: 'Medical supplies, equipment (non-hazardous)',
        icon: '🏥',
        priceMultiplier: 2.5,
        color: '#ec4899',
    },
    {
        id: 'recyclable',
        name: 'Recyclable Waste',
        description: 'Paper, cardboard, plastics, glass, metals',
        icon: '♻️',
        priceMultiplier: 0.7,
        color: '#06b6d4',
    },
];

// Waste Sizes Configuration
export const WASTE_SIZES: WasteSizeInfo[] = [
    {
        id: 'small',
        name: 'Small',
        description: 'A few bags or small items',
        estimatedWeight: 'Up to 10 kg',
        priceMultiplier: 1.0,
    },
    {
        id: 'medium',
        name: 'Medium',
        description: 'Several bags or medium-sized items',
        estimatedWeight: '10 - 50 kg',
        priceMultiplier: 1.5,
    },
    {
        id: 'large',
        name: 'Large',
        description: 'Many bags or large items',
        estimatedWeight: '50 - 150 kg',
        priceMultiplier: 2.5,
    },
    {
        id: 'extra-large',
        name: 'Extra Large',
        description: 'Full room cleanup or very large items',
        estimatedWeight: '150+ kg',
        priceMultiplier: 4.0,
    },
];

// Pricing Configuration (in GMD - Gambian Dalasi)
export const PRICING = {
    baseFee: 50, // Base fee in GMD
    perKmRate: 10, // Rate per kilometer
    currency: 'GMD',
    currencySymbol: 'D',
    minPrice: 75,
    maxPrice: 5000,
};

// Get waste type by ID
export const getWasteType = (id: WasteType): WasteTypeInfo | undefined => {
    return WASTE_TYPES.find((type) => type.id === id);
};

// Get waste size by ID
export const getWasteSize = (id: WasteSize): WasteSizeInfo | undefined => {
    return WASTE_SIZES.find((size) => size.id === id);
};

// Calculate estimated price
export const calculatePrice = (
    wasteType: WasteType,
    wasteSize: WasteSize,
    distanceKm: number
): number => {
    const typeInfo = getWasteType(wasteType);
    const sizeInfo = getWasteSize(wasteSize);

    if (!typeInfo || !sizeInfo) {
        return PRICING.minPrice;
    }

    const typeMultiplier = typeInfo.priceMultiplier;
    const sizeMultiplier = sizeInfo.priceMultiplier;
    const distanceCost = distanceKm * PRICING.perKmRate;

    const totalPrice = Math.round(
        (PRICING.baseFee + distanceCost) * typeMultiplier * sizeMultiplier
    );

    return Math.max(PRICING.minPrice, Math.min(PRICING.maxPrice, totalPrice));
};

// Format price for display
export const formatPrice = (price: number): string => {
    return `${PRICING.currencySymbol}${price.toLocaleString()}`;
};
