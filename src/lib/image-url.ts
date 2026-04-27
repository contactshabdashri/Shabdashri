const DEFAULT_MEDIA_BASE_URL = "http://media.graphicvishwa.com/uploads/products";
const PLACEHOLDER_IMAGE_URL = "/placeholder.svg";

function sanitizePath(value: string) {
  return value.trim().replace(/^\/+/, "");
}

export function resolveProductImageUrl(imageValue?: string | null): string {
  if (!imageValue) {
    return PLACEHOLDER_IMAGE_URL;
  }

  const trimmedValue = imageValue.trim();

  if (!trimmedValue) {
    return PLACEHOLDER_IMAGE_URL;
  }

  if (/^https?:\/\//i.test(trimmedValue) || trimmedValue.startsWith("data:")) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue;
  }

  const configuredBaseUrl =
    import.meta.env.VITE_GODADDY_PUBLIC_BASE_URL?.trim() || DEFAULT_MEDIA_BASE_URL;

  return `${configuredBaseUrl.replace(/\/+$/, "")}/${sanitizePath(trimmedValue)}`;
}

export function getProductImageFallback() {
  return PLACEHOLDER_IMAGE_URL;
}
