/**
 * Bot Config - Composition of service configs
 * Stored at /pub/bot_builder/configs/{id}.json
 */
export interface BotConfig {
  configId: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;

  // Services reference existing service configs by pubky:// URI
  services: ServiceReference[];
  listeners: ServiceReference[];
}

/**
 * Reference to a service config with optional per-bot overrides
 * Matches the bot builder's PubkyBotServiceRef interface
 */
export interface ServiceReference {
  // Reference to the service config
  serviceConfigRef: string; // pubky://{owner}/pub/bot_builder/service_configs/{id}.json

  // Per-bot overrides (optional)
  overrides?: {
    command?: string; // Override the command from service config
    config?: Record<string, unknown>; // Merge with service config
    datasets?: Record<string, string>; // Merge with service datasets
  };
  adminOnly?: boolean;
  enabled?: boolean; // Default: true
  deleteCommandMessage?: boolean; // Delete user's command message after bot responds
}

/**
 * Form data for creating/editing a bot config
 */
export interface BotConfigFormData {
  name: string;
  description?: string;
  services: ServiceReference[];
  listeners: ServiceReference[];
}

/**
 * Resolved service reference with full config data
 */
export interface ResolvedServiceReference extends ServiceReference {
  resolved?: {
    name: string;
    description?: string;
    manifest: {
      serviceId: string;
      kind: string;
      command?: string;
    };
    source: string;
    author?: string;
  };
  error?: string;
}
