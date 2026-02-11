/**
 * JSON Schema types for service configuration
 * Mirrors the SDK types from pubky_bot_builder_telegram
 */

export interface JSONSchema {
  type?: "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;

  // String-specific
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  // Number-specific
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Object-specific
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  patternProperties?: Record<string, JSONSchema>;

  // Array-specific
  items?: JSONSchema | JSONSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Composition
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;

  // References
  $ref?: string;
  $defs?: Record<string, JSONSchema>;
}

export interface DatasetSchemaDefinition {
  schema: JSONSchema;
  description?: string;
  example?: unknown;
}

export type DatasetSchemas = Record<string, DatasetSchemaDefinition>;

export type ServiceKind = "single_command" | "command_flow" | "listener";

export interface ServiceManifest {
  serviceId: string;
  kind: ServiceKind;
  command?: string;
  description?: string;
  configSchema?: JSONSchema;
  datasetSchemas?: DatasetSchemas;
}
