/* Shared domain types for the Sofora store. */

export type SofaType = "three" | "corner" | "chair" | "sofa-bed";

export interface Product {
  id: string;
  slug: string;
  name: string;
  sub: string; // short descriptor, e.g. "Easy-clean oat weave"
  description: string;
  price: number; // GBP
  wasPrice?: number; // GBP, when on sale
  category: string; // category slug
  type: SofaType; // drives the illustration
  fabric: string; // illustration fabric colour
  fabricName?: string;
  bg: string; // illustration backdrop colour
  accent: string; // illustration accent colour
  tag?: string; // badge, e.g. "Save £250"
  imageUrl?: string; // optional product photography; falls back to the sofa illustration
  colorImages?: Record<string, string>; // per-colourway photos, keyed by colour name
  sku?: string;
  seats?: number; // 1, 2, 3, 4 (4 = 4+ seater)
  fabricType?: string; // "Easy-clean weave" | "Velvet" | "Jumbo cord" | "Bouclé"
  colourName?: string; // "Oat" | "Sage" | "Charcoal" | "Terracotta" | "Navy" | "Mink" | "Blush" | "Mustard"
  features?: string[]; // e.g. ["Sofa bed", "Reclining", "Storage"]
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  featured?: boolean;
  details?: string[]; // bullet specs
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  type: SofaType;
  fabric: string;
  bg: string;
  blurb?: string;
  menu?: string; // navbar menu group label, e.g. "Sofas" — categories without one don't appear in the nav
  imageUrl?: string; // optional category photo (device upload → Cloudinary); falls back to the illustration
}

/* Managed colour library (Admin → Colors). A colour is either a hex swatch,
   an uploaded swatch image, or both. Products reference colours by name. */
export interface Color {
  id: string;
  name: string;
  hex?: string; // e.g. "#D8CBB4"
  imageUrl?: string; // optional swatch photo (device upload → Cloudinary)
  createdAt: string;
  updatedAt: string;
}

export interface BasketItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  fabric: string;
  bg: string;
  type: SofaType;
}

export type OrderStatus =
  | "new"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refused";

export interface Order {
  id: string;
  number: string; // human-friendly, e.g. "SOF-1024"
  /** Unguessable per-order token. The public order-confirmation page must
      present it (?t=...) to read the order — order numbers are sequential
      and must not be enumerable. Never expose to anyone except the buyer
      at checkout time (and the admin). */
  publicToken: string;
  items: BasketItem[];
  subtotal: number;
  deliveryFee: number;
  discount?: number; // coupon discount applied (GBP)
  couponCode?: string; // coupon code used, if any
  total: number; // amount due on delivery (COD)
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    postcode: string;
    notes?: string;
  };
  deliverySlot?: string;
  paymentMethod: "cash" | "card" | "bank_transfer";
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  timeline: { status: OrderStatus; at: string; note?: string }[];
}

export interface Faq {
  id: string;
  q: string;
  a: string;
  order: number;
}

export interface Review {
  id: string;
  quote: string;
  author: string;
  location: string;
  rating: number;
  order: number;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string; // 150-160 chars, used for cards + meta description fallback
  content: string; // HTML string, sanitized on render
  coverColor?: string | null; // hex for the branded card/hero gradient, e.g. "#EFE8DC"
  tags: string[];
  status: "published" | "draft";
  metaTitle?: string;
  metaDescription?: string;
  publishedAt: string; // ISO
  updatedAt: string; // ISO
  readingMinutes: number;
  authorName: string; // default "Sofora Team"
  faqJson?: { q: string; a: string }[]; // optional FAQ schema for the article
}

export interface SiteSettings {  announcementBar: string[];
  freeDeliveryThreshold: number;
  acceptedPayments: ("cash" | "card" | "bank_transfer")[];
  deliveryTimeText: string;
  confirmationCallText: string;
  refusalPolicy: string;
  phone: string;
  email: string;
  address: string;
  trustpilotRating: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refused: "Refused at door",
};

export const PAYMENT_METHOD_LABELS: Record<Order["paymentMethod"], string> = {
  cash: "Cash",
  card: "Card machine",
  bank_transfer: "Bank transfer",
};

/* Customer query from the contact page form (Admin → Queries). */
export type QueryStatus = "new" | "read" | "replied";

export interface ContactQuery {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: QueryStatus;
  reply?: string; // admin's reply (shown in admin; emailed when configured)
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const QUERY_STATUS_LABELS: Record<QueryStatus, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
};

/* Discount coupon (Admin → Coupons). */
export interface Coupon {
  id: string;
  code: string; // uppercase, e.g. "WELCOME10"
  type: "percent" | "fixed";
  value: number; // percent (1-90) or fixed GBP amount
  minSubtotal?: number; // minimum basket subtotal in GBP
  maxUses?: number; // total redemptions allowed
  usedCount: number;
  startsAt?: string; // ISO, optional
  endsAt?: string; // ISO, optional
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/* Flash sale banner (Admin → Flash sales). The currently-active one shows
   as a prominent banner on the homepage. */
export interface FlashSale {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string; // banner image (device upload → Cloudinary)
  linkUrl?: string; // e.g. "/sofas?sale=1"
  linkLabel?: string; // CTA text, e.g. "Shop the sale"
  startsAt?: string; // ISO, optional
  endsAt?: string; // ISO, optional
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
