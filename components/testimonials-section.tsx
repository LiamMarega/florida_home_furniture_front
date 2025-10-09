'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

interface Review {
  id: string;
  customer_name: string;
  customer_avatar: string | null;
  customer_location: string | null;
  rating: number;
  title: string | null;
  comment: string;
  verified_purchase: boolean;
}

const staticReviews: Review[] = [
  {
    id: '1',
    customer_name: 'Sarah Mitchell',
    customer_avatar: null,
    customer_location: 'London, UK',
    rating: 5,
    title: 'Exceptional Quality',
    comment: 'The craftsmanship on my dining table is outstanding. Every detail shows the care and attention put into creating this beautiful piece.',
    verified_purchase: true,
  },
  {
    id: '2',
    customer_name: 'James Patterson',
    customer_avatar: null,
    customer_location: 'Manchester, UK',
    rating: 5,
    title: 'Perfect for Our Living Room',
    comment: 'We absolutely love our new sofa! The comfort level is incredible and it fits perfectly with our interior design.',
    verified_purchase: true,
  },
  {
    id: '3',
    customer_name: 'Emily Thompson',
    customer_avatar: null,
    customer_location: 'Birmingham, UK',
    rating: 5,
    title: 'Worth Every Penny',
    comment: 'Initially hesitant about the price, but the quality and durability make it a worthwhile investment. Best furniture purchase we\'ve made!',
    verified_purchase: true,
  },
  {
    id: '4',
    customer_name: 'Michael Brown',
    customer_avatar: null,
    customer_location: 'Edinburgh, UK',
    rating: 4,
    title: 'Beautiful Design',
    comment: 'The minimalist design of our new cabinet fits perfectly in our home. Excellent storage space and looks amazing.',
    verified_purchase: true,
  },
  {
    id: '5',
    customer_name: 'Lisa Anderson',
    customer_avatar: null,
    customer_location: 'Bristol, UK',
    rating: 5,
    title: 'Exceeded Expectations',
    comment: 'From ordering to delivery, everything was smooth. The chairs are even more beautiful in person than in the photos!',
    verified_purchase: true,
  },
  {
    id: '6',
    customer_name: 'David Wilson',
    customer_avatar: null,
    customer_location: 'Leeds, UK',
    rating: 5,
    title: 'Outstanding Service',
    comment: 'Not only is the furniture top-notch, but the customer service was exceptional. They helped us choose the perfect pieces for our space.',
    verified_purchase: true,
  },
];

export function TestimonialsSection() {
  const { ref, isVisible } = useScrollAnimation();
  const reviews = staticReviews;

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-white to-orange-50/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full mb-4">
            <span className="text-sm font-semibold text-orange-600 uppercase tracking-wider">
              Testimonials
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4"
          >
            Hear from happy customers
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Real experiences from people who transformed their spaces with our furniture
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              variants={staggerItem}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow relative"
            >
              <Quote className="absolute top-6 right-6 w-12 h-12 text-orange-100" />

              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                  {review.customer_avatar ? (
                    <img
                      src={review.customer_avatar}
                      alt={review.customer_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    review.customer_name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{review.customer_name}</h4>
                  {review.customer_location && (
                    <p className="text-sm text-gray-500">{review.customer_location}</p>
                  )}
                </div>

                {review.verified_purchase && (
                  <div className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                    Verified
                  </div>
                )}
              </div>

              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < review.rating
                        ? 'fill-orange-400 text-orange-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>

              {review.title && (
                <h5 className="font-bold text-gray-900 mb-2">{review.title}</h5>
              )}

              <p className="text-gray-600 leading-relaxed">{review.comment}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
