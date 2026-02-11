import { describe, it, expect } from "vitest";
import type { IndexedEntity, SearchQuery, SearchResult } from "@/types/indexer";

// Test the indexer logic without the Next.js route
describe("Indexer Logic", () => {
  describe("search filtering", () => {
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

    const search = (query: SearchQuery): SearchResult => {
      let filtered = [...entities];

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
      const results = search({ query: "weather" });
      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].name).toBe("Weather Service");
    });

    it("should filter by kind", () => {
      const results = search({ kind: "dataset" });
      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].kind).toBe("dataset");
    });

    it("should filter by owner", () => {
      const results = search({ owner: "user2" });
      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].owner).toBe("user2");
    });

    it("should filter by tags", () => {
      const results = search({ tags: ["api"] });
      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].tags).toContain("api");
    });

    it("should combine multiple filters", () => {
      const results = search({
        kind: "service_config",
        owner: "user1",
      });
      expect(results.entities).toHaveLength(1);
      expect(results.entities[0].name).toBe("Weather Service");
    });

    it("should respect limit parameter", () => {
      const results = search({ limit: 1 });
      expect(results.entities).toHaveLength(1);
    });

    it("should return empty results when no match", () => {
      const results = search({ query: "nonexistent" });
      expect(results.entities).toHaveLength(0);
    });
  });

  describe("user registration", () => {
    type RegisteredUser = { publicKey: string; registeredAt: string };
    
    const registerUser = (
      users: RegisteredUser[],
      publicKey: string
    ): RegisteredUser[] => {
      // Check if already registered
      if (users.some((u) => u.publicKey === publicKey)) {
        return users;
      }
      
      return [
        ...users,
        { publicKey, registeredAt: new Date().toISOString() },
      ];
    };

    it("should add new user", () => {
      const users: RegisteredUser[] = [];
      const result = registerUser(users, "pk:newuser");
      
      expect(result).toHaveLength(1);
      expect(result[0].publicKey).toBe("pk:newuser");
    });

    it("should not add duplicate user", () => {
      const users: RegisteredUser[] = [
        { publicKey: "pk:existing", registeredAt: "2024-01-01" },
      ];
      const result = registerUser(users, "pk:existing");
      
      expect(result).toHaveLength(1);
    });
  });

  describe("statistics calculation", () => {
    const getStats = (
      entities: IndexedEntity[],
      users: { publicKey: string }[],
      lastIndexed: string
    ) => {
      return {
        totalEntities: entities.length,
        totalUsers: users.length,
        serviceConfigs: entities.filter((e) => e.kind === "service_config").length,
        datasets: entities.filter((e) => e.kind === "dataset").length,
        lastIndexed,
      };
    };

    it("should calculate correct statistics", () => {
      const entities: IndexedEntity[] = [
        { uri: "uri1", kind: "service_config", owner: "u1", name: "s1", tags: [], indexedAt: "" },
        { uri: "uri2", kind: "service_config", owner: "u1", name: "s2", tags: [], indexedAt: "" },
        { uri: "uri3", kind: "dataset", owner: "u2", name: "d1", tags: [], indexedAt: "" },
      ];
      const users = [{ publicKey: "u1" }, { publicKey: "u2" }];
      const lastIndexed = "2024-01-01T00:00:00.000Z";

      const stats = getStats(entities, users, lastIndexed);

      expect(stats.totalEntities).toBe(3);
      expect(stats.totalUsers).toBe(2);
      expect(stats.serviceConfigs).toBe(2);
      expect(stats.datasets).toBe(1);
      expect(stats.lastIndexed).toBe(lastIndexed);
    });
  });
});
