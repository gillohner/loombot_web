import { describe, it, expect } from "vitest";
import type { BotConfig } from "@/types/bot-config";

// Pure logic tests for bot config list functionality
// Testing the logic without rendering React components

describe("BotConfigList Logic", () => {
  const mockConfigs: BotConfig[] = [
    {
      configId: "config1",
      name: "Test Bot 1",
      description: "First test bot",
      version: "1.0.0",
      services: [],
      listeners: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      configId: "config2",
      name: "Test Bot 2",
      description: "Second test bot",
      version: "1.0.0",
      services: [
        {
          serviceConfigRef: "pubky://user/pub/bot_builder/service_configs/config.json",
          enabled: true,
        },
      ],
      listeners: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  describe("Service count display", () => {
    const getServiceCountText = (count: number): string => {
      return count === 1 ? "1 service" : `${count} services`;
    };

    it("should display singular for 1 service", () => {
      expect(getServiceCountText(1)).toBe("1 service");
    });

    it("should display plural for 0 services", () => {
      expect(getServiceCountText(0)).toBe("0 services");
    });

    it("should display plural for multiple services", () => {
      expect(getServiceCountText(5)).toBe("5 services");
    });
  });

  describe("Config filtering", () => {
    const filterConfigs = (configs: BotConfig[], search: string): BotConfig[] => {
      if (!search) return configs;
      const lower = search.toLowerCase();
      return configs.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.description?.toLowerCase().includes(lower)
      );
    };

    it("should return all configs when no search", () => {
      expect(filterConfigs(mockConfigs, "")).toEqual(mockConfigs);
    });

    it("should filter by name", () => {
      const result = filterConfigs(mockConfigs, "Bot 1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Bot 1");
    });

    it("should filter by description", () => {
      const result = filterConfigs(mockConfigs, "second");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Bot 2");
    });

    it("should be case insensitive", () => {
      const result = filterConfigs(mockConfigs, "TEST");
      expect(result).toHaveLength(2);
    });

    it("should return empty for no match", () => {
      const result = filterConfigs(mockConfigs, "xyz");
      expect(result).toHaveLength(0);
    });
  });

  describe("Edit URL generation", () => {
    const getEditUrl = (configId: string): string => {
      return `/configs/${configId}`;
    };

    it("should generate correct edit URL", () => {
      expect(getEditUrl("config1")).toBe("/configs/config1");
    });

    it("should handle special characters in ID", () => {
      expect(getEditUrl("config-with-dash")).toBe("/configs/config-with-dash");
    });
  });

  describe("Config sorting", () => {
    const sortConfigs = (
      configs: BotConfig[],
      sortBy: "name" | "updated" | "created"
    ): BotConfig[] => {
      return [...configs].sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "updated":
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          case "created":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
    };

    it("should sort by name alphabetically", () => {
      const sorted = sortConfigs(mockConfigs, "name");
      expect(sorted[0].name).toBe("Test Bot 1");
      expect(sorted[1].name).toBe("Test Bot 2");
    });

    it("should not mutate original array", () => {
      const original = [...mockConfigs];
      sortConfigs(mockConfigs, "name");
      expect(mockConfigs).toEqual(original);
    });
  });

  describe("Empty state detection", () => {
    const shouldShowEmptyState = (
      configs: BotConfig[],
      isLoading: boolean
    ): boolean => {
      return !isLoading && configs.length === 0;
    };

    it("should show empty state when no configs and not loading", () => {
      expect(shouldShowEmptyState([], false)).toBe(true);
    });

    it("should not show empty state when loading", () => {
      expect(shouldShowEmptyState([], true)).toBe(false);
    });

    it("should not show empty state when has configs", () => {
      expect(shouldShowEmptyState(mockConfigs, false)).toBe(false);
    });
  });

  describe("Token masking", () => {
    const maskToken = (token: string): string => {
      if (token.length <= 8) return "••••••••";
      return token.slice(0, 4) + "••••" + token.slice(-4);
    };

    it("should mask short tokens completely", () => {
      expect(maskToken("abc")).toBe("••••••••");
    });

    it("should show first and last 4 chars for long tokens", () => {
      expect(maskToken("1234567890123456")).toBe("1234••••3456");
    });
  });
});
