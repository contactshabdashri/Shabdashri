/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_UPI_ID: string
  readonly VITE_MERCHANT_NAME: string
  readonly VITE_GODADDY_PUBLIC_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
