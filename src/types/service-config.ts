import type { JSONSchema, DatasetSchemas, ServiceKind } from "./json-schema";

/**
 * Service Config - Primary reusable entity
 * Stored at /pub/bot_builder/service_configs/{id}.json
 * 
 * Matches the bot builder's PubkyServiceConfig interface
 */
export interface ServiceConfig {
  id: string;

  // Service source info - structured for bot builder compatibility
  source: string; // Git URL to the service (for UI display)
  sourceVersion?: string; // Pinned version/commit

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

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data for creating/editing a service config
 */
export interface ServiceConfigFormData {
  source: string;
  sourceVersion?: string;
  command?: string; // Required for commands, optional for listeners
  name: string;
  description?: string;
  tags?: string[];
  config: Record<string, unknown>;
  datasets?: Record<string, string>;
}

/**
 * Loaded service from git URL (before configuration)
 */
export interface LoadedService {
  source: string;
  manifest: ServiceConfig["manifest"];
}
