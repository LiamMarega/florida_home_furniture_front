'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Sofa, Armchair } from 'lucide-react';
import { Button } from './ui/button';
import { fadeInUp, fadeIn, slideInLeft } from '@/lib/animations';

export function HeroNew() {
  const scrollToProducts = () => {
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      className="m-5 pt-16 relative min-h-[90dvh] rounded-2xl overflow-hidden bg-gradient-to-br from-brand-cream via-brand-accent/20 to-brand-dark-blue/50 flex items-end"
      // Use 90dvh for better mobile and desktop support, as per prompt
    >
      <div className="absolute inset-0 bg-[url('/images/furniture-background_hd.jpg')] bg-cover bg-center opacity-100"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-dark-blue/60 via-brand-dark-blue/50 to-transparent"></div>

      {/* Flex container puts all text/buttons at the bottom; child for content fills width */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 flex flex-col justify-end min-h-[60vh] sm:min-h-[55vh] md:min-h-[50vh] lg:min-h-[45vh]">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="max-w-3xl"
        >
          <motion.div
            variants={slideInLeft}
            className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full mb-4 shadow-lg"
          >
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></div>
            <span className="text-[10px] sm:text-xs font-semibold text-brand-dark-blue uppercase tracking-wider">
              Quality Furniture for Every Home
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight mb-2 font-tango-sans"
          >
            Modern furniture that{' '}
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Sofa className="w-8 h-8 sm:w-9 sm:h-9 text-brand-primary" />
              </motion.span>
              transforms
            </span>
            <br />
            <span className="relative">
              your{' '}
              <span className="relative inline-block">
                <span className="absolute -inset-1.5 bg-brand-primary/20 blur-xl"></span>
                <span className="relative">space</span>
              </span>
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="inline-block ml-2"
              >
                <Armchair className="w-8 h-8 sm:w-9 sm:h-9 text-brand-primary" />
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-sm sm:text-base text-white/90 max-w-xl mb-3 leading-snug"
          >
            We create modern,{' '}
            <span className="font-semibold text-brand-accent">affordable</span> and{' '}
            <span className="font-semibold text-brand-accent">functional</span> furniture that makes your home comfortable and stylish
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button
              size="lg"
              onClick={scrollToProducts}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-3 text-sm font-bold rounded-full shadow-2xl hover:shadow-brand transition-all duration-300 hover:scale-105 group"
            >
              SHOP NOW
              <ChevronDown className="ml-2 w-4 h-4 group-hover:translate-y-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToProducts}
              className="border-2 border-white text-white hover:bg-white hover:text-brand-primary px-6 py-3 text-sm font-bold rounded-full backdrop-blur-sm bg-white/10 transition-all duration-300 hover:scale-105"
            >
              Explore Collection
            </Button>
          </motion.div>

          {/*
          <motion.div
            variants={fadeInUp}
            className="mt-8 flex items-center gap-6 flex-wrap"
          >
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg">
              <div className="text-xl font-bold text-brand-primary">10+</div>
              <div className="text-xs text-brand-dark-blue font-medium">Years Experience</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg">
              <div className="text-xl font-bold text-brand-primary">1200+</div>
              <div className="text-xs text-brand-dark-blue font-medium">Products Crafted</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg">
              <div className="text-xl font-bold text-brand-primary">800+</div>
              <div className="text-xs text-brand-dark-blue font-medium">Happy Customers</div>
            </div>
          </motion.div>
          */}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 1,
          duration: 0.8,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        className="absolute bottom-2 sm:bottom-8 lg:bottom-16 left-1/2 -translate-x-1/2 z-20"
      >
        <button
          onClick={scrollToProducts}
          className="flex flex-col items-center gap-1 text-white hover:text-brand-accent transition-colors group"
          aria-label="Scroll to products"
        >
          <ChevronDown className="w-5 h-5 animate-bounce" />
          <span className="text-[10px] sm:text-xs font-medium">Scroll to explore</span>
        </button>
      </motion.div>
    </section>
  );
}
