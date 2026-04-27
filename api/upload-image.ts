import { createClient } from "@supabase/supabase-js";
import { Client } from "basic-ftp";
import { Readable } from "node:stream";
import path from "node:path";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_PREFIX = "image/";
const FTP_TIMEOUT_MS = 20_000;

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

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
}

function buildFileName(originalName: string, productId?: string | null): string {
  const extension = path.extname(originalName).toLowerCase() || ".jpg";
  const baseName = path.basename(originalName, extension);
  const safeBaseName = sanitizeSegment(baseName) || "product-image";
  const safeProductId = productId ? sanitizeSegment(productId) : "";
  const prefix = safeProductId ? `${safeProductId}-` : "";

  return `${prefix}${Date.now()}-${safeBaseName}${extension}`;
}

function joinUrl(baseUrl: string, fileName: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${fileName}`;
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
    const productId = formData.get("productId");

    if (!(file instanceof File)) {
      return jsonResponse({ error: "Image file is required." }, 400);
    }

    if (!file.type.startsWith(ALLOWED_MIME_PREFIX)) {
      return jsonResponse({ error: "Only image uploads are allowed." }, 400);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonResponse({ error: "Image must be smaller than 5 MB." }, 400);
    }

    const ftpHost = getRequiredEnv("GODADDY_FTP_HOST");
    const ftpUser = getRequiredEnv("GODADDY_FTP_USER");
    const ftpPassword = getRequiredEnv("GODADDY_FTP_PASSWORD");
    const publicBaseUrl = getRequiredEnv("GODADDY_PUBLIC_BASE_URL");
    const remoteDirectory =
      process.env.GODADDY_FTP_REMOTE_DIR ??
      "/public_html/media.graphicvishwa.com/uploads/products";
    const ftpPort = Number(process.env.GODADDY_FTP_PORT ?? 21);
    const secure = (process.env.GODADDY_FTP_SECURE ?? "true").toLowerCase() !== "false";

    const fileName = buildFileName(
      file.name,
      typeof productId === "string" ? productId : null
    );

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ftpClient = new Client();
    ftpClient.ftp.verbose = false;
    ftpClient.ftp.timeout = FTP_TIMEOUT_MS;

    try {
      await withTimeout(
        ftpClient.access({
          host: ftpHost,
          port: ftpPort,
          user: ftpUser,
          password: ftpPassword,
          secure,
        }),
        FTP_TIMEOUT_MS,
        "Timed out connecting to GoDaddy FTP."
      );

      await withTimeout(
        ftpClient.ensureDir(remoteDirectory),
        FTP_TIMEOUT_MS,
        "Timed out preparing the GoDaddy upload directory."
      );
      await withTimeout(
        ftpClient.uploadFrom(
          Readable.from(fileBuffer),
          path.posix.join(remoteDirectory, fileName)
        ),
        FTP_TIMEOUT_MS,
        "Timed out uploading the file to GoDaddy."
      );
    } finally {
      ftpClient.close();
    }

    return jsonResponse({ url: joinUrl(publicBaseUrl, fileName) }, 200);
  } catch (error) {
    console.error("Image upload API error:", error);

    return jsonResponse(
      { error: "Image upload failed. Check GoDaddy FTP and Vercel environment settings." },
      500
    );
  }
}
