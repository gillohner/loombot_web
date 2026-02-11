import { describe, it, expect } from "vitest";
import type { ServiceConfig } from "@/types/service-config";

// Pure logic tests for service config list functionality
// Testing the logic without rendering React components

describe("ServiceConfigList Logic", () => {
  const mockConfigs: ServiceConfig[] = [
    {
      id: "config1",
      name: "Weather Service",
      description: "Get weather updates",
      gitUrl: "https://github.com/owner/repo/tree/main/weather",
      config: { apiKey: "key123", units: "celsius" },
      manifest: {
        name: "weather",
        title: "Weather Service",
        kind: "command_flow",
        version: "1.0.0",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "config2",
      name: "News Bot",
      description: "Daily news updates",
      gitUrl: "https://github.com/owner/repo/tree/main/news",
      config: { source: "rss" },
      manifest: {
        name: "news",
        title: "News Bot",
        kind: "listener",
        version: "1.0.0",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  describe("Git URL parsing", () => {
    const parseGitUrl = (url: string): { owner: string; repo: string; path?: string } | null => {
      const match = url.match(
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/[^/]+\/(.+))?$/
      );
      if (!match) return null;
      return {
        owner: match[1],
        repo: match[2],
        path: match[3],
      };
    };

    it("should parse full GitHub tree URL", () => {
      const result = parseGitUrl(
        "https://github.com/owner/repo/tree/main/path/to/service"
      );
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        path: "path/to/service",
      });
    });

    it("should parse simple GitHub URL", () => {
      const result = parseGitUrl("https://github.com/owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        path: undefined,
      });
    });

    it("should return null for invalid URL", () => {
      const result = parseGitUrl("not a url");
      expect(result).toBeNull();
    });
  });

  describe("Service kind display", () => {
    const getKindLabel = (kind: string): string => {
      const labels: Record<string, string> = {
        command_flow: "Command Flow",
        listener: "Listener",
        periodic: "Periodic",
      };
      return labels[kind] || kind;
    };

    it("should format command_flow", () => {
      expect(getKindLabel("command_flow")).toBe("Command Flow");
    });

    it("should format listener", () => {
      expect(getKindLabel("listener")).toBe("Listener");
    });

    it("should return unknown kinds as-is", () => {
      expect(getKindLabel("custom")).toBe("custom");
    });
  });

  describe("URI generation", () => {
    const generateServiceUri = (publicKey: string, configId: string): string => {
      return `pubky://${publicKey}/pub/bot_builder/service_configs/${configId}`;
    };

    it("should generate valid URI", () => {
      const uri = generateServiceUri("pk:user123", "config1");
      expect(uri).toBe("pubky://pk:user123/pub/bot_builder/service_configs/config1");
    });
  });

  describe("Config filtering", () => {
    const filterConfigs = (
      configs: ServiceConfig[],
      search: string,
      kind?: string
    ): ServiceConfig[] => {
      let result = configs;

      if (search) {
        const lower = search.toLowerCase();
        result = result.filter(
          (c) =>
            c.name.toLowerCase().includes(lower) ||
            c.description?.toLowerCase().includes(lower) ||
            c.gitUrl.toLowerCase().includes(lower)
        );
      }

      if (kind) {
        result = result.filter((c) => c.manifest?.kind === kind);
      }

      return result;
    };

    it("should filter by name", () => {
      const result = filterConfigs(mockConfigs, "weather");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Weather Service");
    });

    it("should filter by kind", () => {
      const result = filterConfigs(mockConfigs, "", "listener");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("News Bot");
    });

    it("should combine filters", () => {
      const result = filterConfigs(mockConfigs, "service", "command_flow");
      expect(result).toHaveLength(1);
    });
  });

  describe("Empty state detection", () => {
    const shouldShowEmptyState = (
      configs: ServiceConfig[],
      isLoading: boolean
    ): boolean => {
      return !isLoading && configs.length === 0;
    };

    it("should show empty when no configs", () => {
      expect(shouldShowEmptyState([], false)).toBe(true);
    });

    it("should not show empty when loading", () => {
      expect(shouldShowEmptyState([], true)).toBe(false);
    });

    it("should not show empty when has configs", () => {
      expect(shouldShowEmptyState(mockConfigs, false)).toBe(false);
    });
  });

  describe("Date formatting", () => {
    const formatDate = (isoString: string): string => {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    it("should format date correctly", () => {
      const result = formatDate("2024-03-15T10:30:00Z");
      expect(result).toMatch(/Mar 15, 2024/);
    });
  });
});
