import { gql } from 'graphql-request';
import { PRODUCT_FRAGMENT, ORDER_FRAGMENT, ASSET_FRAGMENT, SEARCH_RESULT_ASSET_FRAGMENT, PRODUCT_VARIANT_FRAGMENT } from './fragments';

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
  ${SEARCH_RESULT_ASSET_FRAGMENT}
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
          ...SearchResultAsset
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

export const GET_PRODUCT_DETAILS = gql`
  ${ASSET_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  query GetProductDetails($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        ...Asset
      }
      assets {
        ...Asset
      }
      variants {
        ...ProductVariant
        product {
          id
          name
          slug
        }
      }
      customFields {
        materials
        dimensions
        weight
        color
        assembly
        warranty
      }
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
      customFields
    }
  }
`;

export const GET_ALL_PRODUCTS = gql`
    query GetAllProducts {
      products {
        items {
          id
          name
          slug
          featuredAsset {
            id
            preview
          }
        }
        totalItems
      }
    }
`;

export const GET_ELIGIBLE_SHIPPING_METHODS = gql`
  query GetEligibleShippingMethods {
    eligibleShippingMethods {
      id
      code
      name
      description
      price
      priceWithTax
      metadata
    }
  }
`;

export const GET_ORDER_BY_CODE = gql`
  ${ORDER_FRAGMENT}
  query GetOrderByCode($code: String!) {
    orderByCode(code: $code) {
      ...Order
    }
  }
`;

export const GET_NEXT_ORDER_STATES = gql`
  query GetNextOrderStates {
    nextOrderStates
  }
`;
