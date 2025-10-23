import { gql } from 'graphql-request';

export const ASSET_FRAGMENT = gql`
  fragment Asset on Asset {
    id
    createdAt
    updatedAt
    name
    type
    fileSize
    mimeType
    width
    height
    source
    preview
    focalPoint {
      x
      y
    }
    tags {
      id
      value
    }
    customFields
  }
`;

export const PRODUCT_VARIANT_FRAGMENT = gql`
  fragment ProductVariant on ProductVariant {
    id
    productId
    createdAt
    updatedAt
    languageCode
    sku
    name
    featuredAsset {
      ...Asset
    }
    assets {
      ...Asset
    }
    price
    currencyCode
    priceWithTax
    stockLevel
    taxRateApplied {
      id
      name
      value
    }
    taxCategory {
      id
      name
      isDefault
    }
    options {
      id
      code
      name
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
    customFields
  }
`;

export const PRODUCT_FRAGMENT = gql`
  ${ASSET_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  fragment Product on Product {
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
    assets {
      ...Asset
    }
    variants {
      ...ProductVariant
    }
    optionGroups {
      id
      code
      name
      options {
        id
        code
        name
      }
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
    customFields
  }
`;

export const ORDER_LINE_FRAGMENT = gql`
  ${ASSET_FRAGMENT}
  fragment OrderLine on OrderLine {
    id
    createdAt
    updatedAt
    productVariant {
      id
      name
      sku
      price
      priceWithTax
      currencyCode
      stockLevel
      product {
        id
        name
        slug
        featuredAsset {
          ...Asset
        }
      }
    }
    featuredAsset {
      ...Asset
    }
    unitPrice
    unitPriceWithTax
    unitPriceChangeSinceAdded
    unitPriceWithTaxChangeSinceAdded
    discountedUnitPrice
    discountedUnitPriceWithTax
    proratedUnitPrice
    proratedUnitPriceWithTax
    quantity
    orderPlacedQuantity
    taxRate
    linePrice
    linePriceWithTax
    discountedLinePrice
    discountedLinePriceWithTax
    proratedLinePrice
    proratedLinePriceWithTax
    lineTax
    discounts {
      adjustmentSource
      type
      description
      amount
      amountWithTax
    }
    taxLines {
      description
      taxRate
    }
    customFields
  }
`;

export const SEARCH_RESULT_ASSET_FRAGMENT = gql`
  fragment SearchResultAsset on SearchResultAsset {
    id
    preview
    focalPoint {
      x
      y
    }
  }
`;

export const CUSTOMER_FRAGMENT = gql`
  fragment Customer on Customer {
    id
    createdAt
    updatedAt
    title
    firstName
    lastName
    phoneNumber
    emailAddress
    addresses {
      id
      fullName
      company
      streetLine1
      streetLine2
      city
      province
      postalCode
      country {
        id
        code
        name
      }
      phoneNumber
      defaultShippingAddress
      defaultBillingAddress
    }
    customFields
  }
`;

export const ORDER_ADDRESS_FRAGMENT = gql`
  fragment OrderAddress on OrderAddress {
    fullName
    company
    streetLine1
    streetLine2
    city
    province
    postalCode
    country
    countryCode
    phoneNumber
    customFields
  }
`;

export const SHIPPING_LINE_FRAGMENT = gql`
  fragment ShippingLine on ShippingLine {
    id
    shippingMethod {
      id
      code
      name
      description
    }
    price
    priceWithTax
    discountedPrice
    discountedPriceWithTax
    discounts {
      adjustmentSource
      type
      description
      amount
      amountWithTax
    }
    customFields
  }
`;

export const PAYMENT_FRAGMENT = gql`
  fragment Payment on Payment {
    id
    createdAt
    updatedAt
    method
    amount
    state
    transactionId
    errorMessage
    refunds {
      id
      items
      shipping
      adjustment
      total
      method
      state
      transactionId
      reason
    }
    metadata
    customFields
  }
`;

export const ORDER_FRAGMENT = gql`
  ${ORDER_LINE_FRAGMENT}
  ${CUSTOMER_FRAGMENT}
  ${ORDER_ADDRESS_FRAGMENT}
  ${SHIPPING_LINE_FRAGMENT}
  ${PAYMENT_FRAGMENT}
  fragment Order on Order {
    id
    createdAt
    updatedAt
    type
    orderPlacedAt
    code
    state
    active
    customer {
      ...Customer
    }
    shippingAddress {
      ...OrderAddress
    }
    billingAddress {
      ...OrderAddress
    }
    lines {
      ...OrderLine
    }
    surcharges {
      id
      description
      sku
      taxLines {
        description
        taxRate
      }
      price
      priceWithTax
      taxRate
    }
    discounts {
      adjustmentSource
      type
      description
      amount
      amountWithTax
    }
    couponCodes
    promotions {
      id
      name
      description
      couponCode
    }
    payments {
      ...Payment
    }
    fulfillments {
      id
      state
      method
      trackingCode
      lines {
        orderLine {
          id
        }
        quantity
      }
    }
    totalQuantity
    subTotal
    subTotalWithTax
    currencyCode
    shippingLines {
      ...ShippingLine
    }
    shipping
    shippingWithTax
    total
    totalWithTax
    taxSummary {
      description
      taxRate
      taxBase
      taxTotal
    }
    customFields
  }
`;
