import type { LoadedService } from "@/types/service-config";
import type { ServiceManifest, JSONSchema, DatasetSchemas } from "@/types/json-schema";

/**
 * Parse a git URL to extract repository info
 */
export function parseGitUrl(gitUrl: string): {
  provider: "github" | "gitlab" | "unknown";
  owner: string;
  repo: string;
  path: string;
  branch: string;
} | null {
  try {
    const url = new URL(gitUrl);
    const hostname = url.hostname.toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) return null;

    const owner = pathParts[0];
    const repo = pathParts[1];
    let branch = "main";
    let path = "";

    // Handle GitHub URLs
    if (hostname === "github.com" || hostname === "www.github.com") {
      // github.com/owner/repo/tree/branch/path or github.com/owner/repo/blob/branch/path
      if (pathParts.length > 3 && (pathParts[2] === "tree" || pathParts[2] === "blob")) {
        branch = pathParts[3];
        path = pathParts.slice(4).join("/");
      } else if (pathParts.length > 2) {
        path = pathParts.slice(2).join("/");
      }
      return { provider: "github", owner, repo, path, branch };
    }

    // Handle GitLab URLs
    if (hostname === "gitlab.com" || hostname === "www.gitlab.com") {
      if (pathParts.length > 3 && (pathParts[2] === "-" && pathParts[3] === "tree")) {
        branch = pathParts[4];
        path = pathParts.slice(5).join("/");
      } else if (pathParts.length > 2) {
        path = pathParts.slice(2).join("/");
      }
      return { provider: "gitlab", owner, repo, path, branch };
    }

    // Handle raw URLs
    if (hostname === "raw.githubusercontent.com") {
      branch = pathParts[2];
      path = pathParts.slice(3).join("/");
      return { provider: "github", owner, repo, path, branch };
    }

    return { provider: "unknown", owner, repo, path, branch };
  } catch {
    return null;
  }
}

/**
 * Get raw file URL from git URL
 */
export function getRawUrl(gitUrl: string, file: string): string | null {
  const parsed = parseGitUrl(gitUrl);
  if (!parsed) return null;

  const { provider, owner, repo, path, branch } = parsed;
  const fullPath = path ? `${path}/${file}` : file;

  if (provider === "github") {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
  }

  if (provider === "gitlab") {
    return `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${fullPath}`;
  }

  return null;
}

/**
 * Load service from git URL via API
 */
export async function loadServiceFromGit(gitUrl: string): Promise<LoadedService> {
  const response = await fetch("/api/services/load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gitUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to load service");
  }

  return response.json();
}

/**
 * Validate config against JSON schema (basic validation)
 */
export function validateConfig(
  config: Record<string, unknown>,
  schema: JSONSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (schema.type !== "object") {
    return { valid: true, errors: [] };
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in config) || config[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check property types
  if (schema.properties) {
    for (const [key, value] of Object.entries(config)) {
      const propSchema = schema.properties[key];
      if (propSchema) {
        const typeError = validateType(value, propSchema, key);
        if (typeError) errors.push(typeError);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateType(
  value: unknown,
  schema: JSONSchema,
  path: string
): string | null {
  if (value === null || value === undefined) {
    return null; // Optional fields handled by required check
  }

  const type = schema.type;
  if (!type) return null;

  switch (type) {
    case "string":
      if (typeof value !== "string") {
        return `${path} must be a string`;
      }
      if (schema.enum && !schema.enum.includes(value)) {
        return `${path} must be one of: ${schema.enum.join(", ")}`;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return `${path} must be at least ${schema.minLength} characters`;
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        return `${path} must be at most ${schema.maxLength} characters`;
      }
      break;

    case "number":
    case "integer":
      if (typeof value !== "number") {
        return `${path} must be a number`;
      }
      if (type === "integer" && !Number.isInteger(value)) {
        return `${path} must be an integer`;
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        return `${path} must be at least ${schema.minimum}`;
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        return `${path} must be at most ${schema.maximum}`;
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        return `${path} must be a boolean`;
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        return `${path} must be an array`;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        return `${path} must have at least ${schema.minItems} items`;
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        return `${path} must have at most ${schema.maxItems} items`;
      }
      break;

    case "object":
      if (typeof value !== "object" || Array.isArray(value)) {
        return `${path} must be an object`;
      }
      break;
  }

  return null;
}

/**
 * Get default value for a schema
 */
export function getSchemaDefault(schema: JSONSchema): unknown {
  if (schema.default !== undefined) {
    return schema.default;
  }

  switch (schema.type) {
    case "string":
      return "";
    case "number":
    case "integer":
      return schema.minimum ?? 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = getSchemaDefault(propSchema);
        }
        return obj;
      }
      return {};
    default:
      return null;
  }
}

/**
 * Generate config with defaults from schema
 */
export function generateDefaultConfig(schema: JSONSchema): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (schema.type !== "object" || !schema.properties) {
    return config;
  }

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    config[key] = getSchemaDefault(propSchema);
  }

  return config;
}
