// TypeScript type definitions for Mbalit

// User Types
export type UserRole = 'user' | 'collector';

// Account types for users (not collectors)
export type AccountType = 'individual' | 'business' | 'corporate';

// Collector types
export type CollectorType = 'individual' | 'agency_owner' | 'agency_driver';

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
  onboardingComplete?: boolean;
  preferredAgencies?: string[]; // User's preferred agency IDs
  pin?: string; // App-specific PIN for phone number login
}

// User profile (individual, business, or corporate account)
export interface UserProfile extends User {
  role: 'user';
  accountType: AccountType;
  organizationName?: string;
  contactPerson?: string;
  activeOrders: string[];
  completedOrders: number;
  // Subscription
  activeSubscriptionId?: string;
}

export interface Customer extends User {
  role: 'user';
  activeRequests: string[];
  completedRequests: number;
}

export interface Collector extends User {
  role: 'collector';
  collectorType: CollectorType;
  agencyId?: string; // If part of agency
  wasteTypesHandled: WasteType[];
  isAvailable: boolean;
  isApproved: boolean; // For agency drivers
  currentLocation?: GeoLocation;
  rating: number;
  totalPickups: number;
  earnings: number;
  vehicleType?: string;
  maxCapacity?: number;
}

// Agency (collection business with multiple drivers)
// Agency types - Companies are private businesses, Municipalities are government bodies
export type AgencyType = 'company' | 'municipality';

export interface Agency {
  id: string;
  name: string;
  ownerId: string;
  agencyCode: string; // 6-char code for joining
  agencyType: AgencyType; // Company or municipality
  drivers: string[]; // Approved driver IDs
  pendingDrivers: string[]; // Awaiting approval
  totalEarnings: number;
  walletBalance: number;
  isActive: boolean;
  description?: string;
  serviceAreas?: string[];
  rating?: number;
  totalPickups?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Agency subscription plan (created by agency owners)
export interface AgencySubscriptionPlan {
  id: string;
  agencyId: string;
  name: string; // e.g., "Weekly Standard", "Monthly Premium"
  description?: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  bucketCount: number;
  trashBagCount: number;
  largeBinCount: number;
  price: number; // Total price set by agency
  platformFee: number; // 30% of price
  agencyEarnings: number; // 70% of price
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User subscription to an agency plan
export interface UserAgencySubscription {
  id: string;
  userId: string;
  agencyId: string;
  planId: string;
  planName: string;
  status: 'active' | 'paused' | 'cancelled';
  nextPickupDate: Date;
  pickupsCompleted: number;
  totalPaid: number;
  startedAt: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
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
  priceMultiplier: number;
  color: string;
}

// Container Types (replaces WasteSize)
export type ContainerType = 'bucket' | 'trash_bag' | 'large_bin';

export interface ContainerInfo {
  id: ContainerType;
  name: string;
  description: string;
  capacity: string; // e.g., "10L", "200L"
  pricePerUnit: number; // D25 or D500
  icon: string;
}

// Legacy support - keeping WasteSize for backwards compatibility
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

// Pickup Request Status
export type RequestStatus =
  | 'pending'         // Just created, looking for collector
  | 'assigned'        // Collector assigned
  | 'in_progress'     // Collector on the way
  | 'arrived'         // Collector arrived at location
  | 'awaiting_payment'// Trash handed over, waiting for payment
  | 'completed'       // Payment done, request complete
  | 'cancelled';      // Request cancelled

// Pickup Request
export interface PickupRequest {
  id: string;
  customerId: string;
  collectorId?: string;
  agencyId?: string; // If handled by agency driver

  // Waste details
  wasteType: WasteType;
  description?: string;
  images?: string[];

  // Container quantities (new system)
  bucketCount: number;      // Number of small buckets (D25 each)
  largeBinCount: number;    // Number of large bins (D500 each)

  // Legacy field for backwards compatibility
  wasteSize?: WasteSize;

  // Location
  pickupLocation: GeoLocation;

  // Pricing
  estimatedPrice: number;   // Calculated from containers
  tipAmount: number;        // Customer tip
  adjustedPrice?: number;   // If price was negotiated
  finalPrice?: number;      // Final paid amount
  platformFee?: number;     // 30% platform cut
  collectorEarnings?: number; // 70% collector share

  // Status
  status: RequestStatus;

  // Timestamps
  createdAt: Date;
  assignedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;

  // Tracking
  collectorLocation?: GeoLocation;
  estimatedArrival?: Date;
}

// Payment Offer (real-time negotiation)
export type PaymentOfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface PaymentOffer {
  id: string;
  requestId: string;
  customerId: string;
  collectorId: string;
  baseAmount: number;
  tipAmount: number;
  totalAmount: number;
  status: PaymentOfferStatus;
  rejectionReason?: string;
  createdAt: Date;
  respondedAt?: Date;
}

// Payment
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  requestId: string;
  customerId: string;
  collectorId: string;
  agencyId?: string;

  amount: number;
  tipAmount: number;
  platformFee: number;      // 30%
  collectorAmount: number;  // 70%
  currency: string;

  status: PaymentStatus;
  method: 'wave' | 'orange_money' | 'qmoney' | 'afrimoney' | 'card';

  transactionId?: string;

  createdAt: Date;
  completedAt?: Date;
}

// Subscription
export type SubscriptionPlan = 'weekly' | 'biweekly' | 'monthly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  customerId: string;
  collectorId?: string;  // Assigned collector
  agencyId?: string;     // Or assigned agency

  // Plan details
  plan: SubscriptionPlan;
  bucketCount: number;
  largeBinCount: number;
  pricePerPickup: number;
  pickupsPerMonth: number; // 4 for weekly, 2 for biweekly, 1 for monthly
  totalMonthlyPrice: number;

  // Collection schedule
  preferredDay?: string; // 'monday', 'tuesday', etc.
  preferredTime?: string; // 'morning', 'afternoon', 'evening'

  status: SubscriptionStatus;
  nextPickupDate?: Date;
  lastPickupDate?: Date;

  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'payment_offer' | 'pickup_reminder';
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
  bucketCount: number;
  bucketCost: number;
  trashBagCount: number;
  trashBagCost: number;
  largeBinCount: number;
  largeBinCost: number;
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
  maxDistance: number;
  preferredWasteTypes: WasteType[];
  darkMode: boolean;
  language: 'en' | 'wo' | 'ff';
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
  // Agency info
  collectorType: CollectorType;
  agencyId?: string;
  agencyName?: string;
}

// Review (bidirectional)
export interface Review {
  id: string;
  jobId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  toUserId: string;
  toUserName: string;
  rating: number;
  comment: string;
  isCollectorReview: boolean;
  createdAt: Date;
  response?: string;
  responseAt?: Date;
}

// Platform Fee Constants
export const PLATFORM_FEE_PERCENTAGE = 0.30; // 30%
export const COLLECTOR_SHARE_PERCENTAGE = 0.70; // 70%

