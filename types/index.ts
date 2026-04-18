// TypeScript type definitions for Mbalit

// User Types
export type UserRole = 'user' | 'collector';

// Collector types (simplified)
export type CollectorType = 'individual' | 'organization' | 'organization_member';

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
  pin?: string; // App-specific PIN for phone number login
}

// User profile
export interface UserProfile extends User {
  role: 'user';
  activeOrders: string[];
  completedOrders: number;
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
  organizationId?: string; // If part of an organization
  organizationName?: string;
  orgCode?: string;
  wasteTypesHandled: WasteType[];
  isAvailable: boolean;
  isApproved: boolean; // For organization members
  currentLocation?: GeoLocation;
  rating: number;
  totalPickups: number;
  earnings: number;
  vehicleType?: string;
  maxCapacity?: number;
  // True for organizations that are public authorities (KMC, BCC, etc.)
  // and should receive environmental hazard reports from the community.
  isAuthority?: boolean;
}

// Organization (waste collection company)
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  orgCode: string; // Unique code for joining (like a username)
  members: string[]; // Approved member IDs
  pendingMembers: string[]; // Awaiting approval
  totalEarnings: number;
  walletBalance: number;
  isActive: boolean;
  description?: string;
  serviceAreas?: string[];
  rating?: number;
  totalPickups?: number;
  // True for organizations that are public authorities (KMC, BCC, etc.)
  // and should receive environmental hazard reports.
  isAuthority?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Environmental hazard report (community-submitted, acted on by authority orgs)
export type EnvironmentalReportStatus = 'pending' | 'in_progress' | 'resolved';

export interface EnvironmentalReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  photos: string[]; // base64 data URLs (compressed to fit Firestore 1MB doc limit)
  note: string;
  location: { lat: number; lng: number; address: string };
  status: EnvironmentalReportStatus;
  createdAt: Date;
  updatedAt: Date;
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
  capacity: string;
  pricePerUnit: number;
  icon: string;
}

// Legacy support
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
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'arrived'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled';

// Pickup Request
export interface PickupRequest {
  id: string;
  customerId: string;
  collectorId?: string;
  organizationId?: string;

  // Waste details
  wasteType: WasteType;
  description?: string;
  images?: string[];

  // Container quantities
  bucketCount: number;
  largeBinCount: number;

  // Legacy
  wasteSize?: WasteSize;

  // Location
  pickupLocation: GeoLocation;

  // Pricing
  estimatedPrice: number;
  tipAmount: number;
  adjustedPrice?: number;
  finalPrice?: number;
  platformFee?: number;
  collectorEarnings?: number;

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
  organizationId?: string;

  amount: number;
  tipAmount: number;
  platformFee: number;
  collectorAmount: number;
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
  collectorId?: string;
  organizationId?: string;

  plan: SubscriptionPlan;
  bucketCount: number;
  largeBinCount: number;
  pricePerPickup: number;
  pickupsPerMonth: number;
  totalMonthlyPrice: number;

  preferredDay?: string;
  preferredTime?: string;

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

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pricing
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
  collectorType: CollectorType;
  organizationId?: string;
  organizationName?: string;
}

// Review
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
