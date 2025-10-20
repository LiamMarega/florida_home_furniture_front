import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '../globals.css';

const tangoSans = localFont({
  src: [
    {
      path: '../../public/fonts/tangoSans/TangoSans.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/tangoSans/TangoSans_Bold.ttf',
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
      path: '../../public/fonts/creato/CreatoDisplay-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/creato/CreatoDisplay-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/creato/CreatoDisplay-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-creato-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Coming Soon - Florida Homes Furniture',
  description: 'We\'re crafting something beautiful for your home. Quality furniture at prices you\'ll love.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${creatoDisplay.variable} ${tangoSans.variable} font-creato-display`}>
        {children}
      </body>
    </html>
  );
}
