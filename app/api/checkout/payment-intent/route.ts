// app/api/checkout/payment-intent/route.ts
import { fetchGraphQL } from "@/lib/vendure-server";
import { gql } from "graphql-request";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { TRANSITION_ORDER_TO_STATE } from "@/lib/graphql/mutations";
import { GET_NEXT_ORDER_STATES, GET_ELIGIBLE_PAYMENT_METHODS, GET_ORDER_FOR_PAYMENT } from "@/lib/graphql/queries";

const SHOP_API = process.env.VENDURE_SHOP_API_URL || "http://localhost:3000/shop-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emailAddress: bodyEmail } = body;

    const cookieHeader = req.headers.get("cookie") || "";
    const sessionToken = cookieHeader
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("session="))
      ?.split("=")[1];

    if (!sessionToken) {
      return NextResponse.json({ error: "Session token not found" }, { status: 400 });
    }

    // 1) Lee la orden como SIEMPRE hacías (tu helper ya usa SHOP_API correcto)
    const orderRes = await fetchGraphQL({ query: GET_ORDER_FOR_PAYMENT }, { req, cookie: cookieHeader });
    const order = orderRes.data?.activeOrder;

    if (!order) {
      return NextResponse.json({ error: "No active order found" }, { status: 400 });
    }

    const customerEmail = bodyEmail || order.customer?.emailAddress;
    const hasShippingAddress = !!(order.shippingAddress?.streetLine1 && order.shippingAddress?.city && order.shippingAddress?.postalCode);
    const hasShippingMethod = (order.shippingLines?.length ?? 0) > 0;

    if (!customerEmail || !hasShippingAddress || !hasShippingMethod) {
      return NextResponse.json({
        error: "Order incomplete",
        details: {
          customerEmail: !!customerEmail,
          shippingAddress: !!hasShippingAddress,
          shippingMethod: !!hasShippingMethod,
        },
      }, { status: 400 });
    }

    // 2) Usa SIEMPRE el mismo host + cookie que ya tienes (evita NEXT_PUBLIC_* aquí)
    const vendureShopFetch = async <T>(query: string, variables: Record<string, any> = {}) => {
      const res = await fetch(SHOP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: cookieHeader },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json();
      if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join("; "));
      return json.data as T;
    };

    // 3) Verifica next states y transiciona, pero si falla, devuelve el motivo real
    const next = await vendureShopFetch<{ nextOrderStates: string[] }>(GET_NEXT_ORDER_STATES);

    if (order.state === "AddingItems" && next.nextOrderStates.includes("ArrangingPayment")) {
      const res = await vendureShopFetch<any>(TRANSITION_ORDER_TO_STATE, { state: "ArrangingPayment" });

      if (res.transitionOrderToState.__typename !== "Order") {
        // <-- verás transitionError, fromState, toState en la respuesta
        return NextResponse.json({
          error: "Cannot transition to ArrangingPayment",
          reason: res.transitionOrderToState.transitionError || res.transitionOrderToState.message,
          details: {
            errorCode: res.transitionOrderToState.errorCode,
            from: res.transitionOrderToState.fromState,
            to: res.transitionOrderToState.toState,
          },
        }, { status: 409 });
      }
    }

    // (Opcional) Asegura que el PaymentMethod 'stripe-payment' es elegible
    const pm = await vendureShopFetch<{ eligiblePaymentMethods: { code: string; isEligible: boolean; eligibilityMessage?: string }[] }>(GET_ELIGIBLE_PAYMENT_METHODS);
    const stripeEligible = pm.eligiblePaymentMethods.find(m => m.code === "stripe-payment");
    if (!stripeEligible?.isEligible) {
      return NextResponse.json({
        error: "Payment method not eligible",
        details: stripeEligible?.eligibilityMessage || "Create/enable the PaymentMethod 'stripe-payment' for this channel",
      }, { status: 400 });
    }

    // 4) Crea el PaymentIntent con metadata (orderCode + sessionToken)
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Payment system not configured" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY /* , { apiVersion: '2024-06-20' } */);

    const pi = await stripe.paymentIntents.create({
      amount: order.totalWithTax,
      currency: (order.currencyCode || "USD").toLowerCase(),
      metadata: {
        orderCode: order.code,
        orderId: order.id,
        customerEmail,
        sessionToken, // la usará el webhook
      },
      description: `Order ${order.code}`,
      receipt_email: customerEmail,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      orderCode: order.code,
      total: order.totalWithTax,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create payment intent", details: err?.message ?? String(err) }, { status: 500 });
  }
}
