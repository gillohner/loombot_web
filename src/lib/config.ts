export type PubkyEnvironment = "testnet" | "staging" | "production";

interface PubkyConfig {
  isDevelopment: boolean;
  app: {
    name: string;
    version: string;
  };
  env: PubkyEnvironment;
  pkarr: {
    relays: string[];
  };
  homeserver: {
    publicKey: string;
    url: string;
  };
  relay: {
    url: string;
  };
  botBuilder: {
    basePath: string;
    configsPath: string;
    serviceConfigsPath: string;
    datasetsPath: string;
  };
}

const DEFAULT_HOMESERVERS: Record<PubkyEnvironment, string> = {
  testnet: "8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo",
  staging: "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy",
  production: "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy",
};

const DEFAULT_RELAYS: Record<PubkyEnvironment, string> = {
  testnet: "http://localhost:15412/link",
  staging: "https://httprelay.staging.pubky.app/link/",
  production: "https://httprelay.pubky.app/link/",
};

const DEFAULT_HOMESERVER_URLS: Record<PubkyEnvironment, string> = {
  testnet: "http://localhost:6286",
  staging: "https://homeserver.staging.pubky.app",
  production: "https://homeserver.pubky.app",
};

const DEFAULT_PKARR_RELAYS: string[] = [
  "https://pkarr.pubky.app",
  "https://pkarr.pubky.org",
];

function getEnvironment(): PubkyEnvironment {
  const env = process.env.NEXT_PUBLIC_PUBKY_ENV?.toLowerCase();
  if (env === "testnet" || env === "staging" || env === "production") return env;
  return "staging";
}

function buildConfig(): PubkyConfig {
  const environment = getEnvironment();

  const parseRelays = (value: string | undefined): string[] => {
    if (!value) return DEFAULT_PKARR_RELAYS;
    const relays = value
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    return relays.length ? relays : DEFAULT_PKARR_RELAYS;
  };

  return {
    isDevelopment: process.env.NODE_ENV === "development",
    app: {
      name: process.env.NEXT_PUBLIC_APP_NAME || "Pubky Bot Configurator",
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    },
    env: environment,
    pkarr: {
      relays: parseRelays(process.env.NEXT_PUBLIC_PKARR_RELAYS),
    },
    homeserver: {
      publicKey:
        process.env.NEXT_PUBLIC_PUBKY_HOMESERVER ||
        DEFAULT_HOMESERVERS[environment],
      url:
        process.env.NEXT_PUBLIC_PUBKY_HOMESERVER_URL ||
        DEFAULT_HOMESERVER_URLS[environment],
    },
    relay: {
      url:
        process.env.NEXT_PUBLIC_PUBKY_RELAY || DEFAULT_RELAYS[environment],
    },
    botBuilder: {
      basePath: "/pub/bot_builder",
      configsPath: "/pub/bot_builder/configs",
      serviceConfigsPath: "/pub/bot_builder/service_configs",
      datasetsPath: "/pub/bot_builder/datasets",
    },
  };
}

export const config: PubkyConfig = buildConfig();
export const isTestnet = config.env === "testnet";
export const isProduction = config.env === "production";
export const isStaging = config.env === "staging";
