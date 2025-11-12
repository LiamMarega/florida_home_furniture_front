import { gql } from 'graphql-request';
import { 
  PRODUCT_FRAGMENT, 
  ORDER_FRAGMENT, 
  ASSET_FRAGMENT, 
  PRODUCT_VARIANT_FRAGMENT,
  CUSTOMER_FRAGMENT,
  SHIPPING_METHOD_QUOTE
} from './fragments';



export const GET_PRODUCT_BY_SLUG = gql`
  ${PRODUCT_FRAGMENT}
  query GetProductBySlug($slug: String!) {
    product(slug: $slug) {
      ...Product
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


export const GET_ALL_PRODUCTS = gql`
  ${PRODUCT_FRAGMENT}
  query GetAllProducts($options: ProductListOptions) {
    products(options: $options) {
      items {
        ...Product
      }
      totalItems
    }
  }
`;

export const GET_PRODUCTS_PAGINATED = gql`
  ${ASSET_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  query GetProductsPaginated($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        createdAt
        updatedAt
        languageCode
        name
        slug
        description
        enabled
        featuredAsset {
          ...Asset
        }
        variants {
          ...ProductVariant
        }
        collections {
          id
          name
          slug
        }
      }
      totalItems
    }
  }
`;

/**
 * Search products with facet filtering
 * Uses Vendure search query which supports facetsFilter
 */
export const SEARCH_PRODUCTS_BY_FACETS = gql`
  query SearchProductsByFacets($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productName
        slug
        productAsset {
          id
          preview
          focalPoint {
            x
            y
          }
        }
        productVariantId
        productVariantName
        priceWithTax {
          ... on SinglePrice {
            value
          }
          ... on PriceRange {
            min
            max
          }
        }
        currencyCode
        description
      }
    }
  }
`;

/**
 * Get products by their IDs
 * Used to fetch full product data after getting product IDs from search
 */
export const GET_PRODUCTS_BY_IDS = gql`
  ${ASSET_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  query GetProductsByIds($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        createdAt
        updatedAt
        languageCode
        name
        slug
        description
        enabled
        featuredAsset {
          ...Asset
        }
        variants {
          ...ProductVariant
        }
        facetValues {
          id
          name
          code
          facet {
            id
            name
            code
          }
        }
        collections {
          id
          name
          slug
        }
      }
      totalItems
    }
  }
`;

export const ELIGIBLE_SHIPPING_METHODS = gql`
  ${SHIPPING_METHOD_QUOTE}
  query EligibleShippingMethods {
    eligibleShippingMethods {
      ...ShippingMethodQuoteFields
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






export const GET_ACTIVE_CUSTOMER = gql`
  ${CUSTOMER_FRAGMENT}
  query GetActiveCustomer($orderOptions: OrderListOptions) {
    activeCustomer {
      ...Customer
      orders(options: $orderOptions) {
        items {
          id
          code
          createdAt
          updatedAt
          state
          active
          orderPlacedAt
          currencyCode
          totalQuantity
          subTotal
          subTotalWithTax
          shipping
          shippingWithTax
          total
          totalWithTax
          shippingAddress {
            fullName
            company
            streetLine1
            streetLine2
            city
            province
            postalCode
            countryCode
            phoneNumber
          }
          billingAddress {
            fullName
            company
            streetLine1
            streetLine2
            city
            province
            postalCode
            countryCode
            phoneNumber
          }
          lines {
            id
            quantity
            linePrice
            linePriceWithTax
            unitPrice
            unitPriceWithTax
            discountedUnitPrice
            discountedUnitPriceWithTax
            productVariant {
              id
              name
              sku
              product {
                id
                name
                slug
                featuredAsset {
                  id
                  preview
                  source
                }
              }
              featuredAsset {
                id
                preview
                source
              }
            }
            featuredAsset {
              id
              preview
              source
            }
            customFields
          }
          payments {
            id
            createdAt
            method
            amount
            state
            errorMessage
            metadata
          }
          fulfillments {
            id
            createdAt
            updatedAt
            method
            trackingCode
            state
            lines {
              orderLine {
                id
              }
              quantity
            }
          }
          discounts {
            description
            amount
            amountWithTax
          }
          couponCodes
        }
        totalItems
      }
    }
  }
`;

export const GET_CUSTOMER_ORDERS = gql`
  query GetCustomerOrders($options: OrderListOptions) {
    activeCustomer {
      id
      orders(options: $options) {
        items {
          id
          code
          createdAt
          updatedAt
          state
          active
          orderPlacedAt
          currencyCode
          totalQuantity
          subTotal
          subTotalWithTax
          shipping
          shippingWithTax
          total
          totalWithTax
          shippingAddress {
            fullName
            company
            streetLine1
            streetLine2
            city
            province
            postalCode
            countryCode
            phoneNumber
          }
          billingAddress {
            fullName
            company
            streetLine1
            streetLine2
            city
            province
            postalCode
            countryCode
            phoneNumber
          }
          lines {
            id
            quantity
            linePrice
            linePriceWithTax
            unitPrice
            unitPriceWithTax
            discountedUnitPrice
            discountedUnitPriceWithTax
            productVariant {
              id
              name
              sku
              product {
                id
                name
                slug
                featuredAsset {
                  id
                  preview
                  source
                }
              }
              featuredAsset {
                id
                preview
                source
              }
            }
            featuredAsset {
              id
              preview
              source
            }
            customFields
          }
          payments {
            id
            createdAt
            method
            amount
            state
            errorMessage
            metadata
          }
          fulfillments {
            id
            createdAt
            updatedAt
            method
            trackingCode
            state
            lines {
              orderLine {
                id
              }
              quantity
            }
          }
          discounts {
            description
            amount
            amountWithTax
          }
          couponCodes
        }
        totalItems
      }
    }
  }
`;

export const GET_ACTIVE_ORDER_FOR_PAYMENT = gql`
  query GetActiveOrderForPayment {
    activeOrder {
      id
      code
      state
      totalWithTax
      currencyCode
      customer { id emailAddress }
    }
  }
`;

export const AUTH_STATE_QUERY = gql`
  query AuthState {
    me {
      id
      identifier
    }
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
      phoneNumber
    }
    activeOrder {
      id
      code
      state
      total
      lines {
        id
        quantity
        productVariant {
          id
          name
          price
        }
      }
    }
  }
`;

export const GET_FACETS = gql`
  query GetFacets {
    facets {
      items {
        id
        name
        code
        values {
          id
          name
          code
        }
      }
    }
  }
`;

export const COUNT_PRODUCTS_BY_FACET_VALUE = gql`
  query CountProductsByFacetValue($facetValueIds: [ID!]!) {
    products(options: { 
      filter: { 
        facetValueIds: $facetValueIds 
      },
      take: 1
    }) {
      totalItems
    }
  }
`;

export const GET_COLLECTION_BY_SLUG = gql`
  query GetCollectionBySlug($slug: String!) {
    collection(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
      productVariants {
        totalItems
      }
    }
  }
`;

export const GET_COLLECTIONS = gql`
  query GetCollections($options: CollectionListOptions) {
    collections(options: $options) {
      items {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
        }
        productVariants {
          totalItems
        }
      }
      totalItems
    }
  }
`;

export const GET_ACTIVE_ORDER_STATE = gql`
  query ActiveOrderState {
    activeOrder {
      id
      code
      state
    }
  }
`;