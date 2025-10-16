'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { Star, Quote, ThumbsUp, MessageCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

interface ProductReviewsProps {
  product: Product;
}

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
  avatar?: string;
}

const mockReviews: Review[] = [
  {
    id: '1',
    customerName: 'Sarah Mitchell',
    rating: 5,
    title: 'Absolutely Perfect!',
    comment: 'This piece exceeded all my expectations. The quality is outstanding and it looks even better in person than in the photos. The assembly was straightforward and the instructions were clear.',
    date: '2024-01-15',
    verified: true,
    helpful: 12,
  },
  {
    id: '2',
    customerName: 'James Patterson',
    rating: 5,
    title: 'Beautiful and Sturdy',
    comment: 'I\'ve had this for 6 months now and it still looks brand new. The craftsmanship is excellent and it fits perfectly in my living room. Highly recommend!',
    date: '2024-01-10',
    verified: true,
    helpful: 8,
  },
  {
    id: '3',
    customerName: 'Emily Thompson',
    rating: 4,
    title: 'Great Value for Money',
    comment: 'Good quality furniture at a reasonable price. The delivery was fast and the packaging was excellent. Minor assembly required but nothing too complicated.',
    date: '2024-01-08',
    verified: true,
    helpful: 5,
  },
  {
    id: '4',
    customerName: 'Michael Brown',
    rating: 5,
    title: 'Love the Design',
    comment: 'The modern design fits perfectly with my home decor. The materials feel premium and the finish is flawless. Customer service was also very helpful.',
    date: '2024-01-05',
    verified: true,
    helpful: 15,
  },
  {
    id: '5',
    customerName: 'Lisa Anderson',
    rating: 5,
    title: 'Excellent Quality',
    comment: 'This is exactly what I was looking for. The build quality is impressive and it arrived in perfect condition. Would definitely buy from this brand again.',
    date: '2024-01-02',
    verified: true,
    helpful: 9,
  },
];

const ratingDistribution = [
  { stars: 5, count: 89, percentage: 70 },
  { stars: 4, count: 25, percentage: 20 },
  { stars: 3, count: 8, percentage: 6 },
  { stars: 2, count: 3, percentage: 2 },
  { stars: 1, count: 2, percentage: 2 },
];

export function ProductReviews({ product }: ProductReviewsProps) {
  const { ref, isVisible } = useScrollAnimation();
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'rating'>('newest');

  const averageRating = 4.8;
  const totalReviews = 127;

  const filteredReviews = mockReviews
    .filter(review => filterRating === null || review.rating === filterRating)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'helpful':
          return b.helpful - a.helpful;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${sizeClasses[size]} ${
              i < rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

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
              Customer Reviews
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
            What Our Customers Say
          </h2>
          
          <p className="text-lg text-brand-dark-blue/80 max-w-2xl mx-auto">
            Real experiences from people who have already made this choice
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Rating Summary */}
          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={fadeInUp}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-brand-cream sticky top-8">
              {/* Overall Rating */}
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-brand-dark-blue mb-2">
                  {averageRating}
                </div>
                {renderStars(Math.floor(averageRating), 'lg')}
                <p className="text-brand-dark-blue/70 mt-2">
                  Based on {totalReviews} reviews
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-3">
                {ratingDistribution.map((rating) => (
                  <div key={rating.stars} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-brand-dark-blue w-8">
                      {rating.stars}
                    </span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${rating.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-brand-dark-blue/70 w-8">
                      {rating.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filter Buttons */}
              <div className="mt-8 space-y-2">
                <h4 className="font-semibold text-brand-dark-blue mb-3">Filter by Rating</h4>
                <Button
                  variant={filterRating === null ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilterRating(null)}
                >
                  All Reviews
                </Button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Button
                    key={rating}
                    variant={filterRating === rating ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilterRating(rating)}
                  >
                    {renderStars(rating, 'sm')}
                    <span className="ml-2">{rating} Star{rating > 1 ? 's' : ''}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Reviews List */}
          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="lg:col-span-3"
          >
            {/* Sort Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-brand-dark-blue/70" />
                <span className="text-brand-dark-blue/70">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-brand-cream rounded-lg px-3 py-2 text-brand-dark-blue focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="helpful">Most Helpful</option>
                  <option value="rating">Highest Rating</option>
                </select>
              </div>
              
              <p className="text-brand-dark-blue/70">
                Showing {filteredReviews.length} of {mockReviews.length} reviews
              </p>
            </div>

            {/* Reviews */}
            <div className="space-y-6">
              {filteredReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  variants={staggerItem}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-brand-cream hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center text-white font-bold">
                        {review.customerName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-brand-dark-blue">
                            {review.customerName}
                          </h4>
                          {review.verified && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating, 'sm')}
                          <span className="text-sm text-brand-dark-blue/70">
                            {new Date(review.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="mb-4">
                    <h5 className="font-semibold text-brand-dark-blue mb-2">
                      {review.title}
                    </h5>
                    <p className="text-brand-dark-blue/80 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>

                  {/* Review Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-brand-dark-blue/70 hover:text-brand-primary"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Helpful ({review.helpful})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-brand-dark-blue/70 hover:text-brand-primary"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Load More Button */}
            <div className="text-center mt-12">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
              >
                Load More Reviews
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
