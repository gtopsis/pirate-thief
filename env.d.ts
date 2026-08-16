/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SPREADSHEET_ID: string
  readonly VITE_GOOGLE_SPREADSHEET_API_KEY: string
  readonly VITE_GOOGLE_SPREADSHEET_API_RANGE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
