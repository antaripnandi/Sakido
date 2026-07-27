/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  readonly BASE_URL?: string;
  // add more env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
