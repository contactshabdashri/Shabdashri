import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type CreateOrderBody = {
  productId?: string;
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
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
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: "Supabase server configuration missing" });
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return jsonResponse(500, { error: "Razorpay keys are not configured" });
    }

    let body: CreateOrderBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    const productId = body.productId?.trim();
    if (!productId) {
      return jsonResponse(400, { error: "productId is required" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id,title,price")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return jsonResponse(404, { error: "Product not found" });
    }

    const amount = Number(product.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse(400, { error: "Invalid product amount" });
    }

    const amountPaise = Math.round(amount * 100);
    if (amountPaise < 1000) {
      return jsonResponse(400, {
        error: "Minimum payable amount is Rs 10 for gateway checkout.",
      });
    }
    const receipt = `shb_${Date.now()}_${product.id.slice(0, 6)}`;
    const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayOrderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt,
        notes: {
          product_id: product.id,
          product_title: product.title,
        },
      }),
    });

    if (!razorpayOrderRes.ok) {
      const errorText = await razorpayOrderRes.text();
      console.error("Razorpay order creation failed:", errorText);

      try {
        const parsed = JSON.parse(errorText) as { error?: { description?: string } };
        const description = parsed.error?.description?.trim();
        if (description) {
          return jsonResponse(502, { error: description });
        }
      } catch {
        // no-op, fallback message below
      }

      return jsonResponse(502, { error: "Unable to create payment order" });
    }

    const razorpayOrder = (await razorpayOrderRes.json()) as RazorpayOrderResponse;

    const { data: insertedOrder, error: insertError } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        product_id: product.id,
        product_title: product.title,
        amount,
        amount_paise: amountPaise,
        currency: "INR",
        status: "created",
        razorpay_order_id: razorpayOrder.id,
        gateway_payload: {
          source: "create-razorpay-order",
          razorpay_order: razorpayOrder,
        },
      })
      .select("id, public_token")
      .single();

    if (insertError || !insertedOrder) {
      console.error("Insert payment order failed:", insertError);
      return jsonResponse(500, { error: "Unable to store payment order" });
    }

    return jsonResponse(200, {
      paymentOrderId: insertedOrder.id,
      paymentToken: insertedOrder.public_token,
      razorpayOrderId: razorpayOrder.id,
      amount,
      amountPaise,
      currency: "INR",
      checkoutKeyId: razorpayKeyId,
      productTitle: product.title,
      merchantName: "Shabdashri",
    });
  } catch (error) {
    console.error("Unhandled create-razorpay-order error:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});
