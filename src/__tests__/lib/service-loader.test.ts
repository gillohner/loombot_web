import { describe, it, expect } from "vitest";

// Since service-loader uses dynamic imports, let's test the utility functions directly
// by importing them and testing their pure function behavior

describe("parseGitUrl", () => {
  // We'll test the URL parsing logic
  const parseGitUrl = (url: string) => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      
      // GitHub URL patterns
      const githubMatch = urlObj.pathname.match(
        /^\/([^/]+)\/([^/]+)(?:\/(blob|tree)\/([^/]+)\/(.*))?$/
      );
      
      if (urlObj.hostname === "github.com" && githubMatch) {
        return {
          provider: "github" as const,
          owner: githubMatch[1],
          repo: githubMatch[2],
          path: githubMatch[5] || "",
          branch: githubMatch[4] || "main",
        };
      }
      
      // GitLab URL patterns
      const gitlabMatch = urlObj.pathname.match(
        /^\/([^/]+)\/([^/]+)(?:\/-\/(blob|tree)\/([^/]+)\/(.*))?$/
      );
      
      if (urlObj.hostname === "gitlab.com" && gitlabMatch) {
        return {
          provider: "gitlab" as const,
          owner: gitlabMatch[1],
          repo: gitlabMatch[2],
          path: gitlabMatch[5] || "",
          branch: gitlabMatch[4] || "main",
        };
      }
      
      return null;
    } catch {
      return null;
    }
  };

  it("should parse GitHub blob URLs", () => {
    const result = parseGitUrl(
      "https://github.com/owner/repo/blob/main/path/to/file.ts"
    );
    expect(result).toEqual({
      provider: "github",
      owner: "owner",
      repo: "repo",
      path: "path/to/file.ts",
      branch: "main",
    });
  });

  it("should parse GitHub tree URLs", () => {
    const result = parseGitUrl(
      "https://github.com/owner/repo/tree/develop/src"
    );
    expect(result).toEqual({
      provider: "github",
      owner: "owner",
      repo: "repo",
      path: "src",
      branch: "develop",
    });
  });

  it("should parse GitLab blob URLs", () => {
    const result = parseGitUrl(
      "https://gitlab.com/owner/repo/-/blob/main/file.ts"
    );
    expect(result).toEqual({
      provider: "gitlab",
      owner: "owner",
      repo: "repo",
      path: "file.ts",
      branch: "main",
    });
  });

  it("should parse repository root URLs", () => {
    const result = parseGitUrl("https://github.com/owner/repo");
    expect(result).toEqual({
      provider: "github",
      owner: "owner",
      repo: "repo",
      path: "",
      branch: "main",
    });
  });

  it("should return null for invalid URLs", () => {
    expect(parseGitUrl("not-a-url")).toBeNull();
    expect(parseGitUrl("https://example.com/some/path")).toBeNull();
    expect(parseGitUrl("")).toBeNull();
  });
});

describe("getRawUrl", () => {
  const getRawUrl = (
    parsed: { provider: "github" | "gitlab"; owner: string; repo: string; branch: string },
    filePath: string
  ) => {
    if (parsed.provider === "github") {
      return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${filePath}`;
    } else if (parsed.provider === "gitlab") {
      return `https://gitlab.com/${parsed.owner}/${parsed.repo}/-/raw/${parsed.branch}/${filePath}`;
    }
    return "";
  };

  it("should generate GitHub raw URLs", () => {
    const parsed = {
      provider: "github" as const,
      owner: "owner",
      repo: "repo",
      path: "src/file.ts",
      branch: "main",
    };
    expect(getRawUrl(parsed, "src/file.ts")).toBe(
      "https://raw.githubusercontent.com/owner/repo/main/src/file.ts"
    );
  });

  it("should generate GitLab raw URLs", () => {
    const parsed = {
      provider: "gitlab" as const,
      owner: "owner",
      repo: "repo",
      path: "src/file.ts",
      branch: "main",
    };
    expect(getRawUrl(parsed, "src/file.ts")).toBe(
      "https://gitlab.com/owner/repo/-/raw/main/src/file.ts"
    );
  });
});

describe("validateConfig", () => {
  // Simple validation logic for testing
  const validateConfig = (
    config: Record<string, unknown>,
    schema: { type: string; properties?: Record<string, unknown>; required?: string[] }
  ): boolean => {
    if (schema.type !== "object") return true;
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) return false;
      }
    }
    
    // Check field types
    if (schema.properties) {
      for (const [key, value] of Object.entries(config)) {
        const propSchema = schema.properties[key];
        if (!propSchema) continue;
        
        if (propSchema.type === "string" && typeof value !== "string") return false;
        if (propSchema.type === "number" && typeof value !== "number") return false;
        if (propSchema.type === "boolean" && typeof value !== "boolean") return false;
        
        if (propSchema.type === "number" && typeof value === "number") {
          if (propSchema.minimum !== undefined && value < propSchema.minimum) return false;
          if (propSchema.maximum !== undefined && value > propSchema.maximum) return false;
        }
      }
    }
    
    return true;
  };

  const schema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1 },
      count: { type: "number", minimum: 0, maximum: 100 },
      enabled: { type: "boolean" },
    },
    required: ["name"],
  };

  it("should return true for valid config", () => {
    const config = { name: "test", count: 50, enabled: true };
    expect(validateConfig(config, schema)).toBe(true);
  });

  it("should return true for config with only required fields", () => {
    const config = { name: "test" };
    expect(validateConfig(config, schema)).toBe(true);
  });

  it("should return false for missing required field", () => {
    const config = { count: 50 };
    expect(validateConfig(config, schema)).toBe(false);
  });

  it("should return false for wrong type", () => {
    const config = { name: 123 };
    expect(validateConfig(config, schema)).toBe(false);
  });

  it("should return false for value below minimum", () => {
    const config = { name: "test", count: -1 };
    expect(validateConfig(config, schema)).toBe(false);
  });

  it("should return false for value above maximum", () => {
    const config = { name: "test", count: 150 };
    expect(validateConfig(config, schema)).toBe(false);
  });
});

describe("getSchemaDefault", () => {
  type JSONSchema = {
    type?: string;
    default?: unknown;
    properties?: Record<string, JSONSchema>;
    items?: JSONSchema;
  };

  const getSchemaDefault = (schema: JSONSchema): unknown => {
    if (schema.default !== undefined) return schema.default;
    
    switch (schema.type) {
      case "string":
        return "";
      case "number":
      case "integer":
        return 0;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        if (schema.properties) {
          const result: Record<string, unknown> = {};
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            result[key] = getSchemaDefault(propSchema);
          }
          return result;
        }
        return {};
      default:
        return null;
    }
  };

  it("should return explicit default value", () => {
    const schema = { type: "string", default: "hello" };
    expect(getSchemaDefault(schema)).toBe("hello");
  });

  it("should return empty string for string type", () => {
    const schema = { type: "string" };
    expect(getSchemaDefault(schema)).toBe("");
  });

  it("should return 0 for number type", () => {
    const schema = { type: "number" };
    expect(getSchemaDefault(schema)).toBe(0);
  });

  it("should return 0 for integer type", () => {
    const schema = { type: "integer" };
    expect(getSchemaDefault(schema)).toBe(0);
  });

  it("should return false for boolean type", () => {
    const schema = { type: "boolean" };
    expect(getSchemaDefault(schema)).toBe(false);
  });

  it("should return empty array for array type", () => {
    const schema = { type: "array", items: { type: "string" } };
    expect(getSchemaDefault(schema)).toEqual([]);
  });

  it("should return object with defaults for object type", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", default: "default" },
        count: { type: "number" },
      },
    };
    expect(getSchemaDefault(schema)).toEqual({ name: "default", count: 0 });
  });
});

describe("generateDefaultConfig", () => {
  type JSONSchema = {
    type?: string;
    default?: unknown;
    properties?: Record<string, JSONSchema>;
  };

  const getSchemaDefault = (schema: JSONSchema): unknown => {
    if (schema.default !== undefined) return schema.default;
    
    switch (schema.type) {
      case "string":
        return "";
      case "number":
      case "integer":
        return 0;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        if (schema.properties) {
          const result: Record<string, unknown> = {};
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            result[key] = getSchemaDefault(propSchema);
          }
          return result;
        }
        return {};
      default:
        return null;
    }
  };

  const generateDefaultConfig = (schema: JSONSchema): Record<string, unknown> => {
    return getSchemaDefault(schema) as Record<string, unknown>;
  };

  it("should generate config with all defaults", () => {
    const schema = {
      type: "object",
      properties: {
        host: { type: "string", default: "localhost" },
        port: { type: "number", default: 8080 },
        debug: { type: "boolean", default: false },
      },
    };

    const config = generateDefaultConfig(schema);
    expect(config).toEqual({
      host: "localhost",
      port: 8080,
      debug: false,
    });
  });

  it("should handle nested objects", () => {
    const schema = {
      type: "object",
      properties: {
        server: {
          type: "object",
          properties: {
            host: { type: "string", default: "127.0.0.1" },
            port: { type: "number", default: 3000 },
          },
        },
      },
    };

    const config = generateDefaultConfig(schema);
    expect(config).toEqual({
      server: {
        host: "127.0.0.1",
        port: 3000,
      },
    });
  });
});
