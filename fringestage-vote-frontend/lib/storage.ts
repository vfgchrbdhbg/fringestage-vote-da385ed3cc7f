/**
 * Storage utilities for wallet persistence
 */

export class Storage {
  static set(key: string, value: string): void {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.error(`Failed to set ${key}:`, error);
      }
    }
  }

  static get(key: string): string | null {
    if (typeof window !== "undefined") {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.error(`Failed to get ${key}:`, error);
        return null;
      }
    }
    return null;
  }

  static remove(key: string): void {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error);
      }
    }
  }

  static clear(): void {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.clear();
      } catch (error) {
        console.error("Failed to clear storage:", error);
      }
    }
  }
}

// Wallet persistence keys
export const WALLET_KEYS = {
  LAST_CONNECTOR_ID: "wallet.lastConnectorId",
  LAST_ACCOUNTS: "wallet.lastAccounts",
  LAST_CHAIN_ID: "wallet.lastChainId",
  CONNECTED: "wallet.connected",
} as const;

// FHEVM keys
export const FHEVM_KEYS = {
  getDecryptionSignature: (account: string) => `fhevm.decryptionSignature.${account.toLowerCase()}`,
} as const;

