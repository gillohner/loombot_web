import { describe, it, expect } from "vitest";

// Test the manifest parsing logic without the Next.js route
describe("Manifest Parsing Logic", () => {
  // Simulates the parseManifestFromSource function
  const parseManifestFromSource = (source: string) => {
    const manifestRegex = /export\s+const\s+manifest\s*=\s*(\{[\s\S]*?\});/;
    const match = source.match(manifestRegex);
    
    if (!match) return null;
    
    try {
      // Simple eval-like parsing for basic objects (in real code, use a proper parser)
      const manifestStr = match[1]
        .replace(/(\w+):/g, '"$1":')  // Add quotes to keys
        .replace(/'/g, '"');           // Replace single quotes with double
      return JSON.parse(manifestStr);
    } catch {
      return null;
    }
  };

  it("should parse simple manifest", () => {
    const source = `
      export const manifest = {
        "name": "test-service",
        "version": "1.0.0"
      };
    `;
    
    const result = parseManifestFromSource(source);
    expect(result).toEqual({
      name: "test-service",
      version: "1.0.0",
    });
  });

  it("should return null for source without manifest", () => {
    const source = `
      export const something = "else";
    `;
    
    const result = parseManifestFromSource(source);
    expect(result).toBeNull();
  });

  describe("URL validation", () => {
    const isValidGitUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return (
          urlObj.hostname === "github.com" ||
          urlObj.hostname === "gitlab.com"
        );
      } catch {
        return false;
      }
    };

    it("should validate GitHub URLs", () => {
      expect(isValidGitUrl("https://github.com/owner/repo")).toBe(true);
      expect(isValidGitUrl("https://github.com/owner/repo/tree/main/path")).toBe(true);
    });

    it("should validate GitLab URLs", () => {
      expect(isValidGitUrl("https://gitlab.com/owner/repo")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(isValidGitUrl("not-a-url")).toBe(false);
      expect(isValidGitUrl("https://example.com/path")).toBe(false);
      expect(isValidGitUrl("")).toBe(false);
    });
  });

  describe("File pattern resolution", () => {
    const FILE_PATTERNS = ["constants.ts", "mod.ts", "service.ts"];
    
    const getFilesToTry = (basePath: string): string[] => {
      return FILE_PATTERNS.map((file) => 
        basePath ? `${basePath}/${file}` : file
      );
    };

    it("should generate file paths with base path", () => {
      const files = getFilesToTry("services/weather");
      expect(files).toEqual([
        "services/weather/constants.ts",
        "services/weather/mod.ts",
        "services/weather/service.ts",
      ]);
    });

    it("should generate file paths without base path", () => {
      const files = getFilesToTry("");
      expect(files).toEqual([
        "constants.ts",
        "mod.ts",
        "service.ts",
      ]);
    });
  });
});
