import { createClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_PREFIX = "image/";
const UPSTREAM_UPLOAD_TIMEOUT_MS = 55_000;
const DEFAULT_UPLOAD_API_URL = "https://media.graphicvishwa.com/api/upload-image.php";

interface UploadApiResponse {
  url?: string;
  error?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY for upload API authentication."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function getAllowedAdminEmails(): string[] {
  const rawValue = process.env.UPLOAD_ADMIN_EMAILS;

  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function jsonResponse(body: Record<string, string>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string) {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const authorizationHeader = request.headers.get("authorization");
    const accessToken = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return jsonResponse({ error: "Missing admin session token." }, 401);
    }

    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized upload request." }, 401);
    }

    const allowedAdminEmails = getAllowedAdminEmails();
    if (
      allowedAdminEmails.length > 0 &&
      (!user.email || !allowedAdminEmails.includes(user.email.toLowerCase()))
    ) {
      return jsonResponse({ error: "Your account is not allowed to upload images." }, 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse({ error: "Image file is required." }, 400);
    }

    if (!file.type.startsWith(ALLOWED_MIME_PREFIX)) {
      return jsonResponse({ error: "Only image uploads are allowed." }, 400);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonResponse({ error: "Image must be smaller than 5 MB." }, 400);
    }

    const uploadApiUrl =
      process.env.GODADDY_UPLOAD_API_URL?.trim() || DEFAULT_UPLOAD_API_URL;
    const uploadSecret = getRequiredEnv("SECRET_KEY");

    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name);

    const upstreamResponse = await withTimeout(
      fetch(uploadApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${uploadSecret}`,
          Accept: "application/json",
        },
        body: upstreamFormData,
      }),
      UPSTREAM_UPLOAD_TIMEOUT_MS,
      "Timed out waiting for the GoDaddy upload server."
    );

    const payload = (await upstreamResponse.json().catch(() => null)) as
      | UploadApiResponse
      | null;

    if (!upstreamResponse.ok || !payload?.url) {
      throw new Error(payload?.error || "GoDaddy upload endpoint did not return a file URL.");
    }

    return jsonResponse({ url: payload.url }, 200);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Image upload failed. Check GoDaddy upload API settings and server logs.";
    console.error("Image upload API error:", error);

    return jsonResponse({ error: message }, 500);
  }
}
