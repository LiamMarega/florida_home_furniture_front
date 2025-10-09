import Image from 'next/image';
import { Button } from './ui/button';

export function CTASection() {
  return (
    <section className="mt-10 rounded-lg bg-white p-6 md:p-8 shadow-soft">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <h2 className="text-[28px] md:text-[32px] font-bold text-[#0A0A0A]">
            Craft Your Ideal Furniture Masterpieces Today
          </h2>
          <p className="mt-3 text-[14px] text-[#4A4A4A] max-w-[580px] leading-[1.7]">
            Whether it's a sleek wooden chair, a plush sofa, or a functional table with drawers, our platform offers endless possibilities. Start crafting your dream furniture now and bring your vision to life!
          </p>
          <Button className="mt-6">Pre Order Now</Button>
        </div>

        <div className="relative h-[260px] md:h-[320px] rounded-md overflow-hidden">
          <Image
            src="https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="Brown leather sofa with patterned pillows and a plant on a wooden coffee table"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </div>
      </div>
    </section>
  );
}
