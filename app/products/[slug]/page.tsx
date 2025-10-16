import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug, getAllProducts } from '@/lib/vendure-server';
import { ProductPage } from '@/components/product/product-page';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const result = await getProductBySlug(params.slug);

    if (!result.data?.product) {
      return {
        title: 'Product Not Found | Florida Homes Furniture',
        description: 'The requested product could not be found.',
      };
    }

    const product = result.data.product;
    const price = product.variants?.[0]?.priceWithTax 
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: product.variants[0].currencyCode,
        }).format(product.variants[0].priceWithTax / 100)
      : 'Price available on request';

    return {
      title: `${product.name} | Florida Homes Furniture`,
      description: product.description || `Discover ${product.name} - Quality furniture for your home. ${price}`,
      keywords: `furniture, ${product.name}, home decor, quality furniture, Florida furniture`,
      openGraph: {
        title: `${product.name} | Florida Homes Furniture`,
        description: product.description || `Quality ${product.name} for your home`,
        type: 'website',
        images: product.featuredAsset?.preview ? [
          {
            url: product.featuredAsset.preview,
            width: product.featuredAsset.width || 800,
            height: product.featuredAsset.height || 600,
            alt: product.name,
          }
        ] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | Florida Homes Furniture`,
        description: product.description || `Quality ${product.name} for your home`,
        images: product.featuredAsset?.preview ? [product.featuredAsset.preview] : [],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Product | Florida Homes Furniture',
      description: 'Quality furniture for your home',
    };
  }
}

export async function generateStaticParams() {
  try {
    const result = await getAllProducts();

    return result.data?.products?.items?.map((product) => ({
      slug: product.slug,
    })) || [];
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function ProductPageRoute({ params }: ProductPageProps) {
  try {
    const result = await getProductBySlug(params.slug);

    if (!result.data?.product) {
      notFound();
    }

    // Get related products (same category or random products)
    const relatedProductsResult = await getAllProducts();

    const relatedProducts = relatedProductsResult.data?.products?.items
      ?.filter(p => p.id !== result.data.product.id)
      .slice(0, 4) || [];

    return (
      <ProductPage 
        product={result.data.product} 
        relatedProducts={relatedProducts}
      />
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
