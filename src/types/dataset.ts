import type { JSONSchema } from "./json-schema";

/**
 * Dataset - Reusable data entity
 * Stored at /pub/bot_builder/datasets/{id}.json
 */
export interface Dataset {
  id: string;

  // Metadata
  name: string;
  description?: string;
  tags?: string[];
  author?: string; // Creator's pubky public key

  // Schema info (for validation in UI)
  schemaSource?: string; // Git URL to service that defines the schema
  schemaDatasetName?: string; // Name of the dataset schema in that service

  // Cached schema (optional, for UI)
  schema?: JSONSchema;

  // Data
  data: unknown;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data for creating/editing a dataset
 */
export interface DatasetFormData {
  name: string;
  description?: string;
  tags?: string[];
  schemaSource?: string;
  schemaDatasetName?: string;
  data: unknown;
}
