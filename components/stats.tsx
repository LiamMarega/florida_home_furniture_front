import { stats } from '@/lib/data';

export function Stats() {
  return (
    <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg p-6 shadow-soft">
          <p className="text-[30px] md:text-[34px] font-bold text-[#0A0A0A]">{stat.value}</p>
          <p className="mt-2 text-[12px] text-[#4A4A4A] leading-6">{stat.description}</p>
        </div>
      ))}
    </section>
  );
}
