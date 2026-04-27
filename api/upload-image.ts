import { createClient } from "@supabase/supabase-js";
import { Client } from "basic-ftp";
import { Readable } from "node:stream";
import path from "node:path";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_PREFIX = "image/";
const FTP_CONNECT_TIMEOUT_MS = 12_000;
const FTP_PREPARE_TIMEOUT_MS = 8_000;
const FTP_UPLOAD_TIMEOUT_MS = 20_000;

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

function normalizePosixDirectory(directory: string): string {
  const trimmed = directory.trim().replace(/\\/g, "/");
  const normalized = path.posix.normalize(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);

  return normalized === "." ? "/" : normalized.replace(/\/+$/, "") || "/";
}

function isPlaceholderDirectory(directory: string): boolean {
  return directory.includes("...");
}

function buildRemoteDirectoryCandidates(
  configuredDirectory: string | undefined,
  publicBaseUrl: string
): string[] {
  const candidates = new Set<string>();
  const configuredValue = configuredDirectory?.trim();

  if (configuredValue && !isPlaceholderDirectory(configuredValue)) {
    candidates.add(normalizePosixDirectory(configuredValue));
  }

  const publicUrl = new URL(publicBaseUrl);
  const publicPath = normalizePosixDirectory(publicUrl.pathname);

  if (publicPath !== "/") {
    candidates.add(publicPath);
    candidates.add(normalizePosixDirectory(`/public_html${publicPath}`));
    candidates.add(
      normalizePosixDirectory(`/public_html/${publicUrl.hostname}${publicPath}`)
    );
  }

  return Array.from(candidates);
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

async function tryUploadToDirectory(
  ftpClient: Client,
  directory: string,
  fileName: string,
  fileBuffer: Buffer
) {
  await withTimeout(
    ftpClient.ensureDir(directory),
    FTP_PREPARE_TIMEOUT_MS,
    `Timed out preparing FTP directory: ${directory}`
  );

  await withTimeout(
    ftpClient.uploadFrom(Readable.from(fileBuffer), path.posix.join(directory, fileName)),
    FTP_UPLOAD_TIMEOUT_MS,
    `Timed out uploading file to FTP directory: ${directory}`
  );
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
    const ftpPort = Number(process.env.GODADDY_FTP_PORT ?? 21);
    const secure = (process.env.GODADDY_FTP_SECURE ?? "true").toLowerCase() !== "false";
    const remoteDirectoryCandidates = buildRemoteDirectoryCandidates(
      process.env.GODADDY_FTP_REMOTE_DIR,
      publicBaseUrl
    );

    if (remoteDirectoryCandidates.length === 0) {
      throw new Error(
        "No valid FTP upload directory could be determined. Set GODADDY_FTP_REMOTE_DIR or use a public base URL with an upload path."
      );
    }

    const fileName = buildFileName(
      file.name,
      typeof productId === "string" ? productId : null
    );

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ftpClient = new Client();
    ftpClient.ftp.verbose = false;
    ftpClient.ftp.timeout = FTP_UPLOAD_TIMEOUT_MS;

    try {
      await withTimeout(
        ftpClient.access({
          host: ftpHost,
          port: ftpPort,
          user: ftpUser,
          password: ftpPassword,
          secure,
        }),
        FTP_CONNECT_TIMEOUT_MS,
        "Timed out connecting to GoDaddy FTP."
      );

      let uploadError: Error | null = null;

      for (const remoteDirectory of remoteDirectoryCandidates) {
        try {
          await tryUploadToDirectory(ftpClient, remoteDirectory, fileName, fileBuffer);
          return jsonResponse({ url: joinUrl(publicBaseUrl, fileName) }, 200);
        } catch (error) {
          uploadError =
            error instanceof Error ? error : new Error("Unknown FTP upload failure.");
          console.error(`FTP upload attempt failed for "${remoteDirectory}":`, uploadError);
        }
      }

      throw new Error(
        `FTP upload failed for all directory candidates: ${remoteDirectoryCandidates.join(", ")}. Last error: ${uploadError?.message ?? "unknown error"}`
      );
    } finally {
      ftpClient.close();
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Image upload failed. Check GoDaddy FTP and Vercel environment settings.";
    console.error("Image upload API error:", error);

    return jsonResponse(
      { error: message },
      500
    );
  }
}
