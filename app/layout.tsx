import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import { CartProvider } from '@/contexts/cart-context';
import { Toaster } from '@/components/ui/sonner';
import localFont from 'next/font/local';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  title: 'Mavren - Create Spaces That Last a Lifetime | Premium Furniture Store',
  description: 'Discover exceptional furniture that blends timeless design with modern comfort. Shop sofas, chairs, tables, and more. Free shipping on orders over £500. 30-day returns guaranteed.',
  keywords: 'furniture, sofas, chairs, tables, home decor, office furniture, modern furniture, luxury furniture',
  openGraph: {
    title: 'Mavren - Premium Furniture Store',
    description: 'Create spaces that last a lifetime with our handcrafted furniture collection',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <Header />
          {children}
          <Toaster position="top-right" />
        </CartProvider>
      </body>
    </html>
  );
}
