// Profile page types
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

export interface UserAddress {
  id: string;
  nickname?: string;
  fullName?: string;
  street: string;
  streetLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
}

export interface OrderProduct {
  id: string;
  name: string;
  featuredAsset?: {
    preview: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  color?: string;
  size?: string;
}

export interface UserOrder {
  id: string;
  orderNumber: string;
  timestamp: string;
  status: 'pending' | 'on-the-way' | 'shipped' | 'delivered' | 'cancelled';
  deliveryDate?: string;
  deliveryAddress: string;
  currency: string;
  totalAmount: number;
  productCount: number;
  products: OrderProduct[];
}

export type OrderFilter = 'current' | 'unpaid' | 'all';

export type ProfileTab = 'addresses' | 'orders';

