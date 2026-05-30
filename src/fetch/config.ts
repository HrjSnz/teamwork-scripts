/** Resolved configuration for Teamwork API calls. */
export interface TeamworkConfig {
  host: string;
  baseUrl: string;
  authorizationHeader: string;
}

let envFileLoaded = false;

function loadEnv(): void {
  if (envFileLoaded) return;
  envFileLoaded = true;
  try {
    process.loadEnvFile();
  } catch {
    // .env file is optional — values can come from the environment.
  }
}

export function resolveHost(domainOrUrl: string): string {
  const normalizedHost = domainOrUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const isFullDomain = normalizedHost.includes(".");
  return isFullDomain ? normalizedHost : `${normalizedHost}.teamwork.com`;
}

export function resolveConfig(): TeamworkConfig {
  loadEnv();
  const domain = process.env.TEAMWORK_DOMAIN?.trim();
  const apiKey = process.env.TEAMWORK_API_KEY?.trim();
  if (!domain || !apiKey) {
    throw new Error(
      "Missing configuration. Create a .env file (see .env.example) with:\n" +
        "  TEAMWORK_DOMAIN=mycompany\n" +
        "  TEAMWORK_API_KEY=your_api_key",
    );
  }
  const host = resolveHost(domain);
  return {
    host,
    baseUrl: `https://${host}`,
    authorizationHeader: "Basic " + Buffer.from(`${apiKey}:x`).toString("base64"),
  };
}
