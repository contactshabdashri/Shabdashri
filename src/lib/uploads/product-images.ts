interface UploadImageResponse {
  url?: string;
  error?: string;
}

const MEDIA_UPLOAD_URL =
  import.meta.env.VITE_MEDIA_UPLOAD_URL ??
  "https://media.graphicvishwa.com/api/upload.php";

const MEDIA_UPLOAD_AUTH_TOKEN = import.meta.env.VITE_MEDIA_UPLOAD_AUTH_TOKEN;

export async function uploadProductImage(
  file: File,
  _productId?: string
): Promise<string> {
  if (!MEDIA_UPLOAD_AUTH_TOKEN) {
    throw new Error("Missing media upload auth token.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: MEDIA_UPLOAD_AUTH_TOKEN,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as UploadImageResponse | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Failed to upload image to media server.");
  }

  return payload.url;
}
