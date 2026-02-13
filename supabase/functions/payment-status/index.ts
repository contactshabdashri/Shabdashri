import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type PaymentStatusBody = {
  paymentToken?: string;
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
      .select("status, failure_reason, amount, product_title, updated_at")
      .eq("public_token", paymentToken)
      .single();

    if (error || !data) {
      return jsonResponse(404, { error: "Payment order not found" });
    }

    return jsonResponse(200, {
      status: data.status,
      failureReason: data.failure_reason,
      amount: data.amount,
      productTitle: data.product_title,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error("Unhandled payment-status error:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});

