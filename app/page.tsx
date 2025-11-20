import { HeroNew } from '@/components/hero-new';
import { ProductsGrid } from '@/components/products-grid';
import { PremiumCollection } from '@/components/premium-collection';
import { TrustSection } from '@/components/trust-section';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_PRODUCTS_PAGINATED, GET_COLLECTIONS } from '@/lib/graphql/queries';

// Cache configuration for the page
export const revalidate = 60; // Revalidate every minute

async function getInitialData() {
  try {
    const productOptions = {
      take: 20,
      skip: 0,
      sort: { createdAt: 'DESC' }
    };

    const collectionOptions = {
      take: 4
    };

    // Run fetches in parallel
    const [productsRes, collectionsRes] = await Promise.all([
      fetchGraphQL({
        query: GET_PRODUCTS_PAGINATED,
        variables: { options: productOptions },
      }, { revalidate: 60 }),
      fetchGraphQL({
        query: GET_COLLECTIONS,
        variables: { options: collectionOptions },
      }, { revalidate: 60 })
    ]);

    const products = productsRes.data?.products?.items || [];
    const totalItems = productsRes.data?.products?.totalItems || 0;
    const totalPages = Math.ceil(totalItems / 20);

    const rawCollections = collectionsRes.data?.collections?.items || [];
    const collections = rawCollections
      .filter((c: any) => c.slug !== '__root_collection__')
      .map((c: any) => ({
        id: c.id,
        title: c.name,
        slug: c.slug,
        description: c.description || '',
        image: c.featuredAsset?.preview || '',
        productCount: c.productVariants?.totalItems || 0,
        href: `/collections/${c.slug}`,
      }));

    return {
      products,
      totalItems,
      totalPages,
      collections
    };
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
    return { products: [], totalItems: 0, totalPages: 0, collections: [] };
  }
}

export default async function Home() {
  const { products, totalItems, totalPages, collections } = await getInitialData();

  return (
    <main className="w-full">
      <HeroNew />

      <PremiumCollection initialCollections={collections} />

      <ProductsGrid 
        initialProducts={products}
        initialPagination={{
          totalItems,
          totalPages
        }}
      />

      <TrustSection />

    </main>
  );
}
