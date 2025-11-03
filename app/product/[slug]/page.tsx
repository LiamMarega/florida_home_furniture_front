import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {  fetchGraphQL } from '@/lib/vendure-server';
import { ProductPage } from '@/components/product/product-page';
import { Product } from '@/lib/types';
import { GET_ALL_PRODUCTS, GET_PRODUCT_BY_SLUG } from '@/lib/graphql/queries';

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
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/products/${params.slug}`,
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

export async function generateStaticParams() {
  try {
    const result = await fetchGraphQL({
      query: GET_ALL_PRODUCTS,
    });

    return result.data?.products?.items?.map((product: Product) => ({
      slug: product.slug,
    })) || [];
  } catch (error) {
    console.error('Error generating static params:', error);
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

    return <ProductPage product={result.data.product} relatedProducts={[]} />;
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
