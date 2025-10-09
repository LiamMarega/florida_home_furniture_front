export interface Product {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  image: string;
  slug: string;
}

export interface Collection {
  id: string;
  title: string;
  image: string;
  slug: string;
  colSpan: number;
  rowSpan: number;
}

export interface Stat {
  value: string;
  description: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}
