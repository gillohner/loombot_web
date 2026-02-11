/**
 * Indexer types for discovery
 */

export type IndexedEntityType = "service_config" | "dataset" | "bot_config";

export interface IndexedEntity {
  uri: string; // pubky:// URI
  type: IndexedEntityType;
  owner: string; // Public key
  name: string;
  description?: string;
  tags: string[];

  // Service config specific
  source?: string; // Git URL
  kind?: string; // single_command, command_flow, listener

  // Timestamps
  indexedAt: string;
  updatedAt: string;
}

export interface SearchQuery {
  query?: string;
  type?: IndexedEntityType;
  kind?: string;
  tags?: string[];
  owner?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entities: IndexedEntity[];
  total: number;
  hasMore: boolean;
}

export interface RegisteredUser {
  publicKey: string;
  registeredAt: string;
  lastIndexedAt?: string;
}

export interface IndexerState {
  users: RegisteredUser[];
  entities: IndexedEntity[];
  lastFullIndexAt?: string;
}
