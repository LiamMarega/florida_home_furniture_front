import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { CartProvider } from '@/contexts/cart-context';
import { Toaster } from '@/components/ui/sonner';
import localFont from 'next/font/local';

const tangoSans = localFont({
  src: [
    {
      path: '../public/fonts/tangoSans/TangoSans.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/tangoSans/TangoSans_Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-tango-sans',
  display: 'swap',
});

const creatoDisplay = localFont({
  src: [
    {
      path: '../public/fonts/creato/CreatoDisplay-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/creato/CreatoDisplay-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/creato/CreatoDisplay-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-creato-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  title: 'Florida Homes Furniture - Modern Furniture Store | Miami',
  description: 'Discover modern, functional and accessible furniture from Miami. Shop sofas, chairs, tables, and more. Free shipping on orders over $500. 30-day returns guaranteed.',
  keywords: 'furniture, sofas, chairs, tables, home decor, office furniture, modern furniture, Miami furniture, Florida furniture',
  icons: {
    icon: [
      { url: '/images/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/favicon_io/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/images/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/images/favicon_io/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/favicon_io/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/images/favicon_io/site.webmanifest',
  openGraph: {
    title: 'Florida Homes Furniture - Premium Furniture Store',
    description: 'Modern, functional and accessible furniture from Miami. Create spaces that reflect your style.',
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
      <body className={`${creatoDisplay.variable} ${tangoSans.variable} font-creato-display`}>
        <CartProvider>
          <Header />
          {children}
          <Toaster position="top-right" />
        </CartProvider>
      </body>
    </html>
  );
}
