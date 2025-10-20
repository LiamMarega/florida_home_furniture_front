'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // No mostrar header en la página de coming-soon
  if (pathname === '/coming-soon') {
    return null;
  }
  
  return <Header />;
}
