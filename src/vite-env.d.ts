/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_TESTNETS: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
