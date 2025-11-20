'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { 
  Shield, 
  Truck, 
  Award, 
  Heart, 
  Zap, 
  Leaf,
  Star,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

interface ProductFeaturesProps {
  product: Product;
}

const features = [
  {
    icon: Shield,
    title: 'Premium Quality',
    description: 'Crafted with the finest materials and attention to detail',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Complimentary delivery on all orders over $200',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },

  {
    icon: Zap,
    title: 'Fast Assembly',
    description: 'Easy-to-follow instructions for quick setup',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
 
];

const benefits = [
  {
    icon: Star,
    title: 'Premium Materials',
    description: 'Only the finest wood, metal, and fabric are used',
  },
  {
    icon: Users,
    title: 'Expert Craftsmanship',
    description: 'Handcrafted by skilled artisans with years of experience',
  },
  {
    icon: Clock,
    title: 'Timeless Design',
    description: 'Classic style that will never go out of fashion',
  },
  {
    icon: CheckCircle,
    title: 'Quality Assured',
    description: 'Rigorous testing ensures durability and longevity',
  },
];

export function ProductFeatures({ product }: ProductFeaturesProps) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-brand-accent/20 px-4 py-2 rounded-full mb-4">
            <span className="text-sm font-semibold text-brand-primary uppercase tracking-wider">
              Why Choose This Product
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-dark-blue mb-4 font-tango-sans leading-tight">
            Built for Excellence
          </h2>
          
          <p className="text-base sm:text-lg text-brand-dark-blue/80 max-w-2xl mx-auto px-4 sm:px-0">
            Every detail has been carefully considered to provide you with the best possible furniture experience
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-20"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={index}
                variants={staggerItem}
                whileHover={{ 
                  y: -8, 
                  transition: { duration: 0.3 } 
                }}
                className="group bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-brand-cream"
              >
                <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                
                <h3 className="text-xl font-bold text-brand-dark-blue mb-3 font-tango-sans">
                  {feature.title}
                </h3>
                
                <p className="text-brand-dark-blue/70 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="relative bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-brand-cream"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              What Makes It Special
            </h3>
            <p className="text-lg text-brand-dark-blue/80 max-w-2xl mx-auto">
              Discover the unique qualities that set this product apart from the rest
            </p>
          </div>

          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              
              return (
                <motion.div
                  key={index}
                  variants={staggerItem}
                  className="flex items-start gap-4 p-6 rounded-xl hover:bg-brand-cream/30 transition-colors duration-300"
                >
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-brand-primary" />
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-brand-dark-blue mb-2">
                      {benefit.title}
                    </h4>
                    <p className="text-brand-dark-blue/70">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Decorative Illustration */}
          <Image
            src="/images/illustrations/9.png"
            alt="Decorative illustration"
            width={96}
            height={96}
            className="absolute bottom-4 right-4 w-44 h-7w-44 object-contain opacity-10 z-0 -rotate-12"
          />
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mt-16"
        >
          <div className="relative overflow-hidden rounded-2xl p-8 lg:p-12 text-white" style={{ backgroundImage: 'url(/images/backgrounds/orange_bg.png)', backgroundRepeat: 'repeat', backgroundSize: '500px 500px' }}>
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/10 rounded-2xl" />
            {/* Background Bubbles */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-12 right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute top-12 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

            <div className="relative z-10">
              <h3 className="text-2xl lg:text-3xl font-bold mb-4 font-tango-sans">
                Ready to Transform Your Space?
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Join thousands of satisfied customers who have already made this choice
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-brand-primary px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                >
                  Add to Cart Now
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-brand-primary transition-colors"
                >
                  Learn More
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
