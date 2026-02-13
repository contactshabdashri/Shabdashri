/**
 * UPI Payment Utilities
 * Generates UPI payment strings and deep links for dynamic QR codes
 */

const UPI_ID = import.meta.env.VITE_UPI_ID || "vaishnavipawar5050@okicici";
const MERCHANT_NAME = import.meta.env.VITE_MERCHANT_NAME || "Shabdashri";

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

  // Format amount to 2 decimal places
  const formattedAmount = amount.toFixed(2);

  // Encode parameters
  const params = new URLSearchParams({
    pa: UPI_ID || "vaishnavipawar5050@okicici",
    pn: MERCHANT_NAME,
    am: formattedAmount,
    cu: "INR",
    tn: transactionNote,
  });

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
  if (!UPI_ID) {
    console.warn("VITE_UPI_ID not configured. Using placeholder.");
  }

  // Format amount to 2 decimal places
  const formattedAmount = amount.toFixed(2);

  // Encode parameters
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: MERCHANT_NAME,
    am: formattedAmount,
    cu: "INR",
    tn: transactionNote,
  });

  return `tez://upi/pay?${params.toString()}`;
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
  if (!UPI_ID) {
    console.warn("VITE_UPI_ID not configured. Using placeholder.");
  }

  // Format amount to 2 decimal places
  const formattedAmount = amount.toFixed(2);

  // Encode parameters
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: MERCHANT_NAME,
    am: formattedAmount,
    cu: "INR",
    tn: transactionNote,
  });

  return `phonepe://pay?${params.toString()}`;
}

/**
 * Generate Android intent URL for PhonePe.
 * This is more reliable than phonepe:// in many Android browsers.
 */
export function generatePhonePeIntentUrl(
  amount: number,
  transactionNote: string
): string {
  const formattedAmount = amount.toFixed(2);
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: MERCHANT_NAME,
    am: formattedAmount,
    cu: "INR",
    tn: transactionNote,
  });

  return `intent://upi/pay?${params.toString()}#Intent;scheme=upi;package=com.phonepe.app;end`;
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
  return UPI_ID || "vaishnavipawar5050@okicici";
}

/**
 * Check if UPI is configured
 */
export function isUPIConfigured(): boolean {
  return !!UPI_ID;
}
