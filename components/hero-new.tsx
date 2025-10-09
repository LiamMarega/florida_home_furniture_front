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
    <section className="relative min-h-[90vh] w-full overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1648768/pexels-photo-1648768.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center opacity-20"></div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32 flex flex-col justify-center min-h-[90vh]">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="max-w-4xl"
        >
          <motion.div
            variants={slideInLeft}
            className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-lg"
          >
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Specialized in Space Creation
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[1.1] mb-6"
          >
            Create spaces that{' '}
            <span className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Sofa className="w-12 h-12 sm:w-16 sm:h-16 text-orange-500" />
              </motion.span>
              last
            </span>
            <br />
            <span className="relative">
              a{' '}
              <span className="relative inline-block">
                <span className="absolute -inset-2 bg-orange-500/20 blur-xl"></span>
                <span className="relative">lifetime</span>
              </span>
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="inline-block ml-2"
              >
                <Armchair className="w-12 h-12 sm:w-16 sm:h-16 text-orange-500" />
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg sm:text-xl text-white/90 max-w-2xl mb-8 leading-relaxed"
          >
            We are crafting amazing{' '}
            <span className="font-semibold text-orange-300">products</span> that{' '}
            <span className="font-semibold text-orange-300">delight</span>, constantly uplift the
            home, office environment
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              onClick={scrollToProducts}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg font-bold rounded-full shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 group"
            >
              SHOP NOW
              <ChevronDown className="ml-2 w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={scrollToProducts}
              className="border-2 border-white text-white hover:bg-white hover:text-orange-600 px-8 py-6 text-lg font-bold rounded-full backdrop-blur-sm bg-white/10 transition-all duration-300 hover:scale-105"
            >
              Explore Collection
            </Button>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-12 flex items-center gap-8 flex-wrap"
          >
            <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg">
              <div className="text-3xl font-bold text-orange-600">10+</div>
              <div className="text-sm text-gray-600 font-medium">Years Experience</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg">
              <div className="text-3xl font-bold text-orange-600">1200+</div>
              <div className="text-sm text-gray-600 font-medium">Products Crafted</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg">
              <div className="text-3xl font-bold text-orange-600">800+</div>
              <div className="text-sm text-gray-600 font-medium">Happy Customers</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <button
          onClick={scrollToProducts}
          className="flex flex-col items-center gap-2 text-white hover:text-orange-400 transition-colors group"
          aria-label="Scroll to products"
        >
          <ChevronDown className="w-8 h-8 animate-bounce" />
          <span className="text-sm font-medium">Scroll to explore</span>
        </button>
      </motion.div>
    </section>
  );
}
