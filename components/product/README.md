# Product Page Components

This directory contains all the components for the product detail page implementation.

## Structure

```
components/product/
├── product-page.tsx          # Main product page layout
├── product-hero.tsx          # Hero section with product image and basic info
├── product-gallery.tsx       # Image gallery with carousel functionality
├── product-details.tsx       # Product details, pricing, and add to cart form
├── product-features.tsx      # Features section with animated icons
├── product-reviews.tsx       # Reviews and ratings section
├── related-products.tsx      # Related products carousel
└── README.md                 # This file
```

## Features

### 🎨 Design & UX
- **Modern Design**: Clean, modern interface with smooth animations
- **Responsive Layout**: Fully responsive design that works on all devices
- **Smooth Animations**: Framer Motion animations for enhanced user experience
- **Brand Consistency**: Uses the established brand colors and typography

### 🛒 E-commerce Functionality
- **Product Gallery**: Image carousel with thumbnail navigation
- **Variant Selection**: Support for product variants (color, size, etc.)
- **Add to Cart**: Integrated with existing cart system
- **Price Display**: Dynamic pricing with currency formatting
- **Stock Status**: Product availability indicators

### 📱 Performance & SEO
- **SSR Support**: Server-side rendering for better SEO
- **Dynamic Metadata**: SEO-optimized metadata generation
- **Image Optimization**: Next.js Image component with lazy loading
- **Static Generation**: Pre-generated pages for better performance

### 🔧 Technical Features
- **TypeScript**: Full type safety throughout
- **Form Validation**: React Hook Form with Zod validation
- **GraphQL Integration**: Seamless integration with Vendure backend
- **Modular Architecture**: Components under 300 lines each
- **Accessibility**: ARIA labels and keyboard navigation support

## Usage

### Basic Implementation

```tsx
import { ProductPage } from '@/components/product/product-page';

export default function ProductPageRoute({ params }) {
  const product = await getProduct(params.slug);
  const relatedProducts = await getRelatedProducts(product.id);
  
  return (
    <ProductPage 
      product={product} 
      relatedProducts={relatedProducts}
    />
  );
}
```

### Individual Components

```tsx
import { ProductHero } from '@/components/product/product-hero';
import { ProductGallery } from '@/components/product/product-gallery';

// Use individual components as needed
<ProductHero product={product} />
<ProductGallery product={product} />
```

## Data Requirements

### Product Object Structure
```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset?: Asset;
  assets: Asset[];
  variants: ProductVariant[];
}

interface Asset {
  id: string;
  preview: string;
  source: string;
  width?: number;
  height?: number;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: string;
}
```

## Customization

### Styling
- All components use Tailwind CSS classes
- Brand colors are defined in `globals.css`
- Custom animations are in `lib/animations.ts`

### Content
- Mock data can be replaced with real API calls
- Review data is currently mocked but can be integrated with a review system
- Related products logic can be enhanced with category-based recommendations

### Features
- Add more product variants (materials, finishes, etc.)
- Implement wishlist functionality
- Add product comparison feature
- Integrate with review/rating system

## Dependencies

- **Next.js 13.5+**: App Router, Image optimization
- **Framer Motion**: Animations and transitions
- **React Hook Form**: Form handling
- **Zod**: Form validation
- **Radix UI**: Accessible UI components
- **Lucide React**: Icons
- **Embla Carousel**: Image gallery carousel

## Performance Considerations

- Images are optimized with Next.js Image component
- Components are lazy-loaded where appropriate
- Animations are GPU-accelerated
- Static generation for better SEO and performance
- Minimal bundle size with tree-shaking

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Touch-friendly interactions
- Keyboard navigation support
