import { gql } from 'graphql-request';
import { ORDER_FRAGMENT, CUSTOMER_FRAGMENT, ORDER_BASIC_FRAGMENT } from './fragments';

export const ADD_ITEM_TO_ORDER = gql`
  mutation AddItemToOrder($productVariantId: ID!, $qty: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $qty) {
      ... on Order {
        ...OrderSummary
      }
      ... on ErrorResult {
        errorCode
        message
      }
      ... on InsufficientStockError {
        errorCode
        message
      }
    }
  }
`;

export const ADJUST_ORDER_LINE = gql`
  ${ORDER_BASIC_FRAGMENT}
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ... on Order {
        ...OrderBasic
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const REMOVE_ORDER_LINE = gql`
  ${ORDER_BASIC_FRAGMENT}
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        ...OrderBasic
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;


export const SET_CUSTOMER_FOR_ORDER = gql`
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        id
        code
        customer {
          id
          firstName
          lastName
          emailAddress
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const SET_ORDER_SHIPPING_ADDRESS = gql`
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      __typename
      ... on Order {
        ...OrderWithAddresses
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;
export const TRANSITION_ORDER_TO_STATE = gql`
  ${ORDER_FRAGMENT}
  mutation TransitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        ...Order
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
      }
    }
  }
`;

export const SET_ORDER_SHIPPING_METHOD = /* GraphQL */ `
  mutation SetOrderShippingMethod($ids: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $ids) {
      __typename
      ... on Order {
        ...OrderPricingSummary
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
      ... on IneligibleShippingMethodError {
        errorCode
        message
      }
    }
  }
`;

export const SET_ORDER_BILLING_ADDRESS = gql`
  mutation SetOrderBillingAddress($input: CreateAddressInput!) {
    setOrderBillingAddress(input: $input) {
      __typename
      ... on Order {
        ...OrderWithAddresses
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

export const ADD_PAYMENT_TO_ORDER = gql`
  ${ORDER_FRAGMENT}
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        ...Order
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;



export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
    }
  }
`;

