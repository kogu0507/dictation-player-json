import type { ContentType } from "../data/types";

const DEVELOPMENT_DATA_BASE_URL = "./testdata/melody";
const PRODUCTION_DATA_BASE_URL = "/data/dictation/melody";

export function resolveDataBaseUrl(
  configuredUrl: string | undefined,
  isDevelopment: boolean,
  contentType: ContentType = "melody",
): string {
  const configured = configuredUrl?.trim();
  if (configured) {
    const normalized = configured.length > 1
      ? configured.replace(/\/+$/, "")
      : configured;
    return resolveConfiguredDataBaseUrl(normalized, contentType);
  }
  const baseUrl = isDevelopment
    ? DEVELOPMENT_DATA_BASE_URL
    : PRODUCTION_DATA_BASE_URL;
  return contentType === "melody"
    ? baseUrl
    : baseUrl.replace(/\/melody$/, `/${contentType}`);
}

function resolveConfiguredDataBaseUrl(
  configuredUrl: string,
  contentType: ContentType,
): string {
  if (contentType === "melody") {
    return configuredUrl;
  }
  if (configuredUrl.endsWith("/melody")) {
    return configuredUrl.replace(/\/melody$/, `/${contentType}`);
  }
  if (configuredUrl.endsWith(`/${contentType}`)) {
    return configuredUrl;
  }
  return `${configuredUrl}/${contentType}`;
}

export const DATA_BASE_URL = resolveDataBaseUrl(
  import.meta.env.VITE_DATA_BASE_URL,
  import.meta.env.DEV,
);

export function getDataBaseUrl(contentType: ContentType): string {
  return resolveDataBaseUrl(
    import.meta.env.VITE_DATA_BASE_URL,
    import.meta.env.DEV,
    contentType,
  );
}
