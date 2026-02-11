import { Pubky, Client, Keypair, Session, PublicKey, type Address, type Path } from "@synonymdev/pubky";
import { config, isTestnet } from "@/lib/config";

export class PubkyClient {
  private sdk: Pubky | null = null;

  /**
   * Create Pubky instance with correct configuration
   */
  private createPubky(): Pubky {
    if (config.env === "testnet") {
      return Pubky.testnet();
    }

    const client = new Client({ pkarr: { relays: config.pkarr.relays } });
    return Pubky.withClient(client);
  }

  /**
   * Get or create the Pubky SDK instance
   */
  getSdk(): Pubky {
    if (!this.sdk) {
      this.sdk = this.createPubky();
    }
    return this.sdk;
  }

  /**
   * Restore keypair from recovery file
   */
  static restoreFromRecoveryFile(
    recoveryFile: Uint8Array,
    passphrase: string
  ): Keypair {
    return Keypair.fromRecoveryFile(recoveryFile, passphrase);
  }

  /**
   * Sign in with restored keypair
   */
  async signin(keypair: Keypair): Promise<Session> {
    const pubky = this.getSdk();
    const signer = pubky.signer(keypair);

    if (isTestnet) {
      const homeserverKey = PublicKey.from(config.homeserver.publicKey);
      return signer.signup(homeserverKey);
    }

    return signer.signin();
  }

  /**
   * Read data from public storage
   */
  async read<T = unknown>(path: string): Promise<T | null> {
    try {
      const pubky = this.getSdk();
      const data = await pubky.publicStorage.getJson(path as Address);
      return data as T | null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write data to storage (requires session)
   */
  async write(session: Session, path: string, data: unknown): Promise<void> {
    // Extract path from full URI if needed
    let pathOnly = path;
    if (path.startsWith('pubky://')) {
      const parsed = PubkyClient.parseUri(path);
      if (!parsed) {
        throw new Error(`Invalid pubky URI: ${path}`);
      }
      pathOnly = parsed.path;
    }
    // Ensure path starts with / and has no double slashes
    pathOnly = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    pathOnly = pathOnly.replace(/\/+/g, '/');
    await session.storage.putJson(pathOnly as Path, data);
  }

  /**
   * Delete data from storage (requires session)
   */
  async delete(session: Session, path: string): Promise<void> {
    // Extract path from full URI if needed
    let pathOnly = path;
    if (path.startsWith('pubky://')) {
      const parsed = PubkyClient.parseUri(path);
      if (!parsed) {
        throw new Error(`Invalid pubky URI: ${path}`);
      }
      pathOnly = parsed.path;
    }
    // Ensure path starts with / and has no double slashes
    pathOnly = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    pathOnly = pathOnly.replace(/\/+/g, '/');
    await session.storage.delete(pathOnly as Path);
  }

  /**
   * List files in a directory
   */
  async list(path: string): Promise<string[]> {
    try {
      const pubky = this.getSdk();
      // Ensure directory paths end with / for Pubky protocol
      const dirPath = path.endsWith('/') ? path : `${path}/`;
      const files = await pubky.publicStorage.list(dirPath as Address);
      return files || [];
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Build a pubky:// URI
   */
  static buildUri(publicKey: string, path: string): string {
    // Ensure path starts with / and remove any double slashes
    let cleanPath = path.startsWith("/") ? path : `/${path}`;
    cleanPath = cleanPath.replace(/\/+/g, '/');

    // Validate public key is not empty
    if (!publicKey || publicKey.trim().length === 0) {
      throw new Error("Public key cannot be empty");
    }

    return `pubky://${publicKey}${cleanPath}`;
  }

  /**
   * Parse a pubky:// URI
   */
  static parseUri(uri: string): { publicKey: string; path: string } | null {
    if (!uri.startsWith("pubky://")) {
      return null;
    }

    const withoutScheme = uri.slice(8);
    const slashIndex = withoutScheme.indexOf("/");

    if (slashIndex === -1) {
      return { publicKey: withoutScheme, path: "/" };
    }

    return {
      publicKey: withoutScheme.slice(0, slashIndex),
      path: withoutScheme.slice(slashIndex),
    };
  }
}

export const pubkyClient = new PubkyClient();
