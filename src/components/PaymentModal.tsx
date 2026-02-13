import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  MessageCircle,
  Smartphone,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product } from "@/data/products";
import {
  formatTransactionNote,
  generateGPayDeeplink,
  generatePhonePeDeeplink,
  generatePhonePeIntentUrl,
  generateUPIDeeplink,
  generateUPIPaymentString,
  getUPIId,
} from "@/lib/upi";

interface PaymentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const WHATSAPP_NUMBER = "918767980311";

function createOrderId(): string {
  const now = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SHB${now}${random}`;
}

function isValidUTR(value: string): boolean {
  return /^\d{10,18}$/.test(value.trim());
}

export function PaymentModal({ product, isOpen, onClose }: PaymentModalProps) {
  const [utr, setUtr] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);
  const [appHint, setAppHint] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setUtr("");
    setConfirmChecked(false);
    setShowValidation(false);
    setOrderId(createOrderId());
    setCopied(false);
    setAppHint("");
  }, [isOpen]);

  const amount = useMemo(() => {
    if (!product) return 0;
    const parsed = Number(product.price);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
  }, [product]);

  const transactionNote = useMemo(() => {
    if (!product) return "";
    return formatTransactionNote(product.title);
  }, [product]);

  const upiPaymentString = useMemo(() => {
    if (!product) return "";
    return generateUPIPaymentString(amount, transactionNote);
  }, [product, amount, transactionNote]);

  const upiDeeplink = useMemo(() => {
    if (!product) return "";
    return generateUPIDeeplink(amount, transactionNote);
  }, [product, amount, transactionNote]);

  const gpayDeeplink = useMemo(() => {
    if (!product) return "";
    return generateGPayDeeplink(amount, transactionNote);
  }, [product, amount, transactionNote]);

  const phonePeDeeplink = useMemo(() => {
    if (!product) return "";
    return generatePhonePeDeeplink(amount, transactionNote);
  }, [product, amount, transactionNote]);

  const phonePeIntentUrl = useMemo(() => {
    if (!product) return "";
    return generatePhonePeIntentUrl(amount, transactionNote);
  }, [product, amount, transactionNote]);

  if (!isOpen || !product) return null;

  const utrValid = isValidUTR(utr);
  const canSubmit = utrValid && confirmChecked;
  const utrError = showValidation && !utrValid
    ? "Enter a valid numeric UTR (10 to 18 digits)."
    : "";

  const openDeeplink = (link: string) => {
    setAppHint("");
    window.location.href = link;
  };

  const openPhonePe = () => {
    setAppHint("");

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes("android");

    if (isAndroid) {
      window.location.href = phonePeIntentUrl;
      window.setTimeout(() => {
        window.location.href = upiDeeplink;
        setAppHint("PhonePe did not open. Choose PhonePe from the UPI app picker.");
      }, 900);
      return;
    }

    window.location.href = phonePeDeeplink;
    window.setTimeout(() => {
      window.location.href = upiDeeplink;
      setAppHint("If PhonePe does not open on this device/browser, use UPI App or scan QR.");
    }, 900);
  };

  const copyUPIId = async () => {
    try {
      await navigator.clipboard.writeText(getUPIId());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleWhatsApp = () => {
    setShowValidation(true);
    if (!canSubmit) return;

    const message = encodeURIComponent(
      `Hello Shabdashri,\n\nI have completed payment.\n\nOrder ID: ${orderId}\nAmount: Rs ${amount}\nUTR: ${utr.trim()}\nProduct: ${product.title}\n\nPlease share my design files.`
    );

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md max-h-[92vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-heading font-bold text-lg text-foreground">Secure Payment Confirmation</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex gap-3 p-3 bg-secondary rounded-xl">
            <img
              src={product.previewImage}
              alt={product.title}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground line-clamp-2">{product.title}</h3>
              <p className="text-2xl font-bold text-primary mt-1">Rs {amount}</p>
              <p className="text-xs text-muted-foreground mt-1">Order ID: {orderId}</p>
            </div>
          </div>

          <div className="text-center bg-card rounded-xl border border-primary/20 p-4">
            <h3 className="font-heading font-semibold text-foreground mb-3">Scan QR Code to Pay</h3>
            <div className="inline-block bg-white p-3 rounded-xl border border-border">
              <QRCodeSVG
                value={upiPaymentString}
                size={192}
                includeMargin
                level="M"
                bgColor="#ffffff"
                fgColor="#111111"
                title={`UPI payment for ${product.title}`}
                className="w-44 h-44 sm:w-48 sm:h-48"
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              UPI ID: <span className="font-semibold text-foreground">{getUPIId()}</span>
            </p>
            <button
              type="button"
              onClick={copyUPIId}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy UPI ID"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="outline" className="gap-2" onClick={() => openDeeplink(upiDeeplink)}>
              <Smartphone className="h-4 w-4" />
              UPI App
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => openDeeplink(gpayDeeplink)}>
              <Smartphone className="h-4 w-4" />
              GPay
            </Button>
            <Button variant="outline" className="gap-2" onClick={openPhonePe}>
              <Smartphone className="h-4 w-4" />
              PhonePe
            </Button>
          </div>
          {appHint && <p className="text-xs text-muted-foreground">{appHint}</p>}

          <div>
            <label htmlFor="utr" className="text-sm font-medium text-foreground block mb-2">
              Enter UTR Number
            </label>
            <input
              id="utr"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Enter 12-digit UTR number"
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={18}
            />
            <p className={`mt-1 text-xs ${utrError ? "text-destructive" : "text-muted-foreground"}`}>
              {utrError || "UTR must be numeric and 10 to 18 digits."}
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 bg-secondary rounded-xl">
            <Checkbox
              checked={confirmChecked}
              onCheckedChange={(checked) => setConfirmChecked(Boolean(checked))}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              I confirm I paid the exact amount and entered the correct UTR for verification.
            </span>
          </label>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                Security note: your file is shared only after manual payment verification using this UTR.
              </p>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                If UPI app shows bank limit/debit error, retry from another UPI app or lower amount as per your bank limit.
              </p>
            </div>
          </div>

          <Button className="w-full gap-2 h-11" onClick={handleWhatsApp} disabled={!canSubmit}>
            <MessageCircle className="h-5 w-5" />
            Submit UTR on WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}

