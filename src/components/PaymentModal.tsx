import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/data/products";
import { getUPIId } from "@/lib/upi";
import {
  createGatewayOrder,
  getGatewayPaymentStatus,
  loadRazorpayCheckoutScript,
  submitGatewayPayment,
  type CreateGatewayOrderResponse,
} from "@/lib/payments";

interface PaymentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

type UiStatus =
  | "idle"
  | "creating_order"
  | "checkout_open"
  | "verifying"
  | "success"
  | "failed";

const WHATSAPP_NUMBER = "918767980311";
const VERIFICATION_POLL_ATTEMPTS = 30;
const VERIFICATION_POLL_MS = 2000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function PaymentModal({ product, isOpen, onClose }: PaymentModalProps) {
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [gatewayOrder, setGatewayOrder] = useState<CreateGatewayOrderResponse | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const isActiveRef = useRef(false);
  const pollAbortRef = useRef(false);
  const whatsappRedirectedRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = isOpen;
    if (!isOpen) {
      pollAbortRef.current = true;
      whatsappRedirectedRef.current = false;
      setUiStatus("idle");
      setStatusMessage("");
      setGatewayOrder(null);
      setRedirectCountdown(null);
      return;
    }

    pollAbortRef.current = false;
    whatsappRedirectedRef.current = false;
    setUiStatus("idle");
    setStatusMessage("");
    setGatewayOrder(null);
    setRedirectCountdown(null);

    return () => {
      isActiveRef.current = false;
      pollAbortRef.current = true;
    };
  }, [isOpen]);

  const amount = useMemo(() => {
    if (!product) return 0;
    const parsed = Number(product.price);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
  }, [product]);

  const whatsappMessage = useMemo(() => {
    if (!product) return "";
    const orderRef = gatewayOrder?.razorpayOrderId || "N/A";
    return encodeURIComponent(
      `Payment successful, please send item/product.\n\nOrder Ref: ${orderRef}\nProduct: ${product.title}\nAmount: Rs ${amount}`
    );
  }, [amount, gatewayOrder?.razorpayOrderId, product]);

  const openWhatsApp = useCallback(() => {
    if (!product || whatsappRedirectedRef.current) return;
    whatsappRedirectedRef.current = true;
    window.location.assign(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`);
  }, [product, whatsappMessage]);

  useEffect(() => {
    if (!isOpen || uiStatus !== "success" || redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      openWhatsApp();
      return;
    }

    const timer = window.setTimeout(() => {
      setRedirectCountdown((current) => (current === null ? null : current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isOpen, openWhatsApp, redirectCountdown, uiStatus]);

  const pollFinalStatus = useCallback(async (paymentToken: string) => {
    for (let attempt = 0; attempt < VERIFICATION_POLL_ATTEMPTS; attempt += 1) {
      if (pollAbortRef.current) return;

      let statusResponse;
      try {
        statusResponse = await getGatewayPaymentStatus(paymentToken);
      } catch (error) {
        if (attempt === VERIFICATION_POLL_ATTEMPTS - 1) {
          throw error;
        }
        await wait(VERIFICATION_POLL_MS);
        continue;
      }

      if (statusResponse.status === "success") {
        if (!isActiveRef.current) return;
        setUiStatus("success");
        setStatusMessage("Payment successful.");
        setRedirectCountdown(3);
        return;
      }

      if (statusResponse.status === "failed" || statusResponse.status === "cancelled") {
        if (!isActiveRef.current) return;
        setUiStatus("failed");
        setStatusMessage(
          statusResponse.failureReason || "Payment unsuccessful, please try again."
        );
        setRedirectCountdown(null);
        return;
      }

      await wait(VERIFICATION_POLL_MS);
    }

    if (!isActiveRef.current) return;
    setUiStatus("failed");
    setStatusMessage(
      "Payment verification timed out. If amount was debited, contact support with your order reference."
    );
    setRedirectCountdown(null);
  }, []);

  const startAutoVerifiedPayment = async () => {
    if (!product) return;

    pollAbortRef.current = false;
    setUiStatus("creating_order");
    setStatusMessage("");
    setRedirectCountdown(null);

    try {
      const order = await createGatewayOrder(product.id);
      if (!isActiveRef.current) return;
      setGatewayOrder(order);

      const sdkLoaded = await loadRazorpayCheckoutScript();
      if (!sdkLoaded) {
        throw new Error("Unable to load secure payment SDK. Please refresh and try again.");
      }

      if (!(window as any).Razorpay) {
        throw new Error("Payment SDK unavailable. Please try again.");
      }

      if (!isActiveRef.current) return;
      setUiStatus("checkout_open");

      const razorpayInstance = new (window as any).Razorpay({
        key: order.checkoutKeyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: order.merchantName,
        description: `Purchase: ${order.productTitle}`,
        order_id: order.razorpayOrderId,
        notes: {
          payment_token: order.paymentToken,
          product_id: product.id,
        },
        retry: { enabled: true },
        theme: { color: "#0f766e" },
        modal: {
          ondismiss: async () => {
            if (!isActiveRef.current) return;

            try {
              await submitGatewayPayment({
                paymentToken: order.paymentToken,
                razorpayOrderId: order.razorpayOrderId,
                gatewayEvent: "checkout_dismissed",
                failureReason: "checkout_dismissed",
              });
            } catch (error) {
              console.error("Failed to mark dismissed checkout:", error);
            }

            if (!isActiveRef.current) return;
            setUiStatus("failed");
            setStatusMessage("Payment popup was closed. Please try again.");
            setRedirectCountdown(null);
          },
        },
        handler: async (response: any) => {
          if (!isActiveRef.current) return;
          setUiStatus("verifying");
          setStatusMessage("Verifying payment with gateway...");

          try {
            await submitGatewayPayment({
              paymentToken: order.paymentToken,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              gatewayEvent: "checkout_success",
            });
          } catch (error) {
            if (!isActiveRef.current) return;
            setUiStatus("failed");
            setStatusMessage(
              getErrorMessage(error, "Payment verification failed. Please retry.")
            );
            return;
          }

          try {
            await pollFinalStatus(order.paymentToken);
          } catch (error) {
            if (!isActiveRef.current) return;
            setUiStatus("failed");
            setStatusMessage(
              getErrorMessage(error, "Payment verification failed. Please retry.")
            );
          }
        },
      });

      razorpayInstance.on("payment.failed", async (response: any) => {
        const failureReason =
          response?.error?.description || "Payment unsuccessful, please try again.";

        try {
          await submitGatewayPayment({
            paymentToken: order.paymentToken,
            razorpayOrderId: order.razorpayOrderId,
            razorpayPaymentId: response?.error?.metadata?.payment_id,
            gatewayEvent: "payment_failed",
            failureReason,
          });
        } catch (error) {
          console.error("Failed to submit payment.failed state:", error);
        }

        if (!isActiveRef.current) return;
        setUiStatus("failed");
        setStatusMessage(failureReason);
        setRedirectCountdown(null);
      });

      razorpayInstance.open();
    } catch (error) {
      if (!isActiveRef.current) return;
      setUiStatus("failed");
      setStatusMessage(getErrorMessage(error, "Unable to start payment. Please try again."));
      setRedirectCountdown(null);
    }
  };

  if (!isOpen || !product) return null;

  const isBusy =
    uiStatus === "creating_order" ||
    uiStatus === "checkout_open" ||
    uiStatus === "verifying";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md max-h-[92vh] overflow-y-auto animate-scale-in pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-heading font-bold text-lg text-foreground">Secure UPI Checkout</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
            <div className={`rounded-md px-2 py-1 text-center border ${uiStatus !== "idle" ? "bg-primary/10 border-primary/20 text-foreground" : "bg-muted border-border text-muted-foreground"}`}>
              1. Order
            </div>
            <div className={`rounded-md px-2 py-1 text-center border ${uiStatus === "checkout_open" || uiStatus === "verifying" || uiStatus === "success" || uiStatus === "failed" ? "bg-primary/10 border-primary/20 text-foreground" : "bg-muted border-border text-muted-foreground"}`}>
              2. Pay
            </div>
            <div className={`rounded-md px-2 py-1 text-center border ${uiStatus === "verifying" || uiStatus === "success" || uiStatus === "failed" ? "bg-primary/10 border-primary/20 text-foreground" : "bg-muted border-border text-muted-foreground"}`}>
              3. Verify
            </div>
          </div>

          <div className="flex gap-3 p-3 bg-secondary rounded-xl">
            <img
              src={product.previewImage}
              alt={product.title}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground line-clamp-2">{product.title}</h3>
              <p className="text-2xl font-bold text-primary mt-1">Rs {amount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                UPI ID: <span className="font-medium">{getUPIId()}</span>
              </p>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                Real-time gateway verification is enabled. This supports UPI apps like Google Pay and PhonePe with webhook-confirmed status.
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="w-full h-11 text-sm sm:text-base"
            onClick={startAutoVerifiedPayment}
            disabled={isBusy}
          >
            {uiStatus === "creating_order" && (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Secure Order...
              </>
            )}
            {uiStatus === "checkout_open" && (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Waiting For Payment...
              </>
            )}
            {uiStatus === "verifying" && (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying Payment...
              </>
            )}
            {(uiStatus === "idle" || uiStatus === "failed" || uiStatus === "success") &&
              `Pay Rs ${amount} (GPay / PhonePe / UPI)`}
          </Button>

          {uiStatus === "verifying" && (
            <p className="text-xs text-muted-foreground text-center">
              Checking webhook confirmation. Please keep this page open.
            </p>
          )}

          {uiStatus === "success" && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  {statusMessage || "Payment successful."} Redirecting to WhatsApp in{" "}
                  {redirectCountdown ?? 0} seconds.
                </p>
              </div>
              <Button type="button" className="w-full gap-2" onClick={openWhatsApp}>
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp Now
              </Button>
            </div>
          )}

          {uiStatus === "failed" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  {statusMessage || "Payment unsuccessful, please try again."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={startAutoVerifiedPayment}
                disabled={isBusy}
              >
                Try Payment Again
              </Button>
            </div>
          )}

          {gatewayOrder?.razorpayOrderId && (
            <p className="text-[11px] text-muted-foreground text-center">
              Order Ref: {gatewayOrder.razorpayOrderId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

