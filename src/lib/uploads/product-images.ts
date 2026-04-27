import { supabase } from "@/lib/supabase";
import { optimizeImageForUpload } from "@/lib/uploads/optimize-image";

interface UploadImageResponse {
  url?: string;
  error?: string;
}

const MEDIA_UPLOAD_URL = "/api/upload-image";
const UPLOAD_REQUEST_TIMEOUT_MS = 65_000;

export async function uploadProductImage(
  file: File,
  productId?: string
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("Your admin session has expired. Please log in again.");
  }

  const { file: preparedFile } = await optimizeImageForUpload(file);
  const formData = new FormData();
  formData.append("file", preparedFile, preparedFile.name);
  if (productId) {
    formData.append("productId", productId);
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), UPLOAD_REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(MEDIA_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Image upload timed out before the GoDaddy server responded. Check the GoDaddy upload API and PHP server logs."
      );
    }

    throw new Error(
      "Could not reach the upload server. Check that the site is deployed with the /api/upload-image endpoint."
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const payload = (await response.json().catch(() => null)) as UploadImageResponse | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Failed to upload image to GoDaddy storage.");
  }

  return payload.url;
}
