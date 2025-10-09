'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const { ref, isVisible } = useScrollAnimation();

  useEffect(() => {
    async function loadReviews() {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .order('helpful_count', { ascending: false })
        .limit(6);

      if (data) {
        setReviews(data);
      }
    }

    loadReviews();
  }, []);

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
