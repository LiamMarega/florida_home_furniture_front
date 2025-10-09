import { gql } from 'graphql-request';
import { PRODUCT_FRAGMENT, ORDER_FRAGMENT, ASSET_FRAGMENT } from './fragments';

export const GET_PRODUCTS = gql`
  ${PRODUCT_FRAGMENT}
  query GetProducts($options: ProductListOptions) {
    products(options: $options) {
      items {
        ...Product
      }
      totalItems
    }
  }
`;

export const SEARCH_PRODUCTS = gql`
  ${ASSET_FRAGMENT}
  query SearchProducts($input: SearchInput!) {
    search(input: $input) {
      items {
        productId
        productName
        slug
        description
        priceWithTax {
          ... on PriceRange {
            min
            max
          }
          ... on SinglePrice {
            value
          }
        }
        currencyCode
        productAsset {
          ...Asset
        }
      }
      totalItems
    }
  }
`;

export const GET_PRODUCT_BY_SLUG = gql`
  ${PRODUCT_FRAGMENT}
  query GetProductBySlug($slug: String!) {
    product(slug: $slug) {
      ...Product
    }
  }
`;

export const GET_COLLECTIONS = gql`
  ${ASSET_FRAGMENT}
  query GetCollections($options: CollectionListOptions) {
    collections(options: $options) {
      items {
        id
        name
        slug
        description
        featuredAsset {
          ...Asset
        }
      }
      totalItems
    }
  }
`;

export const GET_COLLECTION_BY_SLUG = gql`
  ${ASSET_FRAGMENT}
  ${PRODUCT_FRAGMENT}
  query GetCollectionBySlug($slug: String!, $options: ProductListOptions) {
    collection(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        ...Asset
      }
      productVariants(options: $options) {
        items {
          id
          name
          sku
          price
          priceWithTax
          currencyCode
          product {
            ...Product
          }
        }
        totalItems
      }
    }
  }
`;

export const GET_ACTIVE_ORDER = gql`
  ${ORDER_FRAGMENT}
  query GetActiveOrder {
    activeOrder {
      ...Order
    }
  }
`;

export const GET_ACTIVE_CUSTOMER = gql`
  query GetActiveCustomer {
    activeCustomer {
      id
      title
      firstName
      lastName
      emailAddress
    }
  }
`;
