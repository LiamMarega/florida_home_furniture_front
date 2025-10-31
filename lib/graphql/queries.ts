import { gql } from 'graphql-request';
import { 
  PRODUCT_FRAGMENT, 
  ORDER_FRAGMENT, 
  ASSET_FRAGMENT, 
  PRODUCT_VARIANT_FRAGMENT,
  CUSTOMER_FRAGMENT 
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

export const ELIGIBLE_SHIPPING_METHODS = /* GraphQL */ `
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
  query GetActiveCustomer {
    activeCustomer {
      ...Customer
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
          state
          active
          orderPlacedAt
          currencyCode
          totalWithTax
          shippingAddress {
            fullName
            streetLine1
            streetLine2
            city
            province
            postalCode
            countryCode
          }
          lines {
            id
            quantity
            productVariant {
              id
              name
              featuredAsset {
                preview
              }
            }
            unitPriceWithTax
            linePriceWithTax
          }
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



export const ADD_PAYMENT_TO_ORDER = gql`
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      __typename
      ... on Order {
        id code state totalWithTax currencyCode
      }
      ... on ErrorResult { errorCode message }
    }
  }
`;