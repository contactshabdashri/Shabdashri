import { supabase } from "@/lib/supabase";

export type CreateGatewayOrderResponse = {
  paymentOrderId: string;
  paymentToken: string;
  razorpayOrderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  checkoutKeyId: string;
  productTitle: string;
  merchantName: string;
};

export type PaymentStatusResponse = {
  status: "created" | "client_authorized" | "success" | "failed" | "cancelled";
  failureReason: string | null;
  amount: number;
  productTitle: string;
  updatedAt: string;
};

export type SubmitGatewayPaymentPayload = {
  paymentToken: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  gatewayEvent: "checkout_success" | "payment_failed" | "checkout_dismissed";
  failureReason?: string;
};

function resolveFunctionError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string" && error.trim()) return new Error(error);
  return new Error(fallback);
}

export async function createGatewayOrder(productId: string): Promise<CreateGatewayOrderResponse> {
  const { data, error } = await supabase.functions.invoke<CreateGatewayOrderResponse>(
    "create-razorpay-order",
    { body: { productId } }
  );

  if (error || !data) {
    throw resolveFunctionError(error, "Unable to create payment order.");
  }

  return data;
}

export async function submitGatewayPayment(
  payload: SubmitGatewayPaymentPayload
): Promise<{ status: PaymentStatusResponse["status"] }> {
  const { data, error } = await supabase.functions.invoke<{ status: PaymentStatusResponse["status"] }>(
    "submit-razorpay-payment",
    { body: payload }
  );

  if (error || !data) {
    throw resolveFunctionError(error, "Unable to submit payment details.");
  }

  return data;
}

export async function getGatewayPaymentStatus(paymentToken: string): Promise<PaymentStatusResponse> {
  const { data, error } = await supabase.functions.invoke<PaymentStatusResponse>(
    "payment-status",
    { body: { paymentToken } }
  );

  if (error || !data) {
    throw resolveFunctionError(error, "Unable to fetch payment status.");
  }

  return data;
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      "script[data-razorpay-checkout='true']"
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

