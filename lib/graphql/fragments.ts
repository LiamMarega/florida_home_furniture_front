import { gql } from 'graphql-request';

export const ASSET_FRAGMENT = gql`
  fragment Asset on Asset {
    id
    preview
    source
    width
    height
  }
`;

export const PRODUCT_VARIANT_FRAGMENT = gql`
  fragment ProductVariant on ProductVariant {
    id
    name
    sku
    price
    priceWithTax
    currencyCode
    stockLevel
  }
`;

export const PRODUCT_FRAGMENT = gql`
  ${ASSET_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  fragment Product on Product {
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
    }
  }
`;

export const ORDER_LINE_FRAGMENT = gql`
  ${ASSET_FRAGMENT}
  fragment OrderLine on OrderLine {
    id
    quantity
    linePrice
    linePriceWithTax
    unitPrice
    unitPriceWithTax
    productVariant {
      id
      name
      sku
      price
      priceWithTax
      product {
        id
        name
        slug
        featuredAsset {
          ...Asset
        }
      }
    }
  }
`;

export const SEARCH_RESULT_ASSET_FRAGMENT = gql`
  fragment SearchResultAsset on SearchResultAsset {
    id
    preview
    source
    width
    height
  }
`;

export const ORDER_FRAGMENT = gql`
  ${ORDER_LINE_FRAGMENT}
  fragment Order on Order {
    id
    code
    state
    active
    createdAt
    updatedAt
    total
    totalWithTax
    subTotal
    subTotalWithTax
    currencyCode
    shipping
    shippingWithTax
    customer {
      id
      firstName
      lastName
      emailAddress
    }
    shippingAddress {
      fullName
      company
      streetLine1
      streetLine2
      city
      province
      postalCode
      country
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
      country
      phoneNumber
    }
    shippingLines {
      shippingMethod {
        id
        code
        name
        description
      }
      priceWithTax
    }
    payments {
      id
      state
      method
      amount
      transactionId
      errorMessage
      metadata
    }
    lines {
      ...OrderLine
    }
  }
`;
