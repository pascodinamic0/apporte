import type { Availability, WeekHours } from "./hours";

export type UserRole = "customer" | "merchant" | "rider" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  merchantId?: string;
  riderId?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  cuisine: string;
  etaMinutes: number; // estimated prep + pickup buffer
  rating: number; // 1-5
  imageUrl?: string;
  zone: string;
  latitude: number;
  longitude: number;
  /** Open right now (hours + pause switch + not suspended). */
  isOpen: boolean;
  acceptingOrders?: boolean;
  hours?: WeekHours;
  suspended?: boolean;
  commissionPct?: number | null;
  phone?: string;
  availability?: Availability;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  priceUsd: number;
  available: boolean;
  imageUrl?: string;
  cuisineTag?: string;
  category?: string;
  sortOrder?: number;
}

export interface SmartFindProduct {
  id: string;
  name: string;
  description?: string;
  priceUsd: number;
  stock: number;
  category: "Automotive" | "Mobile & Tech" | "Home" | "Lifestyle";
  imageUrl?: string;
  tags?: string[];
}

export type RiderStatus = "offline" | "online" | "busy";

export interface Rider {
  id: string;
  name: string;
  status: RiderStatus;
  reliabilityPercent: number; // 0..100
  latitude: number;
  longitude: number;
  earningsTodayUsd: number;
  suspended?: boolean;
  phone?: string; // E.164, +243XXXXXXXXX
  email?: string;
}

export type OrderStatus =
  | "placed"
  | "restaurant_accepted"
  | "preparing"
  | "rider_searching"
  | "rider_assigned"
  | "going_to_restaurant"
  | "arrived"
  | "picked_up"
  | "delivering"
  | "arrived_at_customer"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "Mobile Money" | "Cash on delivery" | "Card";

/** unpaid = cash on delivery, not collected yet. paid = money already taken (cannot refuse). */
export type PaymentStatus = "unpaid" | "paid";

export type OrderItemKind = "food" | "smart_find";

export interface OrderItem {
  id: string;
  kind: OrderItemKind;
  restaurantId?: string;
  menuItemId?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
  imageUrl?: string;
}

export interface Rating {
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: number;
}

export interface SupportNote {
  id: string;
  orderId: string;
  note: string;
  createdBy: string; // user id or 'admin'
  createdAt: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId?: string; // food anchor; smart-find-only orders allowed
  riderId?: string;
  items: OrderItem[];
  subtotalUsd: number;
  deliveryFeeUsd: number;
  totalUsd: number;
  address: string;
  addressNotes?: string; // landmark / instructions for the rider
  customerPhone?: string; // E.164, +243XXXXXXXXX
  zone: string; // e.g., Gombe
  paymentMethod: PaymentMethod;
  /** Missing means unpaid (orders created before the column existed). */
  paymentStatus?: PaymentStatus;
  status: OrderStatus;
  pin: string; // delivery confirmation
  createdAt: number;
  updatedAt: number;
  rating?: Rating;
  supportNotes?: SupportNote[];
  commissionUsd?: number;
  riderEarningUsd?: number;
  vatUsd?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  cancelReason?: string;
  cancelledBy?: string;
  refundFlag?: boolean;
  refundNote?: string;
  prepMinutes?: number;
  acceptedAt?: number;
  deliveredAt?: number;
  /** Set when an admin has marked this delivery's rider share as paid out. */
  riderPaidAt?: number;
}

export type MobileMoneyProvider = "mpesa" | "airtel" | "orange" | "africell" | "mobile";
export type RiderPayoutStatus = "requested" | "paid" | "rejected";

/** A rider's request to receive pending earnings on a Mobile Money number. */
export interface RiderPayout {
  id: string;
  riderId: string;
  amountUsd: number;
  orderIds: string[];
  phone: string;
  provider: MobileMoneyProvider;
  status: RiderPayoutStatus;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
}

export type SupportPriority = "normal" | "urgent";
export type SupportRequestStatus = "open" | "in_progress" | "resolved";

export interface SupportRequest {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  topic: string;
  message: string;
  orderId?: string;
  priority: SupportPriority;
  status: SupportRequestStatus;
  createdAt: number;
  updatedAt: number;
}

export interface DispatchOffer {
  orderId: string;
  orderRef: string;
  riderId: string;
  pickupDistanceKm: number;
  deliveryDistanceKm: number;
  etaMinutes: number;
  deliveryFeeUsd: number;
  earningsUsd: number;
  expiresAt: number; // epoch ms
  deliveryAddress?: string;
  deliveryZone?: string;
  firstItemName?: string;
  firstItemImageUrl?: string;
  pickupName?: string;
  pickupZone?: string;
}

