export interface Asset {
  id: string;
  preview: string;
  source: string;
  width?: number;
  height?: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: string;
  product?: Product;
}

export interface ProductCustomFields {
  materials?: string;
  dimensions?: string;
  weight?: string;
  color?: string;
  assembly?: string;
  warranty?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset?: Asset;
  assets: Asset[];
  variants: ProductVariant[];
  customFields?: ProductCustomFields;
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

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featuredAsset?: Asset;
  colSpan?: number;
  rowSpan?: number;
}

export interface OrderLine {
  id: string;
  quantity: number;
  linePrice: number;
  linePriceWithTax: number;
  unitPrice: number;
  unitPriceWithTax: number;
  productVariant: ProductVariant;
}

export interface Order {
  id: string;
  code: string;
  state: string;
  total: number;
  totalWithTax: number;
  currencyCode: string;
  lines: OrderLine[];
}

export interface Customer {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

export interface Stat {
  value: string;
  description: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}
