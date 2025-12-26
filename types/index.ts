// TypeScript type definitions for Mbalit

// User Types
export type UserRole = 'customer' | 'collector';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  location?: GeoLocation;
  profileImage?: string;
  onboardingComplete?: boolean; // Whether user has finished full onboarding
}

export interface Customer extends User {
  role: 'customer';
  activeRequests: string[]; // Request IDs
  completedRequests: number;
}

export interface Collector extends User {
  role: 'collector';
  wasteTypesHandled: WasteType[];
  isAvailable: boolean;
  currentLocation?: GeoLocation;
  rating: number;
  totalPickups: number;
  earnings: number;
  vehicleType?: string; // motorcycle, small, pickup, truck
  maxCapacity?: number; // in kg
}

// Waste Types
export type WasteType =
  | 'household'
  | 'kitchen'
  | 'chemical'
  | 'electronic'
  | 'construction'
  | 'garden'
  | 'medical'
  | 'recyclable';

export interface WasteTypeInfo {
  id: WasteType;
  name: string;
  description: string;
  icon: string;
  priceMultiplier: number; // Base price multiplier
  color: string;
}

// Waste Size
export type WasteSize = 'small' | 'medium' | 'large' | 'extra-large';

export interface WasteSizeInfo {
  id: WasteSize;
  name: string;
  description: string;
  estimatedWeight: string;
  priceMultiplier: number;
}

// Location
export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  formattedAddress?: string;
}

// Pickup Request
export type RequestStatus =
  | 'pending'      // Just created, looking for collector
  | 'assigned'     // Collector assigned
  | 'in_progress'  // Collector on the way
  | 'arrived'      // Collector arrived
  | 'completed'    // Pickup completed
  | 'cancelled';   // Request cancelled

export interface PickupRequest {
  id: string;
  customerId: string;
  collectorId?: string;

  // Waste details
  wasteType: WasteType;
  wasteSize: WasteSize;
  description?: string;
  images?: string[];

  // Location
  pickupLocation: GeoLocation;

  // Pricing
  estimatedPrice: number;
  finalPrice?: number;
  distance?: number; // in km

  // Status
  status: RequestStatus;

  // Timestamps
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;

  // Tracking
  collectorLocation?: GeoLocation;
  estimatedArrival?: Date;
}

// Payment
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  requestId: string;
  customerId: string;
  collectorId: string;

  amount: number;
  currency: string; // GMD - Gambian Dalasi

  status: PaymentStatus;
  method: 'modernpay' | 'wave' | 'card';

  transactionId?: string;

  createdAt: Date;
  completedAt?: Date;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  data?: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pricing calculation
export interface PriceEstimate {
  basePrice: number;
  distanceCost: number;
  wasteTypeCost: number;
  sizeCost: number;
  totalPrice: number;
  currency: string;
}

// Collector Stats
export interface CollectorStats {
  todayPickups: number;
  todayEarnings: number;
  weeklyPickups: number;
  weeklyEarnings: number;
  monthlyPickups: number;
  monthlyEarnings: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  hoursOnlineToday: number;
  acceptanceRate: number;
  completionRate: number;
}

// Collector Settings
export interface CollectorSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoAcceptJobs: boolean;
  maxDistance: number; // in km
  preferredWasteTypes: WasteType[];
  darkMode: boolean;
  language: 'en' | 'wo' | 'ff'; // English, Wolof, Fula
}

// Collector Profile
export interface CollectorProfile {
  id: string;
  displayName: string;
  bio: string;
  profileImage?: string;
  phone: string;
  email: string;
  preciseLocation: GeoLocation;
  wasteTypesHandled: WasteType[];
  vehicleType: 'bicycle' | 'motorcycle' | 'tricycle' | 'truck';
  vehicleCapacity: string;
  isVerified: boolean;
  documentsSubmitted: boolean;
  joinedAt: Date;
}

// Review (bidirectional - customer <-> collector)
export interface Review {
  id: string;
  jobId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  toUserId: string;
  toUserName: string;
  rating: number; // 1-5
  comment: string;
  isCollectorReview: boolean; // true = collector reviewing customer
  createdAt: Date;
  response?: string; // optional reply
  responseAt?: Date;
}
