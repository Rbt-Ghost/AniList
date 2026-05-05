/// <reference types="vite/client" />

type AniListViteEnvString = string;

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: AniListViteEnvString;
  readonly VITE_FIREBASE_AUTH_DOMAIN: AniListViteEnvString;
  readonly VITE_FIREBASE_PROJECT_ID: AniListViteEnvString;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
