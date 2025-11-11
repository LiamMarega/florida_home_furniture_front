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
  fragment OrderLine on OrderLine {
    id
    quantity
    linePriceWithTax
    productVariant {
      id
      name
      sku
      product {
        id
        name
        featuredAsset {
          id
          preview
        }
      }
    }
  }
`;

export const ORDER_SUMMARY_FRAGMENT = gql`
  fragment OrderSummary on Order {
    id
    code
    state
    active
    total
    totalWithTax
    currencyCode
    lines {
      ...OrderLine
    }
    shippingWithTax
    subTotalWithTax
    discounts {
      description
      amountWithTax
      adjustmentSource
    }
  }
  ${ORDER_LINE_FRAGMENT}
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

export const ADDRESS_FIELDS = gql`
  fragment AddressFields on OrderAddress {
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
`;

export const ORDER_WITH_ADDRESSES = gql`
  fragment OrderWithAddresses on Order {
    id
    code
    state
    shippingAddress { ...AddressFields }
    billingAddress { ...AddressFields }
    totalWithTax
    currencyCode
  }
  ${ADDRESS_FIELDS}
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
  ${ADDRESS_FIELDS}
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
    customer { ...Customer }

    # ⬇️ Antes: ...OrderAddress (WRONG)
    shippingAddress { ...AddressFields }
    billingAddress  { ...AddressFields }

    lines { ...OrderLine }

    surcharges {
      id
      description
      sku
      taxLines { description taxRate }
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
    promotions { id name description couponCode }
    payments { ...Payment }
    fulfillments {
      id
      state
      method
      trackingCode
      lines { orderLine { id } quantity }
    }
    totalQuantity
    subTotal
    subTotalWithTax
    currencyCode
    shippingLines { ...ShippingLine }
    shipping
    shippingWithTax
    total
    totalWithTax
    taxSummary { description taxRate taxBase taxTotal }
    customFields
  }
`;


export const SHIPPING_METHOD_QUOTE = gql`
  fragment ShippingMethodQuoteFields on ShippingMethodQuote {
    id
    price
    priceWithTax
    description
    name
    metadata
  }
`;

export const ORDER_PRICING_SUMMARY = gql`
  fragment OrderPricingSummary on Order {
    id
    code
    state
    shippingWithTax
    subTotalWithTax
    totalWithTax
    currencyCode
  }
`;

export const ORDER_BASIC_FRAGMENT = gql`
  fragment OrderBasic on Order {
    id
    code
    state
    totalWithTax
    currencyCode
    lines {
      id
      quantity
      linePriceWithTax
      productVariant {
        id
        name
        sku
        product {
          id
          name
          featuredAsset {
            id
            preview
          }
        }
      }
    }
  }
`;