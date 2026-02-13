import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { hmacSha256, safeEqual } from "../_shared/crypto.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type SubmitPaymentBody = {
  paymentToken?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  gatewayEvent?: "checkout_success" | "payment_failed" | "checkout_dismissed";
  failureReason?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: "Supabase server configuration missing" });
    }

    if (!razorpayKeySecret) {
      return jsonResponse(500, { error: "Razorpay key secret is not configured" });
    }

    let body: SubmitPaymentBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    const paymentToken = body.paymentToken?.trim();
    const razorpayOrderId = body.razorpayOrderId?.trim();
    const gatewayEvent = body.gatewayEvent ?? "checkout_success";

    if (!paymentToken || !razorpayOrderId) {
      return jsonResponse(400, { error: "paymentToken and razorpayOrderId are required" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("payment_orders")
      .select("id, status, razorpay_order_id")
      .eq("public_token", paymentToken)
      .single();

    if (fetchError || !existing) {
      return jsonResponse(404, { error: "Payment order not found" });
    }

    if (existing.razorpay_order_id !== razorpayOrderId) {
      return jsonResponse(400, { error: "Razorpay order mismatch" });
    }

    if (gatewayEvent === "checkout_dismissed") {
      const { error: updateError } = await supabaseAdmin
        .from("payment_orders")
        .update({
          status: "cancelled",
          failure_reason: body.failureReason || "checkout_dismissed",
          gateway_payload: {
            source: "submit-razorpay-payment",
            gateway_event: gatewayEvent,
          },
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to mark checkout dismissed:", updateError);
        return jsonResponse(500, { error: "Unable to update payment status" });
      }

      return jsonResponse(200, { status: "cancelled" });
    }

    if (gatewayEvent === "payment_failed") {
      const { error: updateError } = await supabaseAdmin
        .from("payment_orders")
        .update({
          status: "failed",
          failure_reason: body.failureReason || "payment_failed",
          razorpay_payment_id: body.razorpayPaymentId || null,
          gateway_payload: {
            source: "submit-razorpay-payment",
            gateway_event: gatewayEvent,
          },
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to mark payment failed:", updateError);
        return jsonResponse(500, { error: "Unable to update payment status" });
      }

      return jsonResponse(200, { status: "failed" });
    }

    const razorpayPaymentId = body.razorpayPaymentId?.trim();
    const razorpaySignature = body.razorpaySignature?.trim();

    if (!razorpayPaymentId || !razorpaySignature) {
      return jsonResponse(400, {
        error: "razorpayPaymentId and razorpaySignature are required for checkout_success",
      });
    }

    const signaturePayload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = await hmacSha256(razorpayKeySecret, signaturePayload);
    const signatureMatches = safeEqual(expectedSignature, razorpaySignature);

    if (!signatureMatches) {
      const { error: updateError } = await supabaseAdmin
        .from("payment_orders")
        .update({
          status: "failed",
          failure_reason: "signature_verification_failed",
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          gateway_payload: {
            source: "submit-razorpay-payment",
            gateway_event: gatewayEvent,
          },
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to mark signature verification failure:", updateError);
      }

      return jsonResponse(400, { error: "Signature verification failed" });
    }

    const { error: updateError } = await supabaseAdmin
      .from("payment_orders")
      .update({
        status: existing.status === "success" ? "success" : "client_authorized",
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        failure_reason: null,
        gateway_payload: {
          source: "submit-razorpay-payment",
          gateway_event: gatewayEvent,
        },
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Failed to update payment authorization:", updateError);
      return jsonResponse(500, { error: "Unable to update payment status" });
    }

    return jsonResponse(200, { status: "client_authorized" });
  } catch (error) {
    console.error("Unhandled submit-razorpay-payment error:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});

