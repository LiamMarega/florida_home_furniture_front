import Image from 'next/image';

export function Banner() {
  return (
    <section className="mt-8 rounded-lg overflow-hidden">
      <div className="relative w-full h-[280px] md:h-[360px]">
        <Image
          src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Cozy armchair and round wooden table in a calm corner"
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
      </div>
    </section>
  );
}
