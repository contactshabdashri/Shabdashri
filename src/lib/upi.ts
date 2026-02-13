/**
 * UPI Payment Utilities
 * Generates UPI payment strings and deep links for dynamic QR codes
 */

const UPI_ID = import.meta.env.VITE_UPI_ID || "vishalshinde8747@okhdfcbank";
const MERCHANT_NAME = import.meta.env.VITE_MERCHANT_NAME || "Shabdashri";

function getFormattedAmount(amount: number): string {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
  return safeAmount.toFixed(2);
}

function buildUpiParams(amount: number, transactionNote: string): URLSearchParams {
  return new URLSearchParams({
    pa: UPI_ID || "vishalshinde8747@okhdfcbank",
    pn: MERCHANT_NAME,
    am: getFormattedAmount(amount),
    cu: "INR",
    tn: transactionNote,
  });
}

/**
 * Generate UPI payment string
 * Format: upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR&tn=<TRANSACTION_NOTE>
 */
export function generateUPIPaymentString(
  amount: number,
  transactionNote: string
): string {
  if (!UPI_ID) {
    console.warn("VITE_UPI_ID not configured. Using placeholder.");
  }

  const params = buildUpiParams(amount, transactionNote);

  return `upi://pay?${params.toString()}`;
}

/**
 * Generate UPI deep link URL
 * Opens UPI payment app directly
 */
export function generateUPIDeeplink(
  amount: number,
  transactionNote: string
): string {
  return generateUPIPaymentString(amount, transactionNote);
}

/**
 * Generate GPay deep link URL
 * Opens Google Pay app directly
 * Format: tez://upi/pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR&tn=<TRANSACTION_NOTE>
 */
export function generateGPayDeeplink(
  amount: number,
  transactionNote: string
): string {
  return generateUPIPaymentString(amount, transactionNote);
}

/**
 * Generate PhonePe deep link URL
 * Opens PhonePe app directly
 * Format: phonepe://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR&tn=<TRANSACTION_NOTE>
 */
export function generatePhonePeDeeplink(
  amount: number,
  transactionNote: string
): string {
  return generateUPIPaymentString(amount, transactionNote);
}

/**
 * Generate Android intent URL for PhonePe.
 * This is more reliable than phonepe:// in many Android browsers.
 */
export function generatePhonePeIntentUrl(
  amount: number,
  transactionNote: string
): string {
  const params = buildUpiParams(amount, transactionNote);

  return `intent://upi/pay?${params.toString()}#Intent;scheme=upi;package=com.phonepe.app;end`;
}

/**
 * Generate Android intent URL for GPay.
 */
export function generateGPayIntentUrl(
  amount: number,
  transactionNote: string
): string {
  const params = buildUpiParams(amount, transactionNote);
  return `intent://upi/pay?${params.toString()}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
}

/**
 * Format transaction note for product purchase
 */
export function formatTransactionNote(productTitle: string): string {
  return `Payment for ${productTitle}`;
}

/**
 * Get UPI ID (for display purposes)
 */
export function getUPIId(): string {
  return UPI_ID || "vishalshinde8747@okhdfcbank";
}

/**
 * Check if UPI is configured
 */
export function isUPIConfigured(): boolean {
  return !!UPI_ID;
}
