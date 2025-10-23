// ===== VENDURE TYPES =====

// Scalar Types
export type ID = string;
export type DateTime = string;
export type Money = number;
export type JSON = Record<string, any>;
export type LanguageCode = string;
export type CurrencyCode = string;

// Asset Types
export interface Asset {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  name: string;
  type: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  source: string;
  preview: string;
  focalPoint?: Coordinate;
  tags: Tag[];
  customFields?: JSON;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface Tag {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  value: string;
}

// Product Types
export interface Product {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  featuredAsset?: Asset;
  assets: Asset[];
  variants: ProductVariant[];
  optionGroups: ProductOptionGroup[];
  facetValues: FacetValue[];
  translations: ProductTranslation[];
  collections: Collection[];
  customFields?: JSON;
}

export interface ProductVariant {
  id: ID;
  product: Product;
  productId: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  sku: string;
  name: string;
  featuredAsset?: Asset;
  assets: Asset[];
  price: Money;
  currencyCode: CurrencyCode;
  priceWithTax: Money;
  stockLevel: string;
  taxRateApplied: TaxRate;
  taxCategory: TaxCategory;
  options: ProductOption[];
  facetValues: FacetValue[];
  translations: ProductVariantTranslation[];
  customFields?: JSON;
}

export interface ProductOptionGroup {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  code: string;
  name: string;
  options: ProductOption[];
  translations: ProductOptionGroupTranslation[];
  customFields?: JSON;
}

export interface ProductOption {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  code: string;
  name: string;
  groupId: ID;
  group: ProductOptionGroup;
  translations: ProductOptionTranslation[];
  customFields?: JSON;
}

export interface ProductTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
  slug: string;
  description: string;
}

export interface ProductVariantTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
}

export interface ProductOptionGroupTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
}

export interface ProductOptionTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
}

export interface TaxRate {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  name: string;
  enabled: boolean;
  value: number;
  category: TaxCategory;
  zone: Zone;
  customerGroup?: CustomerGroup;
  customFields?: JSON;
}

export interface TaxCategory {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  name: string;
  isDefault: boolean;
  customFields?: JSON;
}

export interface Zone {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  name: string;
  members: Region[];
  customFields?: JSON;
}

export interface Region {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  code: string;
  type: string;
  name: string;
  enabled: boolean;
  parent?: Region;
  parentId?: ID;
  translations: RegionTranslation[];
  customFields?: JSON;
}

export interface RegionTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
}

export interface FacetValue {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  facet: Facet;
  facetId: ID;
  name: string;
  code: string;
  translations: FacetValueTranslation[];
  customFields?: JSON;
}

export interface Facet {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
  code: string;
  values: FacetValue[];
  translations: FacetTranslation[];
  customFields?: JSON;
}

export interface FacetTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
}

export interface FacetValueTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
}

// Collection Types
export interface Collection {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
  slug: string;
  breadcrumbs: CollectionBreadcrumb[];
  position: number;
  description: string;
  featuredAsset?: Asset;
  assets: Asset[];
  parent?: Collection;
  parentId: ID;
  children: Collection[];
  filters: ConfigurableOperation[];
  translations: CollectionTranslation[];
  customFields?: JSON;
}

export interface CollectionBreadcrumb {
  id: ID;
  name: string;
  slug: string;
}

export interface CollectionTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
  slug: string;
  description: string;
}

export interface ConfigurableOperation {
  code: string;
  args: ConfigArg[];
}

export interface ConfigArg {
  name: string;
  value: string;
}

// Customer Types
export interface Customer {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  title?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailAddress: string;
  addresses: Address[];
  user?: User;
  customFields?: JSON;
}

export interface CustomerGroup {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  name: string;
  customers: Customer[];
  customFields?: JSON;
}

export interface User {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  identifier: string;
  verified: boolean;
  roles: Role[];
  lastLogin?: DateTime;
  authenticationMethods: AuthenticationMethod[];
  customFields?: JSON;
}

export interface Role {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  code: string;
  description: string;
  permissions: Permission[];
  channels: Channel[];
}

export interface AuthenticationMethod {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  strategy: string;
}

export interface Channel {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  code: string;
  token: string;
  defaultTaxZone?: Zone;
  defaultShippingZone?: Zone;
  defaultLanguageCode: LanguageCode;
  availableLanguageCodes: LanguageCode[];
  currencyCode: CurrencyCode;
  defaultCurrencyCode: CurrencyCode;
  availableCurrencyCodes: CurrencyCode[];
  trackInventory: boolean;
  outOfStockThreshold: number;
  pricesIncludeTax: boolean;
  seller?: Seller;
  customFields?: JSON;
}

export interface Seller {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  name: string;
  customFields?: JSON;
}

export type Permission = string;

// Address Types
export interface Address {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  fullName?: string;
  company?: string;
  streetLine1: string;
  streetLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: Country;
  phoneNumber?: string;
  defaultShippingAddress: boolean;
  defaultBillingAddress: boolean;
  customFields?: JSON;
}

export interface Country {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  code: string;
  type: string;
  name: string;
  enabled: boolean;
  parent?: Region;
  parentId?: ID;
  translations: RegionTranslation[];
  customFields?: JSON;
}

// Order Types
export interface Order {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  type: OrderType;
  orderPlacedAt?: DateTime;
  code: string;
  state: string;
  active: boolean;
  customer?: Customer;
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  lines: OrderLine[];
  surcharges: Surcharge[];
  discounts: Discount[];
  couponCodes: string[];
  promotions: Promotion[];
  payments?: Payment[];
  fulfillments: Fulfillment[];
  totalQuantity: number;
  subTotal: Money;
  subTotalWithTax: Money;
  currencyCode: CurrencyCode;
  shippingLines: ShippingLine[];
  shipping: Money;
  shippingWithTax: Money;
  total: Money;
  totalWithTax: Money;
  taxSummary: OrderTaxSummary[];
  customFields?: JSON;
}

export interface OrderAddress {
  fullName?: string;
  company?: string;
  streetLine1?: string;
  streetLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  phoneNumber?: string;
  customFields?: JSON;
}

export interface OrderLine {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  productVariant: ProductVariant;
  featuredAsset?: Asset;
  unitPrice: Money;
  unitPriceWithTax: Money;
  unitPriceChangeSinceAdded: Money;
  unitPriceWithTaxChangeSinceAdded: Money;
  discountedUnitPrice: Money;
  discountedUnitPriceWithTax: Money;
  proratedUnitPrice: Money;
  proratedUnitPriceWithTax: Money;
  quantity: number;
  orderPlacedQuantity: number;
  taxRate: number;
  linePrice: Money;
  linePriceWithTax: Money;
  discountedLinePrice: Money;
  discountedLinePriceWithTax: Money;
  proratedLinePrice: Money;
  proratedLinePriceWithTax: Money;
  lineTax: Money;
  discounts: Discount[];
  taxLines: TaxLine[];
  order: Order;
  fulfillmentLines: FulfillmentLine[];
  customFields?: JSON;
}

export interface Surcharge {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  description: string;
  sku?: string;
  taxLines: TaxLine[];
  price: Money;
  priceWithTax: Money;
  taxRate: number;
}

export interface Discount {
  adjustmentSource: string;
  type: AdjustmentType;
  description: string;
  amount: Money;
  amountWithTax: Money;
}

export interface Promotion {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  startsAt?: DateTime;
  endsAt?: DateTime;
  couponCode?: string;
  perCustomerUsageLimit?: number;
  usageLimit?: number;
  name: string;
  description: string;
  enabled: boolean;
  conditions: ConfigurableOperation[];
  actions: ConfigurableOperation[];
  translations: PromotionTranslation[];
  customFields?: JSON;
}

export interface PromotionTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
  description: string;
}

export interface TaxLine {
  description: string;
  taxRate: number;
}

export interface OrderTaxSummary {
  description: string;
  taxRate: number;
  taxBase: Money;
  taxTotal: Money;
}

export type OrderType = string;
export type AdjustmentType = string;

// Payment Types
export interface Payment {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  method: string;
  amount: Money;
  state: string;
  transactionId?: string;
  errorMessage?: string;
  refunds: Refund[];
  metadata?: JSON;
  customFields?: JSON;
}

export interface Refund {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  items: Money;
  shipping: Money;
  adjustment: Money;
  total: Money;
  method?: string;
  state: string;
  transactionId?: string;
  reason?: string;
  lines: RefundLine[];
  paymentId: ID;
  metadata?: JSON;
  customFields?: JSON;
}

export interface RefundLine {
  orderLine: OrderLine;
  orderLineId: ID;
  quantity: number;
  refund: Refund;
  refundId: ID;
}

// Shipping Types
export interface ShippingLine {
  id: ID;
  shippingMethod: ShippingMethod;
  price: Money;
  priceWithTax: Money;
  discountedPrice: Money;
  discountedPriceWithTax: Money;
  discounts: Discount[];
  customFields?: JSON;
}

export interface ShippingMethod {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  code: string;
  name: string;
  description: string;
  fulfillmentHandlerCode: string;
  checker: ConfigurableOperation;
  calculator: ConfigurableOperation;
  translations: ShippingMethodTranslation[];
  customFields?: JSON;
}

export interface ShippingMethodTranslation {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  languageCode: LanguageCode;
  name: string;
  description: string;
}

export interface ShippingMethodQuote {
  id: ID;
  price: Money;
  priceWithTax: Money;
  code: string;
  name: string;
  description: string;
  metadata?: JSON;
  customFields?: JSON;
}

// Fulfillment Types
export interface Fulfillment {
  id: ID;
  createdAt: DateTime;
  updatedAt: DateTime;
  lines: FulfillmentLine[];
  summary: FulfillmentLine[];
  state: string;
  method: string;
  trackingCode?: string;
  customFields?: JSON;
}

export interface FulfillmentLine {
  orderLine: OrderLine;
  orderLineId: ID;
  quantity: number;
  fulfillment: Fulfillment;
  fulfillmentId: ID;
}

// Search Types
export interface SearchResult {
  sku: string;
  slug: string;
  productId: ID;
  productName: string;
  productAsset?: SearchResultAsset;
  productVariantId: ID;
  productVariantName: string;
  productVariantAsset?: SearchResultAsset;
  price: SearchResultPrice;
  priceWithTax: SearchResultPrice;
  currencyCode: CurrencyCode;
  description: string;
  facetIds: ID[];
  facetValueIds: ID[];
  collectionIds: ID[];
  score: number;
}

export interface SearchResultAsset {
  id: ID;
  preview: string;
  focalPoint?: Coordinate;
}

export type SearchResultPrice = PriceRange | SinglePrice;

export interface PriceRange {
  min: Money;
  max: Money;
}

export interface SinglePrice {
  value: Money;
}

// Error Types
export interface ErrorResult {
  errorCode: ErrorCode;
  message: string;
}

export type ErrorCode = string;

// Specific Error Types
export interface NoActiveOrderError extends ErrorResult {
  errorCode: 'NO_ACTIVE_ORDER_ERROR';
}

export interface OrderModificationError extends ErrorResult {
  errorCode: 'ORDER_MODIFICATION_ERROR';
}

export interface OrderStateTransitionError extends ErrorResult {
  errorCode: 'ORDER_STATE_TRANSITION_ERROR';
  transitionError: string;
  fromState: string;
  toState: string;
}

export interface AlreadyLoggedInError extends ErrorResult {
  errorCode: 'ALREADY_LOGGED_IN_ERROR';
}

export interface EmailAddressConflictError extends ErrorResult {
  errorCode: 'EMAIL_ADDRESS_CONFLICT_ERROR';
}

export interface GuestCheckoutError extends ErrorResult {
  errorCode: 'GUEST_CHECKOUT_ERROR';
  errorDetail: string;
}

export interface IneligiblePaymentMethodError extends ErrorResult {
  errorCode: 'INELIGIBLE_PAYMENT_METHOD_ERROR';
  eligibilityCheckerMessage?: string;
}

export interface PaymentFailedError extends ErrorResult {
  errorCode: 'PAYMENT_FAILED_ERROR';
  paymentErrorMessage: string;
}

export interface PaymentDeclinedError extends ErrorResult {
  errorCode: 'PAYMENT_DECLINED_ERROR';
  paymentErrorMessage: string;
}

export interface OrderPaymentStateError extends ErrorResult {
  errorCode: 'ORDER_PAYMENT_STATE_ERROR';
}

export interface IneligibleShippingMethodError extends ErrorResult {
  errorCode: 'INELIGIBLE_SHIPPING_METHOD_ERROR';
}

export interface InsufficientStockError extends ErrorResult {
  errorCode: 'INSUFFICIENT_STOCK_ERROR';
  quantityAvailable: number;
  order: Order;
}

export interface OrderLimitError extends ErrorResult {
  errorCode: 'ORDER_LIMIT_ERROR';
  maxItems: number;
}

export interface NegativeQuantityError extends ErrorResult {
  errorCode: 'NEGATIVE_QUANTITY_ERROR';
}

export interface OrderInterceptorError extends ErrorResult {
  errorCode: 'ORDER_INTERCEPTOR_ERROR';
  interceptorError: string;
}

// Union Types
export type ActiveOrderResult = Order | NoActiveOrderError;

export type AddPaymentToOrderResult = 
  | Order 
  | OrderPaymentStateError 
  | IneligiblePaymentMethodError 
  | PaymentFailedError 
  | PaymentDeclinedError 
  | OrderStateTransitionError 
  | NoActiveOrderError;

export type SetCustomerForOrderResult = 
  | Order 
  | AlreadyLoggedInError 
  | EmailAddressConflictError 
  | NoActiveOrderError 
  | GuestCheckoutError;

export type SetOrderShippingMethodResult = 
  | Order 
  | OrderModificationError 
  | IneligibleShippingMethodError 
  | NoActiveOrderError;

export type TransitionOrderToStateResult = 
  | Order 
  | OrderStateTransitionError;

export type UpdateOrderItemsResult = 
  | Order 
  | OrderModificationError 
  | OrderLimitError 
  | NegativeQuantityError 
  | InsufficientStockError 
  | OrderInterceptorError;

export type RemoveOrderItemsResult = 
  | Order 
  | OrderModificationError 
  | OrderInterceptorError;

// Success Types
export interface Success {
  success: boolean;
}

// ===== LEGACY TYPES (for backward compatibility) =====

export interface ProductCustomFields {
  materials?: string;
  dimensions?: string;
  weight?: string;
  color?: string;
  assembly?: string;
  warranty?: string;
}

export interface SearchResultProduct {
  productId: string;
  productName: string;
  slug: string;
  description: string;
  priceWithTax: {
    min?: number;
    max?: number;
    value?: number;
  };
  currencyCode: string;
  productAsset?: Asset;
}

export interface Stat {
  value: string;
  description: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}
