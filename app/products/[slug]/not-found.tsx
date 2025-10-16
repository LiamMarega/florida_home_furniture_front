import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Home } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-6 bg-brand-cream rounded-full flex items-center justify-center">
            <Search className="w-16 h-16 text-brand-dark-blue/50" />
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
            Product Not Found
          </h1>
          <p className="text-lg text-brand-dark-blue/80 mb-6">
            Sorry, we couldn't find the product you're looking for. It might have been moved, deleted, or the link might be incorrect.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-brand-primary hover:bg-brand-primary/90 text-white">
            <Link href="/products">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Browse All Products
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="border-2 border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white">
            <Link href="/">
              <Home className="w-5 h-5 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-12 p-6 bg-brand-cream/30 rounded-lg">
          <h3 className="text-lg font-semibold text-brand-dark-blue mb-2">
            Need Help?
          </h3>
          <p className="text-brand-dark-blue/70 mb-4">
            If you're looking for a specific product, try searching our catalog or contact our customer service team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="ghost" size="sm" className="text-brand-primary hover:text-brand-primary/80">
              Contact Support
            </Button>
            <Button variant="ghost" size="sm" className="text-brand-primary hover:text-brand-primary/80">
              Search Products
            </Button>
          </div>
        </div>

        {/* Popular Categories */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">
            Popular Categories
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Sofas', 'Chairs', 'Tables', 'Storage', 'Bedroom', 'Dining'].map((category) => (
              <Link
                key={category}
                href={`/products?category=${category.toLowerCase()}`}
                className="px-4 py-2 bg-white border border-brand-cream rounded-full text-sm text-brand-dark-blue hover:bg-brand-primary hover:text-white transition-colors"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
