import { gql } from 'graphql-request';
import { ORDER_FRAGMENT } from './fragments';

export const ADD_ITEM_TO_ORDER = gql`
  ${ORDER_FRAGMENT}
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
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

export const ADJUST_ORDER_LINE = gql`
  ${ORDER_FRAGMENT}
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
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

export const REMOVE_ORDER_LINE = gql`
  ${ORDER_FRAGMENT}
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
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

export const REMOVE_ALL_ORDER_LINES = gql`
  ${ORDER_FRAGMENT}
  mutation RemoveAllOrderLines {
    removeAllOrderLines {
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

export const SET_CUSTOMER_FOR_ORDER = gql`
  ${ORDER_FRAGMENT}
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
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

export const SET_ORDER_SHIPPING_ADDRESS = gql`
  ${ORDER_FRAGMENT}
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
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

export const SET_ORDER_SHIPPING_METHOD = gql`
  ${ORDER_FRAGMENT}
  mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
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

export const SET_ORDER_BILLING_ADDRESS = gql`
  ${ORDER_FRAGMENT}
  mutation SetOrderBillingAddress($input: CreateAddressInput!) {
    setOrderBillingAddress(input: $input) {
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

export const CREATE_PAYMENT_INTENT = gql`
  mutation CreateStripePaymentIntent($orderCode: String!) {
    createStripePaymentIntent(orderCode: $orderCode)
  }
`;