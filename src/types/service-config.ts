import type { JSONSchema, DatasetSchemas, ServiceKind } from "./json-schema";

/**
 * Service Config - Primary reusable entity
 * Stored at /pub/bot_builder/service_configs/{id}.json
 *
 * Matches the bot builder's PubkyServiceConfig interface
 */
export interface ServiceConfig {
  configId: string; // Use configId to match bot builder

  // Service source info - structured for bot builder compatibility
  source: {
    type: "github" | "jsr" | "local";
    location: string; // GitHub repo URL, JSR package, or pubky:// path
    entry?: string; // Entry point path within repo
    version?: string; // Version/commit hash
  };

  // Command to trigger this service (without leading /)
  // Required for single_command and command_flow, optional for listeners
  command?: string;

  // Kind of service (required by bot builder)
  kind: ServiceKind;

  // Metadata
  name: string; // Human-readable name
  description?: string;
  tags?: string[];
  author?: string; // Creator's pubky public key

  // Service manifest (cached from source for reference)
  manifest: {
    serviceId: string;
    kind: ServiceKind;
    command?: string;
    description?: string;
    configSchema?: JSONSchema;
    datasetSchemas?: DatasetSchemas;
  };

  // Configuration
  config: Record<string, unknown>;
  datasets?: Record<string, string>; // name → pubky:// URI to dataset

  // Behavior
  deleteCommandMessage?: boolean; // Delete user's trigger message after bot responds

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data for creating/editing a service config
 * Uses string for source in the form, gets converted to structured format on save
 */
export interface ServiceConfigFormData {
  source: string; // Git URL string, will be converted to structured format
  command?: string; // Command override (optional, will use manifest command if not provided)
  name: string;
  config: Record<string, unknown>;
  datasets?: Record<string, string>;
  deleteCommandMessage?: boolean;
}

/**
 * Loaded service from git URL (before configuration)
 */
export interface LoadedService {
  source: string;
  manifest: ServiceConfig["manifest"];
}
