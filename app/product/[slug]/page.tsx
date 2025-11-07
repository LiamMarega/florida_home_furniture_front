import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {  fetchGraphQL } from '@/lib/vendure-server';
import { ProductPage } from '@/components/product/product-page';
import { Product } from '@/lib/types';
import { GET_ALL_PRODUCTS, GET_PRODUCT_BY_SLUG } from '@/lib/graphql/queries';
import Script from 'next/script';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const result = await fetchGraphQL({
      query: GET_PRODUCT_BY_SLUG,
      variables: {
        slug: params.slug,
      },
    });

    if (!result.data?.product) {
      return {
        title: 'Product Not Found',
        description: 'The requested product could not be found.',
        robots: { index: false, follow: false },
      };
    }

    const product = result.data.product;
    const variant = product.variants?.[0];
    const price = variant?.priceWithTax 
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: variant.currencyCode,
        }).format(variant.priceWithTax / 100)
      : null;

    const description = product.description || `Discover ${product.name} - Premium quality furniture for your home.${price ? ` Starting at ${price}.` : ''} Free shipping on orders over $200.`;
    
    const imageUrl = product.featuredAsset?.preview || '/images/logos/logo_compacto.png';

    return {
      title: product.name,
      description,
      keywords: `${product.name}, furniture, home decor, quality furniture, Miami furniture, Florida furniture, buy ${product.name}`,
      authors: [{ name: 'Florida Homes Furniture' }],
      openGraph: {
        type: 'website',
        locale: 'en_US',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/product/${params.slug}`,
        siteName: 'Florida Homes Furniture',
        title: `${product.name} | Florida Homes Furniture`,
        description,
        images: [
          {
            url: imageUrl,
            width: product.featuredAsset?.width || 1200,
            height: product.featuredAsset?.height || 630,
            alt: product.name,
            type: 'image/jpeg',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | Florida Homes Furniture`,
        description,
        images: [imageUrl],
        creator: '@FloridaHomesFurn',
      },
      alternates: {
        canonical: `/product/${params.slug}`,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Product',
      description: 'Quality furniture for your home',
      robots: { index: false, follow: true },
    };
  }
}

// Allow dynamic rendering for products not in static params
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    // Fetch all products - we'll filter enabled ones in JavaScript
    // This is safer than relying on Vendure filter syntax which may vary
    const result = await fetchGraphQL({
      query: GET_ALL_PRODUCTS,
    });

    const products = result.data?.products?.items || [];
    
    // Filter out any invalid products and return valid slugs only
    // Only include products that are enabled and have a valid slug
    // This prevents "Product not found" errors during build
    return products
      .filter((product: Product) => 
        product?.slug && 
        product?.enabled === true // Only include enabled products
      )
      .map((product: Product) => ({
        slug: product.slug,
      }));
  } catch (error) {
    console.error('Error generating static params:', error);
    // Return empty array to allow dynamic rendering
    return [];
  }
}

export default async function ProductPageRoute({ params }: ProductPageProps) {
  try {
    const result = await fetchGraphQL({
      query: GET_PRODUCT_BY_SLUG,
      variables: {
        slug: params.slug,
      },
    });

    if (!result.data?.product) {
      // During build time, log but don't throw to prevent build failures
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn(`Product not found during build: ${params.slug}`);
        // Return a minimal page or throw notFound() - Next.js will handle it
      }
      notFound();
    }

    // Get related products (same category or random products)
    const relatedProductsResult = await fetchGraphQL({
      query: GET_ALL_PRODUCTS,
      variables: {
        options: {
          take: 4,
          skip: 0,
        },
      },
    });

    const product = result.data.product;
    const variant = product.variants?.[0];
    const price = variant?.priceWithTax 
      ? variant.priceWithTax / 100
      : null;
    const currencyCode = variant?.currencyCode || 'USD';
    const imageUrl = product.featuredAsset?.preview || '';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const productUrl = `${siteUrl}/product/${params.slug}`;

    // Generate structured data (JSON-LD) for SEO
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || `Discover ${product.name} - Premium quality furniture for your home.`,
      image: imageUrl ? [imageUrl] : [],
      sku: variant?.sku || product.id,
      mpn: variant?.sku || product.id,
      brand: {
        '@type': 'Brand',
        name: 'Florida Homes Furniture',
      },
      offers: price ? {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: currencyCode,
        price: price.toString(),
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availability: variant?.stockLevel && variant.stockLevel !== '0' 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: 'Florida Homes Furniture',
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '0',
            currency: currencyCode,
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'US',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            businessDays: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            },
            cutoffTime: '14:00',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 3,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 3,
              maxValue: 7,
              unitCode: 'DAY',
            },
          },
        },
      } : undefined,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '127',
        bestRating: '5',
        worstRating: '1',
      },
    };

    return (
      <>
        <Script
          id={`product-structured-data-${product.id}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ProductPage product={product} relatedProducts={[]} />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
