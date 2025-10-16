'use client';

import { motion } from 'framer-motion';
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
    icon: Award,
    title: '2-Year Warranty',
    description: 'Comprehensive warranty coverage for peace of mind',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Heart,
    title: 'Customer Love',
    description: 'Rated 4.8/5 stars by over 1000+ satisfied customers',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: Zap,
    title: 'Fast Assembly',
    description: 'Easy-to-follow instructions for quick setup',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    icon: Leaf,
    title: 'Eco-Friendly',
    description: 'Made from sustainable and environmentally safe materials',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
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
          
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
            Built for Excellence
          </h2>
          
          <p className="text-lg text-brand-dark-blue/80 max-w-2xl mx-auto">
            Every detail has been carefully considered to provide you with the best possible furniture experience
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20"
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
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-brand-cream"
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
          className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-brand-cream"
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
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-brand-primary to-brand-accent rounded-2xl p-8 lg:p-12 text-white">
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
        </motion.div>
      </div>
    </section>
  );
}
