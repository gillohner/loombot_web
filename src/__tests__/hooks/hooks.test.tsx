import { describe, it, expect } from "vitest";

// Pure logic tests for hooks functionality
// Testing the logic without rendering React components

describe("Hook Logic", () => {
  describe("Query key generation", () => {
    const generateQueryKey = (
      type: "botConfigs" | "serviceConfigs" | "datasets",
      id?: string
    ): (string | undefined)[] => {
      if (id) {
        return [type, id];
      }
      return [type];
    };

    it("should generate list key without id", () => {
      expect(generateQueryKey("botConfigs")).toEqual(["botConfigs"]);
    });

    it("should generate detail key with id", () => {
      expect(generateQueryKey("botConfigs", "123")).toEqual(["botConfigs", "123"]);
    });

    it("should work for all types", () => {
      expect(generateQueryKey("serviceConfigs")).toEqual(["serviceConfigs"]);
      expect(generateQueryKey("datasets")).toEqual(["datasets"]);
    });
  });

  describe("Storage enablement", () => {
    interface AuthState {
      session: object | null;
      publicKey: string | null;
    }

    const isStorageEnabled = (auth: AuthState): boolean => {
      return auth.session !== null && auth.publicKey !== null;
    };

    it("should be enabled when authenticated", () => {
      expect(
        isStorageEnabled({ session: {}, publicKey: "pk:user" })
      ).toBe(true);
    });

    it("should be disabled without session", () => {
      expect(
        isStorageEnabled({ session: null, publicKey: "pk:user" })
      ).toBe(false);
    });

    it("should be disabled without public key", () => {
      expect(
        isStorageEnabled({ session: {}, publicKey: null })
      ).toBe(false);
    });
  });

  describe("URI generation", () => {
    const generateUri = (
      publicKey: string,
      type: "service_configs" | "datasets",
      id: string
    ): string => {
      return `pubky://${publicKey}/pub/bot_builder/${type}/${id}`;
    };

    it("should generate service config URI", () => {
      const uri = generateUri("pk:user", "service_configs", "config1");
      expect(uri).toBe("pubky://pk:user/pub/bot_builder/service_configs/config1");
    });

    it("should generate dataset URI", () => {
      const uri = generateUri("pk:user", "datasets", "dataset1");
      expect(uri).toBe("pubky://pk:user/pub/bot_builder/datasets/dataset1");
    });
  });

  describe("Mutation helpers", () => {
    interface Config {
      id: string;
      name: string;
    }

    const addToList = (list: Config[], item: Config): Config[] => {
      return [...list, item];
    };

    const removeFromList = (list: Config[], id: string): Config[] => {
      return list.filter((item) => item.id !== id);
    };

    const updateInList = (list: Config[], item: Config): Config[] => {
      return list.map((existing) =>
        existing.id === item.id ? item : existing
      );
    };

    const testList: Config[] = [
      { id: "1", name: "First" },
      { id: "2", name: "Second" },
    ];

    it("should add item to list", () => {
      const newItem = { id: "3", name: "Third" };
      const result = addToList(testList, newItem);
      expect(result).toHaveLength(3);
      expect(result[2]).toEqual(newItem);
    });

    it("should remove item from list", () => {
      const result = removeFromList(testList, "1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should update item in list", () => {
      const updated = { id: "1", name: "Updated" };
      const result = updateInList(testList, updated);
      expect(result[0].name).toBe("Updated");
      expect(result[1].name).toBe("Second");
    });

    it("should not mutate original list", () => {
      const original = [...testList];
      addToList(testList, { id: "3", name: "Third" });
      expect(testList).toEqual(original);
    });
  });

  describe("Schema fetching logic", () => {
    const shouldFetchSchema = (gitUrl: string | null | undefined): boolean => {
      return Boolean(gitUrl && gitUrl.length > 0);
    };

    it("should fetch when URL provided", () => {
      expect(shouldFetchSchema("https://github.com/owner/repo")).toBe(true);
    });

    it("should not fetch when empty string", () => {
      expect(shouldFetchSchema("")).toBe(false);
    });

    it("should not fetch when null", () => {
      expect(shouldFetchSchema(null)).toBe(false);
    });

    it("should not fetch when undefined", () => {
      expect(shouldFetchSchema(undefined)).toBe(false);
    });
  });

  describe("Cache invalidation", () => {
    const getKeysToInvalidate = (
      type: "botConfig" | "serviceConfig" | "dataset",
      id?: string
    ): string[][] => {
      const typeMap = {
        botConfig: "botConfigs",
        serviceConfig: "serviceConfigs",
        dataset: "datasets",
      };
      const listKey = typeMap[type];

      if (id) {
        return [[listKey], [listKey, id]];
      }
      return [[listKey]];
    };

    it("should return list key only when no id", () => {
      const keys = getKeysToInvalidate("botConfig");
      expect(keys).toEqual([["botConfigs"]]);
    });

    it("should return both keys when id provided", () => {
      const keys = getKeysToInvalidate("botConfig", "123");
      expect(keys).toEqual([["botConfigs"], ["botConfigs", "123"]]);
    });
  });

  describe("Error handling", () => {
    const formatError = (error: unknown): string => {
      if (error instanceof Error) {
        return error.message;
      }
      if (typeof error === "string") {
        return error;
      }
      return "An unknown error occurred";
    };

    it("should format Error objects", () => {
      expect(formatError(new Error("Test error"))).toBe("Test error");
    });

    it("should format strings", () => {
      expect(formatError("String error")).toBe("String error");
    });

    it("should handle unknown errors", () => {
      expect(formatError({ weird: "object" })).toBe("An unknown error occurred");
    });
  });

  describe("Loading state management", () => {
    interface LoadingState {
      isFetching: boolean;
      isPending: boolean;
      isRefetching: boolean;
    }

    const isLoading = (state: LoadingState): boolean => {
      return state.isPending || state.isFetching;
    };

    it("should be loading when pending", () => {
      expect(isLoading({ isPending: true, isFetching: false, isRefetching: false })).toBe(true);
    });

    it("should be loading when fetching", () => {
      expect(isLoading({ isPending: false, isFetching: true, isRefetching: false })).toBe(true);
    });

    it("should not be loading when idle", () => {
      expect(isLoading({ isPending: false, isFetching: false, isRefetching: false })).toBe(false);
    });
  });
});
