import { authed } from "../auth/api";

export type ShippingMethod = "standard" | "express";

export interface PlaceOrderInput {
  items: { productId: string; size: string; qty: number }[]; // no prices: the server decides them
  shippingMethod: ShippingMethod;
  address: { firstName: string; lastName: string; line1: string; city: string; postalCode: string; country: string; phone: string };
}

export interface Order {
  id: string;
  number: string;
  items: { productId: string; name: string; size: string; qty: number; unitPriceCents: number; lineTotalCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

/**
 * The idempotency key is made ONCE per checkout and reused on every retry of that checkout.
 * If the first request reached the server but the reply was lost, the retry gets the same order
 * back instead of charging twice.
 */
export const placeOrder = (input: PlaceOrderInput, idempotencyKey: string) =>
  authed<{ order: Order }>("/orders", { method: "POST", body: input, headers: { "Idempotency-Key": idempotencyKey } });
