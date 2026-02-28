import type {
  IndexedEntity,
  RegisteredUser,
  IndexerState,
  SearchQuery,
  SearchResult,
} from "@/types/indexer";
import { pubkyClient } from "@/lib/pubky/client";
import { config } from "@/lib/config";
import type { ServiceConfig } from "@/types/service-config";
import type { Dataset } from "@/types/dataset";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const USERS_FILE = path.join(DATA_DIR, "users.json");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

/**
 * Indexer class for tracking and searching service configs and datasets
 */
export class Indexer {
  private state: IndexerState = {
    users: [],
    entities: [],
  };

  /**
   * Load state from disk
   */
  async load(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });

      try {
        const usersData = await fs.readFile(USERS_FILE, "utf-8");
        this.state.users = JSON.parse(usersData);
      } catch {
        this.state.users = [];
      }

      try {
        const indexData = await fs.readFile(INDEX_FILE, "utf-8");
        const parsed = JSON.parse(indexData);
        this.state.entities = parsed.entities || [];
        this.state.lastFullIndexAt = parsed.lastFullIndexAt;
      } catch {
        this.state.entities = [];
      }

    } catch (error) {
      console.error("Failed to load indexer state:", error);
    }
  }

  /**
   * Save state to disk
   */
  async save(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(USERS_FILE, JSON.stringify(this.state.users, null, 2));
      await fs.writeFile(
        INDEX_FILE,
        JSON.stringify(
          {
            entities: this.state.entities,
            lastFullIndexAt: this.state.lastFullIndexAt,
          },
          null,
          2
        )
      );
    } catch (error) {
      console.error("Failed to save indexer state:", error);
    }
  }

  /**
   * Register a user for indexing
   */
  async registerUser(publicKey: string): Promise<void> {
    await this.load();

    const existing = this.state.users.find((u) => u.publicKey === publicKey);
    if (existing) {
      return;
    }

    this.state.users.push({
      publicKey,
      registeredAt: new Date().toISOString(),
    });

    await this.save();
  }

  /**
   * Index a single user's content
   */
  async indexUser(publicKey: string): Promise<number> {
    let indexed = 0;

    try {
      // Index service configs
      const serviceConfigsPath = `pubky://${publicKey}${config.botBuilder.serviceConfigsPath}`;
      try {
        const files = await pubkyClient.list(serviceConfigsPath);
        for (const file of files) {
          if (file.endsWith(".json")) {
            const fullPath = `${serviceConfigsPath}/${file}`;
            const data = await pubkyClient.read<ServiceConfig>(fullPath);
            if (data) {
              this.upsertEntity({
                uri: fullPath,
                type: "service_config",
                owner: publicKey,
                name: data.name,
                description: data.description,
                tags: data.tags || [],
                source: data.source?.location,
                kind: data.manifest.kind,
                indexedAt: new Date().toISOString(),
                updatedAt: data.updatedAt,
              });
              indexed++;
            }
          }
        }
      } catch {
        // No service configs
      }

      // Index datasets
      const datasetsPath = `pubky://${publicKey}${config.botBuilder.datasetsPath}`;
      try {
        const files = await pubkyClient.list(datasetsPath);
        for (const file of files) {
          if (file.endsWith(".json")) {
            const fullPath = `${datasetsPath}/${file}`;
            const data = await pubkyClient.read<Dataset>(fullPath);
            if (data) {
              this.upsertEntity({
                uri: fullPath,
                type: "dataset",
                owner: publicKey,
                name: data.name,
                description: data.description,
                tags: data.tags || [],
                indexedAt: new Date().toISOString(),
                updatedAt: data.updatedAt,
              });
              indexed++;
            }
          }
        }
      } catch {
        // No datasets
      }

      // Update last indexed time for user
      const user = this.state.users.find((u) => u.publicKey === publicKey);
      if (user) {
        user.lastIndexedAt = new Date().toISOString();
      }

      await this.save();
    } catch (error) {
      console.error(`Failed to index user ${publicKey}:`, error);
    }

    return indexed;
  }

  /**
   * Reindex all registered users
   */
  async reindexAll(): Promise<{ users: number; entities: number }> {
    await this.load();

    let totalEntities = 0;

    for (const user of this.state.users) {
      const count = await this.indexUser(user.publicKey);
      totalEntities += count;
    }

    this.state.lastFullIndexAt = new Date().toISOString();
    await this.save();

    return {
      users: this.state.users.length,
      entities: totalEntities,
    };
  }

  /**
   * Insert or update an entity
   */
  private upsertEntity(entity: IndexedEntity): void {
    const index = this.state.entities.findIndex((e) => e.uri === entity.uri);
    if (index >= 0) {
      this.state.entities[index] = entity;
    } else {
      this.state.entities.push(entity);
    }
  }

  /**
   * Search indexed entities
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    await this.load();

    let results = [...this.state.entities];

    // Filter by type
    if (query.type) {
      results = results.filter((e) => e.type === query.type);
    }

    // Filter by kind
    if (query.kind) {
      results = results.filter((e) => e.kind === query.kind);
    }

    // Filter by owner
    if (query.owner) {
      results = results.filter((e) => e.owner === query.owner);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) =>
        query.tags!.some((tag) =>
          e.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
        )
      );
    }

    // Filter by search query
    if (query.query && query.query.trim()) {
      const q = query.query.toLowerCase();
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          e.source?.toLowerCase().includes(q)
      );
    }

    // Sort by update time
    results.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const total = results.length;
    const paged = results.slice(offset, offset + limit);

    return {
      entities: paged,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get all registered users
   */
  async getUsers(): Promise<RegisteredUser[]> {
    await this.load();
    return this.state.users;
  }

  /**
   * Get indexer stats
   */
  async getStats(): Promise<{
    users: number;
    entities: number;
    lastFullIndexAt?: string;
  }> {
    await this.load();
    return {
      users: this.state.users.length,
      entities: this.state.entities.length,
      lastFullIndexAt: this.state.lastFullIndexAt,
    };
  }
}

// Singleton instance
export const indexer = new Indexer();
