import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { CartProvider } from '@/contexts/cart-context';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryProvider } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import localFont from 'next/font/local';
import { ConditionalHeader } from '@/components/conditional-header';
import AuthModal from '@/components/auth/auth-modal';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Footer } from '@/components/footer';



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
  title: {
    default: 'Florida Homes Furniture - Modern Furniture Store | Miami',
    template: '%s | Florida Homes Furniture',
  },
  description: 'Discover modern, affordable furniture from Miami. Shop sofas, chairs, tables, and more. Free shipping on orders over $200. 30-day returns guaranteed.',
  keywords: 'furniture, sofas, chairs, tables, home decor, office furniture, modern furniture, Miami furniture, Florida furniture',
  authors: [{ name: 'Florida Homes Furniture' }],
  creator: 'Florida Homes Furniture',
  publisher: 'Florida Homes Furniture',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/images/favicon/favicon.ico', sizes: 'any' },
      { url: '/images/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/images/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/images/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'manifest', url: '/images/favicon/site.webmanifest' },
    ],
  },
  appleWebApp: {
    title: 'Florida Home Furniture',
    statusBarStyle: 'default',
    capable: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
    siteName: 'Florida Homes Furniture',
    title: 'Florida Homes Furniture - Quality Furniture Store',
    description: 'Modern, affordable furniture from Miami. Create beautiful spaces that fit your budget.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Florida Homes Furniture - Quality Furniture Store',
    description: 'Modern, affordable furniture from Miami. Create beautiful spaces that fit your budget.',
  },
  verification: {
    // Agregar después: google, yandex, etc.
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
      <Analytics />
      <SpeedInsights />
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <ConditionalHeader />
              {children}
              <AuthModal />
              <Toaster position="bottom-right" />
              <Footer />
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
