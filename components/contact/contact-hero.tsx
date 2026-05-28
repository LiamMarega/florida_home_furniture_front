'use client';

import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Sparkles } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.45, ease: [0.4, 0, 0.2, 1] },
  }),
};

export function ContactHero() {
  const items = [
    {
      icon: Phone,
      label: 'Call us',
      value: '+1 (305) 924-0685',
      href: 'tel:+13059240685',
    },
    {
      icon: Mail,
      label: 'Write to us',
      value: 'floridahome.fh@gmail.com',
      href: 'mailto:floridahome.fh@gmail.com',
    },
    {
      icon: MapPin,
      label: 'Visit us',
      value: '4055 NW 17th Ave, Miami, FL 33142',
      href: 'https://maps.google.com/?q=4055+NW+17th+Ave+Miami+FL',
    },
  ];

  return (
    <div className="relative h-full flex flex-col justify-center text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-pill bg-brand-accent/30 blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-80 h-80 rounded-pill bg-brand-secondary/40 blur-3xl" />
      </div>

      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="inline-flex items-center gap-2 self-start rounded-pill bg-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.2em] backdrop-blur-md"
      >
        <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
        <span>Let&apos;s talk</span>
      </motion.div>

      <motion.h1
        custom={1}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="font-tango-sans text-4xl md:text-5xl leading-tight mt-5"
      >
        Design the home <br />
        <span className="text-brand-accent">you deserve.</span>
      </motion.h1>

      <motion.p
        custom={2}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-5 text-white/85 text-base leading-relaxed max-w-md"
      >
        Tell us about your project. Whether you&apos;re styling a single room or
        outfitting a whole space, our team will get back to you with curated
        suggestions tailored to your taste.
      </motion.p>

      <div className="mt-10 space-y-4 max-w-md">
        {items.map((item, i) => (
          <motion.a
            key={item.label}
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            custom={i + 3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            whileHover={{ y: -2 }}
            className="group flex items-center gap-4 rounded-lg bg-white/8 hover:bg-white/12 transition-colors border border-white/10 px-4 py-3 backdrop-blur-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-accent/20 text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-colors">
              <item.icon className="w-4 h-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                {item.label}
              </span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
