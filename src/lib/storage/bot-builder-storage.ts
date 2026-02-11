import type { Session } from "@synonymdev/pubky";
import { pubkyClient, PubkyClient } from "@/lib/pubky/client";
import { config } from "@/lib/config";
import type { BotConfig } from "@/types/bot-config";
import type { ServiceConfig } from "@/types/service-config";
import type { Dataset } from "@/types/dataset";

export class BotBuilderStorage {
  private session: Session;
  private publicKey: string;

  constructor(session: Session, publicKey: string) {
    if (!publicKey || publicKey.trim().length === 0) {
      throw new Error("BotBuilderStorage: publicKey cannot be empty");
    }
    this.session = session;
    this.publicKey = publicKey;
  }

  // ============================================
  // Bot Configs
  // ============================================

  async listConfigs(): Promise<BotConfig[]> {
    const basePath = `pubky://${this.publicKey}${config.botBuilder.configsPath}`;
    try {
      const files = await pubkyClient.list(basePath);
      const configs: BotConfig[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        // Pubky SDK list() returns full URIs, not just filenames
        const configPath = file.startsWith('pubky://') ? file : `${basePath}/${file}`;
        const data = await pubkyClient.read<BotConfig>(configPath);
        if (data) {
          // Ensure configId is populated (derive from filename if missing)
          if (!data.configId) {
            const filename = file.split('/').pop() ?? '';
            data.configId = filename.replace(/\.json$/, '');
          }
          configs.push(data);
        }
      }

      return configs.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error("Failed to list configs:", error);
      return [];
    }
  }

  async getConfig(id: string): Promise<BotConfig | null> {
    const path = `pubky://${this.publicKey}${config.botBuilder.configsPath}/${id}.json`;
    return pubkyClient.read<BotConfig>(path);
  }

  async saveConfig(botConfig: BotConfig): Promise<void> {
    const path = `pubky://${this.publicKey}${config.botBuilder.configsPath}/${botConfig.configId}.json`;
    await pubkyClient.write(this.session, path, botConfig);
  }

  async deleteConfig(id: string): Promise<void> {
    const path = `pubky://${this.publicKey}${config.botBuilder.configsPath}/${id}.json`;
    await pubkyClient.delete(this.session, path);
  }

  // ============================================
  // Service Configs
  // ============================================

  async listServiceConfigs(): Promise<ServiceConfig[]> {
    const basePath = `pubky://${this.publicKey}${config.botBuilder.serviceConfigsPath}`;
    try {
      const files = await pubkyClient.list(basePath);
      const configs: ServiceConfig[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        // Pubky SDK list() returns full URIs, not just filenames
        // Use the file directly if it's already a full URI
        const configPath = file.startsWith('pubky://') ? file : `${basePath}/${file}`;
        const data = await pubkyClient.read<ServiceConfig>(configPath);
        if (data) {
          // Ensure configId is populated (derive from filename if missing)
          if (!data.configId) {
            const filename = file.split('/').pop() ?? '';
            data.configId = filename.replace(/\.json$/, '');
          }
          configs.push(data);
        }
      }

      return configs.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error("Failed to list service configs:", error);
      return [];
    }
  }

  async getServiceConfig(id: string): Promise<ServiceConfig | null> {
    const path = `pubky://${this.publicKey}${config.botBuilder.serviceConfigsPath}/${id}.json`;
    return pubkyClient.read<ServiceConfig>(path);
  }

  async saveServiceConfig(serviceConfig: ServiceConfig): Promise<void> {
    const path = `pubky://${this.publicKey}${config.botBuilder.serviceConfigsPath}/${serviceConfig.configId}.json`;
    await pubkyClient.write(this.session, path, serviceConfig);
  }

  async deleteServiceConfig(id: string): Promise<void> {
    const path = `pubky://${this.publicKey}${config.botBuilder.serviceConfigsPath}/${id}.json`;
    await pubkyClient.delete(this.session, path);
  }

  // ============================================
  // Datasets
  // ============================================

  async listDatasets(): Promise<Dataset[]> {
    const basePath = `pubky://${this.publicKey}${config.botBuilder.datasetsPath}`;
    try {
      const files = await pubkyClient.list(basePath);
      const datasets: Dataset[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        // Pubky SDK list() returns full URIs, not just filenames
        const datasetPath = file.startsWith('pubky://') ? file : `${basePath}/${file}`;
        const data = await pubkyClient.read<Dataset>(datasetPath);
        if (data) {
          datasets.push(data);
        }
      }

      return datasets.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error("Failed to list datasets:", error);
      return [];
    }
  }

  async getDataset(id: string): Promise<Dataset | null> {
    const path = `pubky://${this.publicKey}${config.botBuilder.datasetsPath}/${id}.json`;
    return pubkyClient.read<Dataset>(path);
  }

  async saveDataset(dataset: Dataset): Promise<void> {
    const path = `pubky://${this.publicKey}${config.botBuilder.datasetsPath}/${dataset.id}.json`;
    await pubkyClient.write(this.session, path, dataset);
  }

  async deleteDataset(id: string): Promise<void> {
    const path = `pubky://${this.publicKey}${config.botBuilder.datasetsPath}/${id}.json`;
    await pubkyClient.delete(this.session, path);
  }

  // ============================================
  // Utilities
  // ============================================

  buildServiceConfigUri(id: string): string {
    return PubkyClient.buildUri(
      this.publicKey,
      `${config.botBuilder.serviceConfigsPath}/${id}.json`
    );
  }

  buildDatasetUri(id: string): string {
    return PubkyClient.buildUri(
      this.publicKey,
      `${config.botBuilder.datasetsPath}/${id}.json`
    );
  }

  buildConfigUri(id: string): string {
    return PubkyClient.buildUri(
      this.publicKey,
      `${config.botBuilder.configsPath}/${id}.json`
    );
  }
}

// ============================================
// Public Storage (no auth required)
// ============================================

export async function fetchPublicServiceConfig(
  uri: string
): Promise<ServiceConfig | null> {
  const parsed = PubkyClient.parseUri(uri);
  if (!parsed) return null;
  return pubkyClient.read<ServiceConfig>(uri);
}

export async function fetchPublicDataset(uri: string): Promise<Dataset | null> {
  const parsed = PubkyClient.parseUri(uri);
  if (!parsed) return null;
  return pubkyClient.read<Dataset>(uri);
}

export async function fetchPublicBotConfig(
  uri: string
): Promise<BotConfig | null> {
  const parsed = PubkyClient.parseUri(uri);
  if (!parsed) return null;
  return pubkyClient.read<BotConfig>(uri);
}
