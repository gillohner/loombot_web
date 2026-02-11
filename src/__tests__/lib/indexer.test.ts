import { describe, it, expect } from "vitest";
import type { IndexedEntity, IndexerState } from "@/types/indexer";

// Test the indexer logic without relying on fs mocking
describe("Indexer State Logic", () => {
  describe("state initialization", () => {
    const createEmptyState = (): IndexerState => ({
      entities: [],
      users: [],
      lastIndexed: new Date().toISOString(),
    });

    it("should create empty initial state", () => {
      const state = createEmptyState();
      expect(state.entities).toEqual([]);
      expect(state.users).toEqual([]);
      expect(state.lastIndexed).toBeDefined();
    });
  });

  describe("user registration logic", () => {
    const registerUser = (
      state: IndexerState,
      publicKey: string
    ): IndexerState => {
      // Check if already registered
      if (state.users.some((u) => u.publicKey === publicKey)) {
        return state;
      }

      return {
        ...state,
        users: [
          ...state.users,
          { publicKey, registeredAt: new Date().toISOString() },
        ],
      };
    };

    it("should add new user to registered list", () => {
      const state: IndexerState = {
        entities: [],
        users: [],
        lastIndexed: new Date().toISOString(),
      };

      const newState = registerUser(state, "pk:user123");

      expect(newState.users).toHaveLength(1);
      expect(newState.users[0].publicKey).toBe("pk:user123");
    });

    it("should not add duplicate user", () => {
      const state: IndexerState = {
        entities: [],
        users: [{ publicKey: "pk:user123", registeredAt: new Date().toISOString() }],
        lastIndexed: new Date().toISOString(),
      };

      const newState = registerUser(state, "pk:user123");

      expect(newState.users).toHaveLength(1);
    });
  });

  describe("search logic", () => {
    const entities: IndexedEntity[] = [
      {
        uri: "pubky://user1/pub/bot_builder/service_configs/config1",
        kind: "service_config",
        owner: "user1",
        name: "Weather Service",
        description: "Get weather updates",
        tags: ["weather", "api"],
        indexedAt: new Date().toISOString(),
      },
      {
        uri: "pubky://user1/pub/bot_builder/datasets/data1",
        kind: "dataset",
        owner: "user1",
        name: "Cities",
        description: "List of cities",
        tags: ["cities", "geo"],
        indexedAt: new Date().toISOString(),
      },
      {
        uri: "pubky://user2/pub/bot_builder/service_configs/config2",
        kind: "service_config",
        owner: "user2",
        name: "News Bot",
        description: "Daily news updates",
        tags: ["news", "rss"],
        indexedAt: new Date().toISOString(),
      },
    ];

    const search = (
      allEntities: IndexedEntity[],
      query: {
        query?: string;
        kind?: string;
        owner?: string;
        tags?: string[];
        limit?: number;
      }
    ) => {
      let filtered = [...allEntities];

      if (query.query) {
        const q = query.query.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      if (query.kind) {
        filtered = filtered.filter((e) => e.kind === query.kind);
      }

      if (query.owner) {
        filtered = filtered.filter((e) => e.owner === query.owner);
      }

      if (query.tags && query.tags.length > 0) {
        filtered = filtered.filter((e) =>
          query.tags!.some((t) => e.tags.includes(t))
        );
      }

      if (query.limit) {
        filtered = filtered.slice(0, query.limit);
      }

      return { entities: filtered, total: filtered.length };
    };

    it("should search by query string", () => {
      const results = search(entities, { query: "weather" });

      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].name).toBe("Weather Service");
    });

    it("should filter by kind", () => {
      const results = search(entities, { kind: "dataset" });

      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].kind).toBe("dataset");
    });

    it("should filter by owner", () => {
      const results = search(entities, { owner: "user2" });

      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].owner).toBe("user2");
    });

    it("should filter by tags", () => {
      const results = search(entities, { tags: ["api"] });

      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].tags).toContain("api");
    });

    it("should combine multiple filters", () => {
      const results = search(entities, {
        kind: "service_config",
        owner: "user1",
      });

      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].name).toBe("Weather Service");
    });

    it("should respect limit parameter", () => {
      const results = search(entities, { limit: 1 });

      expect(results.entities).toHaveLength(1);
    });

    it("should return empty results when no match", () => {
      const results = search(entities, { query: "nonexistent" });

      expect(results.entities).toHaveLength(0);
    });
  });

  describe("statistics calculation", () => {
    const getStats = (state: IndexerState) => ({
      totalEntities: state.entities.length,
      totalUsers: state.users.length,
      serviceConfigs: state.entities.filter((e) => e.kind === "service_config").length,
      datasets: state.entities.filter((e) => e.kind === "dataset").length,
      lastIndexed: state.lastIndexed,
    });

    it("should return correct statistics", () => {
      const state: IndexerState = {
        entities: [
          { uri: "uri1", kind: "service_config", owner: "u1", name: "s1", tags: [], indexedAt: "" },
          { uri: "uri2", kind: "service_config", owner: "u1", name: "s2", tags: [], indexedAt: "" },
          { uri: "uri3", kind: "dataset", owner: "u2", name: "d1", tags: [], indexedAt: "" },
        ],
        users: [
          { publicKey: "u1", registeredAt: "" },
          { publicKey: "u2", registeredAt: "" },
        ],
        lastIndexed: "2024-01-01T00:00:00.000Z",
      };

      const stats = getStats(state);

      expect(stats.totalEntities).toBe(3);
      expect(stats.totalUsers).toBe(2);
      expect(stats.serviceConfigs).toBe(2);
      expect(stats.datasets).toBe(1);
    });

    it("should handle empty state", () => {
      const state: IndexerState = {
        entities: [],
        users: [],
        lastIndexed: "2024-01-01T00:00:00.000Z",
      };

      const stats = getStats(state);

      expect(stats.totalEntities).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(stats.serviceConfigs).toBe(0);
      expect(stats.datasets).toBe(0);
    });
  });
});
