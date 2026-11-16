export type BakeryCategory =
  | 'Cakes'
  | 'Pastries'
  | 'Breads'
  | 'Puffs & Rolls'
  | 'Cookies & Biscuits'
  | 'Indian Sweets'
  | 'Savouries'
  | 'Beverages';

export type LegacyBakeryCategory =
  | 'Irani Chai & Cafe'
  | 'Buns & Loaves'
  | 'Puffs & Pastries'
  | 'Cakes & Tarts'
  | 'Gift & Morning Boxes';

export type ProductCategory = BakeryCategory | LegacyBakeryCategory;

export type VegType = 'veg' | 'egg' | 'non_veg';

export type DietaryTag = 'Vegan' | 'Vegetarian' | 'Nut-Free';

export type CurrencySymbol = '₹' | '$' | '£' | 'AED';

export interface ProductOption {
  id: string;
  label: string;
  priceDelta: number;
  weightLabel: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  offerLabel?: string;
  weight: string;
  bakeTime: string;
  shortDescription: string;
  fullDescription: string;
  ingredients: string[];
  allergens: string;
  dietary: DietaryTag[];
  vegType?: VegType;
  isBestSeller?: boolean;
  isTodaysSpecial?: boolean;
  isRecommended?: boolean;
  isCakeCustomizable?: boolean;
  rating?: number;
  reviewCount?: number;
  reheatTip: string;
  image: string;
  featuredNote?: string;
  inStock: boolean;
  options: ProductOption[];
}

export interface CakeCustomization {
  occasion: string;
  flavor: string;
  eggless: boolean;
  messageOnCake: string;
  designNote: string;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  category: ProductCategory;
  image: string;
  optionId: string;
  optionLabel: string;
  customizationSummary?: string;
  unitPrice: number;
  quantity: number;
}

export interface DeliverySlot {
  id: string;
  label: string;
  window: string;
  cutoffNote: string;
  spotsRemaining: number;
}

export interface DeliveryZone {
  postalPrefix: string;
  neighborhood: string;
  etaMinutes: string;
  fee: number;
}

export interface PromoCodeOffer {
  id: string;
  code: string;
  title: string;
  discountType: 'percent' | 'flat';
  value: number;
  minOrder: number;
  active: boolean;
}

export interface FestivalBanner {
  active: boolean;
  campaignName: string;
  headline: string;
  promoCode: string;
}

export interface BakerySettings {
  bakeryName: string;
  tagline: string;
  address: string;
  phone: string;
  secondaryPhone: string;
  currency: CurrencySymbol;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  taxPercent?: number;
  deliverySlots: DeliverySlot[];
  deliveryZones: DeliveryZone[];
  festivalBanner: FestivalBanner;
  promoCodes: PromoCodeOffer[];
  upiId?: string;
}

export type PaymentMethod =
  | 'card_on_delivery'
  | 'cash_on_delivery'
  | 'upi_prepaid'
  | 'online_card';

export type PaymentStatus = 'pending' | 'verification_pending' | 'verified' | 'paid';

export type OrderStage =
  | 'confirmed'
  | 'baking'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered';

export interface OrderCustomerDetails {
  fullName: string;
  phone: string;
  streetAddress: string;
  apartment: string;
  postalCode: string;
  instructions: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  streetAddress: string;
  apartment: string;
  postalCode: string;
  instructions: string;
}

export interface CustomerProfile {
  uid: string;
  email?: string;
  fullName: string;
  phone?: string;
  streetAddress?: string;
  apartment?: string;
  postalCode?: string;
  instructions?: string;
  wishlist?: string[];
  savedAddresses?: SavedAddress[];
}

export interface Order {
  id: string;
  customerId: string;
  customerEmail?: string;
  createdAtLabel: string;
  deliveryDay: 'Today' | 'Tomorrow';
  deliveryWindow: string;
  neighborhood: string;
  customer: OrderCustomerDetails;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  upiReference?: string;
  items: CartItem[];
  subtotal: number;
  discount?: number;
  promoCode?: string;
  tax?: number;
  deliveryFee: number;
  tip: number;
  total: number;
  stage: OrderStage;
  courierName: string;
  note?: string;
}

export interface OwnerAccount {
  id: string;
  email: string;
  label?: string;
  addedBy?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
}
