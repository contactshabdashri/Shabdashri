import { supabase } from "@/lib/supabase";

interface UploadImageResponse {
  url?: string;
  error?: string;
}

const MEDIA_UPLOAD_URL = "/api/upload-image";

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

  const formData = new FormData();
  formData.append("file", file);
  if (productId) {
    formData.append("productId", productId);
  }

  let response: Response;

  try {
    response = await fetch(MEDIA_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch {
    throw new Error(
      "Could not reach the upload server. Check that the site is deployed with the /api/upload-image endpoint."
    );
  }

  const payload = (await response.json().catch(() => null)) as UploadImageResponse | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Failed to upload image to GoDaddy storage.");
  }

  return payload.url;
}
