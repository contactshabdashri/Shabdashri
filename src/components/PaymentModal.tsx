import { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle, CheckCircle2, MessageCircle, Clock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeSVG } from "qrcode.react";
import type { Product } from "@/data/products";
import {
  generateUPIPaymentString,
  generateUPIDeeplink,
  generateGPayDeeplink,
  generatePhonePeDeeplink,
  formatTransactionNote,
} from "@/lib/upi";

interface PaymentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_DURATION = 30; // seconds

export function PaymentModal({ product, isOpen, onClose }: PaymentModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);
  const [isTimerComplete, setIsTimerComplete] = useState(false);

  // Timer effect
  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(TIMER_DURATION);
      setIsTimerComplete(false);
      return;
    }

    if (timeRemaining <= 0) {
      setIsTimerComplete(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeRemaining]);

  // Generate UPI payment string and QR code data
  // Must be called before early return to follow Rules of Hooks
  const upiPaymentString = useMemo(() => {
    if (!product) return "";
    const transactionNote = formatTransactionNote(product.title);
    return generateUPIPaymentString(product.price, transactionNote);
  }, [product?.price, product?.title]);

  const upiDeeplink = useMemo(() => {
    if (!product) return "";
    const transactionNote = formatTransactionNote(product.title);
    return generateUPIDeeplink(product.price, transactionNote);
  }, [product?.price, product?.title]);

  const gpayDeeplink = useMemo(() => {
    if (!product) return "";
    const transactionNote = formatTransactionNote(product.title);
    return generateGPayDeeplink(product.price, transactionNote);
  }, [product?.price, product?.title]);

  const phonePeDeeplink = useMemo(() => {
    if (!product) return "";
    const transactionNote = formatTransactionNote(product.title);
    return generatePhonePeDeeplink(product.price, transactionNote);
  }, [product?.price, product?.title]);

  if (!isOpen || !product) return null;

  const handleUPIClick = () => {
    window.location.href = upiDeeplink;
  };

  const handleGPayClick = () => {
    window.location.href = gpayDeeplink;
  };

  const handlePhonePeClick = () => {
    window.location.href = phonePeDeeplink;
  };

  const handleWhatsAppClick = () => {
    if (!isConfirmed) {
      setShowError(true);
      return;
    }
    const message = encodeURIComponent(
      `Hi, I have paid ₹${product.price} for PSD design: ${product.title}. Please share the file.`
    );
    window.open(`https://wa.me/918767980311?text=${message}`, "_blank");
    onClose();
    setIsConfirmed(false);
    setShowError(false);
  };

  const handleClose = () => {
    onClose();
    setIsConfirmed(false);
    setShowError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-modal max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-heading font-bold text-lg text-foreground">
            Complete Payment
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="flex gap-4 p-4 bg-secondary rounded-xl">
            <img
              src={product.previewImage}
              alt={product.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2">
                {product.title}
              </h3>
              <p className="text-2xl font-bold text-primary mt-1">₹{product.price}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center">
            <h3 className="font-heading font-semibold text-foreground mb-3">
              Scan QR Code to Pay
            </h3>
            <div className="bg-card p-4 rounded-xl inline-block border-2 border-primary/20">
              <QRCodeSVG
                value={upiPaymentString}
                size={192}
                level="H"
                includeMargin={true}
                className="mx-auto"
              />
            </div>
            <p className="mt-3 text-lg font-bold text-primary">
              Pay ₹{product.price} Only via UPI
            </p>
            
            {/* Payment App Buttons */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleGPayClick}
              >
                <Smartphone className="h-4 w-4" />
                Pay with GPay
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handlePhonePeClick}
              >
                <Smartphone className="h-4 w-4" />
                Pay with PhonePe
              </Button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Important Notice</p>
                <p className="text-sm text-destructive/90 mt-1">
                  Partial payments are <strong>NOT accepted</strong>.
                  Please pay the exact amount of <strong>₹{product.price}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Note */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Design will be shared only after full payment verification.
                You will receive the PSD file on WhatsApp within minutes!
              </p>
            </div>
          </div>

          {/* Timer & Confirmation Checkbox */}
          <div className="space-y-2">
            {!isTimerComplete ? (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  Please complete payment. Confirmation available in <strong className="text-foreground">{timeRemaining}s</strong>
                </span>
              </div>
            ) : (
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
                <Checkbox
                  checked={isConfirmed}
                  onCheckedChange={(checked) => {
                    setIsConfirmed(checked as boolean);
                    if (checked) setShowError(false);
                  }}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground">
                  I confirm that I have paid the full amount of <strong>₹{product.price}</strong> via UPI
                </span>
              </label>
            )}

            {showError && (
              <p className="text-destructive text-sm font-medium flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="h-4 w-4" />
                Please pay the full ₹{product.price} to continue
              </p>
            )}
          </div>

          {/* WhatsApp Button */}
          <Button
            className="w-full gap-2 h-12 text-base"
            onClick={handleWhatsAppClick}
            disabled={!isConfirmed}
          >
            <MessageCircle className="h-5 w-5" />
            Send Payment Confirmation on WhatsApp
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By clicking above, you agree to our terms and conditions
          </p>
        </div>
      </div>
    </div>
  );
}