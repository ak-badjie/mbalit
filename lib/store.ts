'use client';

import { create } from 'zustand';
import { GeoLocation, WasteType, WasteSize, PickupRequest, User, Collector, Notification } from '@/types';

// App State Store
interface AppState {
    // User state
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Location
    currentLocation: GeoLocation | null;
    isLocating: boolean;
    locationError: string | null;

    // Request flow
    selectedWasteType: WasteType | null;
    selectedWasteSize: WasteSize | null;
    pickupLocation: GeoLocation | null;
    estimatedPrice: number | null;

    // Active request
    activeRequest: PickupRequest | null;
    assignedCollector: Collector | null;

    // Notifications
    notifications: Notification[];

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setCurrentLocation: (location: GeoLocation | null) => void;
    setLocating: (locating: boolean) => void;
    setLocationError: (error: string | null) => void;
    setSelectedWasteType: (type: WasteType | null) => void;
    setSelectedWasteSize: (size: WasteSize | null) => void;
    setPickupLocation: (location: GeoLocation | null) => void;
    setEstimatedPrice: (price: number | null) => void;
    setActiveRequest: (request: PickupRequest | null) => void;
    setAssignedCollector: (collector: Collector | null) => void;
    addNotification: (notification: Notification) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
    resetRequestFlow: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: true,

    currentLocation: null,
    isLocating: false,
    locationError: null,

    selectedWasteType: null,
    selectedWasteSize: null,
    pickupLocation: null,
    estimatedPrice: null,

    activeRequest: null,
    assignedCollector: null,

    notifications: [],

    // Actions
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setLoading: (isLoading) => set({ isLoading }),
    setCurrentLocation: (currentLocation) => set({ currentLocation }),
    setLocating: (isLocating) => set({ isLocating }),
    setLocationError: (locationError) => set({ locationError }),
    setSelectedWasteType: (selectedWasteType) => set({ selectedWasteType }),
    setSelectedWasteSize: (selectedWasteSize) => set({ selectedWasteSize }),
    setPickupLocation: (pickupLocation) => set({ pickupLocation }),
    setEstimatedPrice: (estimatedPrice) => set({ estimatedPrice }),
    setActiveRequest: (activeRequest) => set({ activeRequest }),
    setAssignedCollector: (assignedCollector) => set({ assignedCollector }),

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 10),
        })),

    removeNotification: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),

    clearNotifications: () => set({ notifications: [] }),

    resetRequestFlow: () =>
        set({
            selectedWasteType: null,
            selectedWasteSize: null,
            pickupLocation: null,
            estimatedPrice: null,
        }),
}));

export default useAppStore;
