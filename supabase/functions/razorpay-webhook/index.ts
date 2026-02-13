import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { hmacSha256, safeEqual } from "../_shared/crypto.ts";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        error_description?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
        status?: string;
      };
    };
  };
};

function mapEventToStatus(eventName: string): "success" | "failed" | "client_authorized" | null {
  if (eventName === "payment.captured" || eventName === "order.paid") return "success";
  if (eventName === "payment.failed") return "failed";
  if (eventName === "payment.authorized") return "client_authorized";
  return null;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayWebhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseServiceRoleKey || !razorpayWebhookSecret) {
      return new Response(JSON.stringify({ error: "Webhook configuration missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const signatureHeader = req.headers.get("x-razorpay-signature")?.trim();
    if (!signatureHeader) {
      return new Response(JSON.stringify({ error: "Missing webhook signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const expectedSignature = await hmacSha256(razorpayWebhookSecret, rawBody);
    const signatureMatches = safeEqual(expectedSignature, signatureHeader);

    if (!signatureMatches) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const eventName = payload.event ?? "";
    const mappedStatus = mapEventToStatus(eventName);

    if (!mappedStatus) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id ?? null;

    if (!razorpayOrderId) {
      return new Response(JSON.stringify({ error: "No order id in webhook payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const failureReason =
      mappedStatus === "failed"
        ? paymentEntity?.error_description || "payment_failed"
        : null;

    const { error: updateError } = await supabaseAdmin
      .from("payment_orders")
      .update({
        status: mappedStatus,
        razorpay_payment_id: razorpayPaymentId,
        failure_reason: failureReason,
        gateway_payload: {
          source: "razorpay-webhook",
          event: eventName,
          payload,
        },
      })
      .eq("razorpay_order_id", razorpayOrderId);

    if (updateError) {
      console.error("Webhook DB update failed:", updateError);
      return new Response(JSON.stringify({ error: "Unable to update payment order" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unhandled razorpay-webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

