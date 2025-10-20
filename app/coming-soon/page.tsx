import Image from 'next/image';
import { Instagram, Facebook } from 'lucide-react';

export default function ComingSoon() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-cream/50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-16">
          <div className="inline-block mb-8">
            <Image
              src="/images/logos/logo_compacto.png"
              alt="Florida Homes Furniture"
              width={180}
              height={180}
              priority
            />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
            Coming Soon
          </h1>
          
          <p className="text-xl md:text-2xl text-brand-dark-blue/70 max-w-2xl mx-auto leading-relaxed">
            We&apos;re crafting something beautiful for your home. 
            Quality furniture at prices you&apos;ll love.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="aspect-square rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg"
              alt="Modern furniture"
              width={300}
              height={300}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg"
              alt="Cozy living room"
              width={300}
              height={300}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg"
              alt="Stylish interior"
              width={300}
              height={300}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="aspect-square rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"
              alt="Modern design"
              width={300}
              height={300}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-brand-dark-blue/60 mb-4">Follow us:</p>
          <div className="flex gap-4 justify-center">
            
              <a href="#"
              className="w-12 h-12 rounded-full bg-brand-dark-blue text-white flex items-center justify-center hover:bg-brand-primary transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            
              <a href="#"
              className="w-12 h-12 rounded-full bg-brand-dark-blue text-white flex items-center justify-center hover:bg-brand-primary transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}