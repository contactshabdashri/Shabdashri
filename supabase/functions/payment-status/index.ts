import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type PaymentStatusBody = {
  paymentToken?: string;
};

type RazorpayOrderPaymentsResponse = {
  items?: Array<{
    id?: string;
    status?: string;
    captured?: boolean;
    error_description?: string;
  }>;
};

type ReconciledStatus = {
  status: "success" | "client_authorized" | "failed";
  paymentId: string | null;
  failureReason: string | null;
};

function reconcileFromRazorpayPayments(
  payments: RazorpayOrderPaymentsResponse
): ReconciledStatus | null {
  const items = payments.items ?? [];
  if (items.length === 0) return null;

  const captured = items.find(
    (item) => item.captured === true || item.status === "captured"
  );
  if (captured) {
    return {
      status: "success",
      paymentId: captured.id ?? null,
      failureReason: null,
    };
  }

  const authorized = items.find((item) => item.status === "authorized");
  if (authorized) {
    return {
      status: "client_authorized",
      paymentId: authorized.id ?? null,
      failureReason: null,
    };
  }

  const failed = items.find((item) => item.status === "failed");
  if (failed) {
    return {
      status: "failed",
      paymentId: failed.id ?? null,
      failureReason: failed.error_description || "payment_failed",
    };
  }

  return null;
}

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

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: "Supabase server configuration missing" });
    }

    let body: PaymentStatusBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    const paymentToken = body.paymentToken?.trim();
    if (!paymentToken) {
      return jsonResponse(400, { error: "paymentToken is required" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabaseAdmin
      .from("payment_orders")
      .select("id, status, failure_reason, amount, product_title, updated_at, razorpay_order_id, razorpay_payment_id")
      .eq("public_token", paymentToken)
      .single();

    if (error || !data) {
      return jsonResponse(404, { error: "Payment order not found" });
    }

    let finalStatus = data.status;
    let failureReason = data.failure_reason;
    let updatedAt = data.updated_at;

    if (data.status === "created" || data.status === "client_authorized") {
      const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
      const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

      if (razorpayKeyId && razorpayKeySecret && data.razorpay_order_id) {
        const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const razorpayRes = await fetch(
          `https://api.razorpay.com/v1/orders/${data.razorpay_order_id}/payments`,
          {
            headers: {
              Authorization: `Basic ${basicAuth}`,
            },
          }
        );

        if (razorpayRes.ok) {
          const paymentsPayload = (await razorpayRes.json()) as RazorpayOrderPaymentsResponse;
          const reconciled = reconcileFromRazorpayPayments(paymentsPayload);

          if (reconciled) {
            const { data: updatedOrder, error: updateError } = await supabaseAdmin
              .from("payment_orders")
              .update({
                status: reconciled.status,
                razorpay_payment_id: reconciled.paymentId ?? data.razorpay_payment_id,
                failure_reason: reconciled.failureReason,
                gateway_payload: {
                  source: "payment-status-reconcile",
                  reconciled_at: new Date().toISOString(),
                  razorpay_order_id: data.razorpay_order_id,
                },
              })
              .eq("id", data.id)
              .select("status, failure_reason, updated_at")
              .single();

            if (!updateError && updatedOrder) {
              finalStatus = updatedOrder.status;
              failureReason = updatedOrder.failure_reason;
              updatedAt = updatedOrder.updated_at;
            }
          }
        }
      }
    }

    return jsonResponse(200, {
      status: finalStatus,
      failureReason,
      amount: data.amount,
      productTitle: data.product_title,
      updatedAt,
    });
  } catch (error) {
    console.error("Unhandled payment-status error:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});
