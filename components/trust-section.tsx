'use client';

import { motion } from 'framer-motion';
import { Shield, Truck, RotateCcw, Award, Lock, Headphones } from 'lucide-react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

const trustElements = [
  {
    icon: Shield,
    title: '2-Year Warranty',
    description: 'All products come with a comprehensive 2-year warranty for your peace of mind'
  },
  {
    icon: Award,
    title: 'Quality Guaranteed',
    description: 'Quality materials and careful craftsmanship in every piece'
  },
  {
    icon: Lock,
    title: 'Secure Payment',
    description: 'SSL encrypted checkout with multiple payment options'
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Our customer service team is always here to help you'
  }
];

export function TrustSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="py-20 bg-white border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
            Why shop with us?
          </h2>
          <p className="text-lg text-brand-dark-blue/80 max-w-2xl mx-auto">
            We are committed to providing you with quality furniture at great prices with excellent service
          </p>
        </motion.div>

        {/* <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {trustElements.map((element, index) => {
            const Icon = element.icon;

            return (
              <motion.div
                key={index}
                variants={staggerItem}
                className="flex flex-col items-center text-center p-6 rounded-2xl hover:bg-orange-50 transition-colors duration-300"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <Icon className="w-8 h-8 text-orange-600" />
                </div>

                <h3 className="font-bold text-xl text-gray-900 mb-2">{element.title}</h3>

                <p className="text-gray-600">{element.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
 */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-8 flex-wrap justify-center">
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png"
                alt="Visa"
                className="h-8 grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png"
                alt="Mastercard"
                className="h-8 grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/2560px-PayPal.svg.png"
                alt="PayPal"
                className="h-6 grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all"
              />
            </div>

            <div className="h-12 w-px bg-gray-300"></div>

            <div className="text-sm text-brand-dark-blue/80 font-medium">
              <Shield className="inline w-4 h-4 mr-2 text-green-600" />
              SSL Secured Payment
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
