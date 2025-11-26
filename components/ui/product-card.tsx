import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  title: string;
  subtitle: string;
  price: string;
  image: string;
  href: string;
  className?: string;
}

export function ProductCard({ title, subtitle, price, image, href, className }: ProductCardProps) {
  return (
    <div
      className={cn(
        'group relative bg-white rounded-lg border border-[#E5E7EB] p-3 shadow-[0_6px_16px_rgba(0,0,0,0.04)] hover:shadow-elevated transition-all duration-200 cursor-pointer',
        className
      )}
    >
      <div className="relative w-full h-[150px] md:h-[160px] rounded-md overflow-hidden bg-[#F3F4F6]">
        <Image
          src={image}
          alt={`${title} - ${subtitle}`}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 25vw, 50vw"
        />
      </div>
      <div className="mt-3">
        <h3 className="text-[14px] font-medium text-[#0A0A0A]">{title}</h3>
        <p className="text-[12px] text-[#4A4A4A] truncate">{subtitle}</p>
        <p className="mt-2 text-[13px] font-semibold text-[#0A0A0A]">{price}</p>
      </div>
      <Link
        href={href}
        className="absolute inset-0 z-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
