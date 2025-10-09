import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

export function Hero() {
  return (
    <section className="rounded-lg overflow-hidden bg-white shadow-soft">
      <div className="px-8 md:px-12 pt-12 md:pt-14">
        <h1 className="text-[42px] md:text-[56px] leading-[1.05] font-bold max-w-[760px] text-[#0A0A0A] tracking-[-0.02em]">
          Discover Comfort, Style, and Quality Craftsmanship
        </h1>
        <p className="mt-4 max-w-[720px] text-[14px] md:text-[15px] text-[#4A4A4A] leading-[1.7]">
          Our furniture embodies a perfect blend of functionality and aesthetic appeal, ensuring every piece enhances your home with enduring elegance and superior durability.
        </p>
        <Button className="mt-6">Join Membership</Button>

        <div className="flex justify-center mt-8 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-[#E5E7EB]">
            <ChevronDown className="w-5 h-5 text-[#4A4A4A]" />
          </div>
        </div>
      </div>

      <div className="relative w-full h-[320px] md:h-[480px]">
        <Image
          src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Minimalist living room with gray sofa, white pillows, wooden coffee table, and white armchair"
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
      </div>
    </section>
  );
}
