import { Product, Collection, Stat, NavigationItem } from './types';

export const navigationItems: NavigationItem[] = [
  { name: 'Furniture', href: '/collections/furniture' },
  { name: 'Outdoor', href: '/collections/outdoor' },
  { name: 'Lighting', href: '/collections/lighting' },
  { name: 'Dining', href: '/collections/dining' },
  { name: 'Bathrooms', href: '/collections/bathrooms' },
  { name: 'Mirrors & Decors', href: '/collections/mirrors-decors' },
];

export const products: Product[] = [
  {
    id: '1',
    title: 'WalnutGrace Chair',
    subtitle: 'Chair',
    price: '£450',
    image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'walnutgrace-chair',
  },
  {
    id: '2',
    title: 'Minimalist Luxe Storage Buffet',
    subtitle: 'Table',
    price: '£2350',
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'minimalist-luxe-storage-buffet',
  },
  {
    id: '3',
    title: 'Classic Harmony Sideboard',
    subtitle: 'Table',
    price: '£2350',
    image: 'https://images.pexels.com/photos/6585756/pexels-photo-6585756.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'classic-harmony-sideboard',
  },
  {
    id: '4',
    title: 'ChicHaven Couch',
    subtitle: 'Chair',
    price: '£1450',
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'chichaven-couch',
  },
  {
    id: '5',
    title: 'Relaxation Lounge Chair',
    subtitle: 'Chair',
    price: '£2350',
    image: 'https://images.pexels.com/photos/116910/pexels-photo-116910.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'relaxation-lounge-chair',
  },
  {
    id: '6',
    title: 'Vertex Premium Patio Chair',
    subtitle: 'Chair',
    price: '£1650',
    image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'vertex-premium-patio-chair',
  },
  {
    id: '7',
    title: 'Nebula Cozy Family Sofa',
    subtitle: 'Sofa',
    price: '£2450',
    image: 'https://images.pexels.com/photos/1648768/pexels-photo-1648768.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'nebula-cozy-family-sofa',
  },
  {
    id: '8',
    title: 'Luna Luxury Leather Couch',
    subtitle: 'Sofa',
    price: '£3490',
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=600',
    slug: 'luna-luxury-leather-couch',
  },
];

export const collections: Collection[] = [
  {
    id: 'beds',
    title: 'Our Beds Collection: Your Sleep Space with Comfort and Style',
    image: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'beds',
    colSpan: 3,
    rowSpan: 2,
  },
  {
    id: 'sofas',
    title: 'Browse Our Sofas Collection',
    image: 'https://images.pexels.com/photos/1648768/pexels-photo-1648768.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'sofas',
    colSpan: 3,
    rowSpan: 2,
  },
  {
    id: 'tables',
    title: 'Our Tables Collection',
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'tables',
    colSpan: 3,
    rowSpan: 1,
  },
  {
    id: 'all',
    title: 'See All Collection →',
    image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
    slug: 'all',
    colSpan: 3,
    rowSpan: 1,
  },
];

export const stats: Stat[] = [
  {
    value: '10+',
    description:
      'With a decade of expertise, Prabott crafts high-quality, bespoke furniture that blends style and functionality.',
  },
  {
    value: '800+',
    description:
      'Our commitment to customer satisfaction ensures we deliver outstanding service and products that exceed expectations.',
  },
  {
    value: '1200+',
    description:
      'Prabott has crafted over 1200 unique furniture pieces, from elegant sofas to functional cabinets, with precision and care.',
  },
];
