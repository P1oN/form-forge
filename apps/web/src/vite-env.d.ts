/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_GEMINI_CONFIDENCE_THRESHOLD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
