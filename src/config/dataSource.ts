const DEVELOPMENT_DATA_BASE_URL = "./testdata/melody";
const PRODUCTION_DATA_BASE_URL = "/data/dictation/melody";

export function resolveDataBaseUrl(
  configuredUrl: string | undefined,
  isDevelopment: boolean,
): string {
  const configured = configuredUrl?.trim();
  if (configured) {
    return configured.length > 1
      ? configured.replace(/\/+$/, "")
      : configured;
  }
  return isDevelopment
    ? DEVELOPMENT_DATA_BASE_URL
    : PRODUCTION_DATA_BASE_URL;
}

export const DATA_BASE_URL = resolveDataBaseUrl(
  import.meta.env.VITE_DATA_BASE_URL,
  import.meta.env.DEV,
);
