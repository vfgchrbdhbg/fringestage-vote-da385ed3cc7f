"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { ethers } from "ethers";
import { Storage, WALLET_KEYS } from "@/lib/storage";

// EIP-6963 types
interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: ethers.Eip1193Provider;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  detail: EIP6963ProviderDetail;
}

interface WalletContextValue {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  availableWallets: EIP6963ProviderDetail[];
  connectWallet: (walletUuid?: string) => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [rawProvider, setRawProvider] = useState<any>(null); // EIP-1193 provider
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<EIP6963ProviderDetail[]>([]);

  // Discover EIP-6963 wallets
  useEffect(() => {
    const wallets: EIP6963ProviderDetail[] = [];

    const handleAnnouncement = (event: EIP6963AnnounceProviderEvent) => {
      wallets.push(event.detail);
      setAvailableWallets([...wallets]);
      console.log("📢 Discovered wallet:", {
        name: event.detail.info.name,
        uuid: event.detail.info.uuid,
        rdns: event.detail.info.rdns,
      });
    };

    window.addEventListener("eip6963:announceProvider", handleAnnouncement as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Fallback to window.ethereum if no EIP-6963 wallets after delay
    const fallbackTimer = setTimeout(() => {
      if (wallets.length === 0 && (window as any).ethereum) {
        console.log("📢 Using fallback window.ethereum");
        const fallbackWallet: EIP6963ProviderDetail = {
          info: {
            uuid: "legacy-ethereum",
            name: "Browser Wallet",
            icon: "",
            rdns: "legacy.ethereum",
          },
          provider: (window as any).ethereum,
        };
        wallets.push(fallbackWallet);
        setAvailableWallets([...wallets]);
      }
    }, 500);

    // Cleanup
    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement as EventListener);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Silent reconnection on page load
  useEffect(() => {
    const silentReconnect = async () => {
      const wasConnected = Storage.get(WALLET_KEYS.CONNECTED) === "true";
      const lastConnectorId = Storage.get(WALLET_KEYS.LAST_CONNECTOR_ID);
      
      console.log("🔄 Silent reconnect check:", { wasConnected, lastConnectorId, walletsCount: availableWallets.length });
      
      if (!wasConnected) {
        console.log("⏭️  Skip reconnect: was not connected");
        return;
      }

      if (!lastConnectorId) {
        console.log("⏭️  Skip reconnect: no last connector ID");
        Storage.set(WALLET_KEYS.CONNECTED, "false");
        return;
      }

      try {
        // Find the last used wallet by UUID, RDNS, or name (in order of preference)
        let wallet = availableWallets.find((w) => w.info.uuid === lastConnectorId);
        
        // Fallback: try to match by RDNS (more stable than UUID)
        if (!wallet) {
          const lastRdns = Storage.get(WALLET_KEYS.LAST_CONNECTOR_ID + "_rdns");
          if (lastRdns) {
            wallet = availableWallets.find((w) => w.info.rdns === lastRdns);
            console.log("🔍 Trying to match by RDNS:", lastRdns, wallet ? "✓ Found" : "✗ Not found");
          }
        }
        
        // Fallback: use first available wallet if only one exists
        if (!wallet && availableWallets.length === 1) {
          wallet = availableWallets[0];
          console.log("🔍 Using only available wallet:", wallet.info.name);
        }
        
        if (!wallet) {
          console.log("⚠️  Last used wallet not found:", { lastConnectorId, availableWallets: availableWallets.map(w => w.info) });
          Storage.set(WALLET_KEYS.CONNECTED, "false");
          return;
        }
        
        console.log("🔌 Attempting silent reconnect to:", wallet.info.name);
        
        const eip1193Provider = wallet.provider;
        const browserProvider = new ethers.BrowserProvider(eip1193Provider);
        
        // Use eth_accounts (no popup)
        const accounts = await browserProvider.send("eth_accounts", []);
        
        console.log("📋 eth_accounts result:", accounts);
        
        if (accounts && accounts.length > 0) {
          const network = await browserProvider.getNetwork();
          const signerInstance = await browserProvider.getSigner();
          
          setRawProvider(eip1193Provider);
          setProvider(browserProvider);
          setSigner(signerInstance);
          setAccount(accounts[0]);
          setChainId(Number(network.chainId));
          setIsConnected(true);
          
          console.log("✅ Wallet silently reconnected:", accounts[0]);
        } else {
          console.log("⚠️  No accounts available, clearing connection state");
          Storage.set(WALLET_KEYS.CONNECTED, "false");
        }
      } catch (err) {
        console.error("❌ Silent reconnect failed:", err);
        Storage.set(WALLET_KEYS.CONNECTED, "false");
      }
    };

    // Wait for wallets to be discovered
    if (availableWallets.length > 0) {
      // Small delay to ensure wallet is fully ready
      const timer = setTimeout(() => {
        silentReconnect();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [availableWallets]);

  // Event listeners for raw EIP-1193 provider
  useEffect(() => {
    if (!rawProvider || !provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log("📢 accountsChanged event:", accounts);
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        Storage.set(WALLET_KEYS.LAST_ACCOUNTS, JSON.stringify(accounts));
        
        // Rebuild signer
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      console.log("📢 chainChanged event:", chainIdHex);
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      Storage.set(WALLET_KEYS.LAST_CHAIN_ID, newChainId.toString());
      
      // Reload page on chain change (recommended by MetaMask)
      window.location.reload();
    };

    const handleDisconnect = () => {
      console.log("📢 disconnect event");
      disconnectWallet();
    };

    // Listen to raw EIP-1193 provider events
    rawProvider.on("accountsChanged", handleAccountsChanged);
    rawProvider.on("chainChanged", handleChainChanged);
    rawProvider.on("disconnect", handleDisconnect);

    return () => {
      rawProvider.removeListener("accountsChanged", handleAccountsChanged);
      rawProvider.removeListener("chainChanged", handleChainChanged);
      rawProvider.removeListener("disconnect", handleDisconnect);
    };
  }, [rawProvider, provider]);

  const connectWallet = useCallback(
    async (walletUuid?: string) => {
      setIsConnecting(true);
      setError(null);

      try {
        let walletToConnect: EIP6963ProviderDetail | undefined;

        if (walletUuid) {
          walletToConnect = availableWallets.find((w) => w.info.uuid === walletUuid);
        } else if (availableWallets.length > 0) {
          walletToConnect = availableWallets[0]; // Default to first wallet
        }

        if (!walletToConnect) {
          throw new Error("No wallet available. Please install MetaMask or another Web3 wallet.");
        }

        const eip1193Provider = walletToConnect.provider;
        const browserProvider = new ethers.BrowserProvider(eip1193Provider);
        
        // Request accounts (shows popup)
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        
        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found");
        }

        const network = await browserProvider.getNetwork();
        const signerInstance = await browserProvider.getSigner();

        // Update state
        setRawProvider(eip1193Provider);
        setProvider(browserProvider);
        setSigner(signerInstance);
        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setIsConnected(true);

        // Persist connection (store both UUID and RDNS for better matching)
        Storage.set(WALLET_KEYS.LAST_CONNECTOR_ID, walletToConnect.info.uuid);
        Storage.set(WALLET_KEYS.LAST_CONNECTOR_ID + "_rdns", walletToConnect.info.rdns);
        Storage.set(WALLET_KEYS.LAST_CONNECTOR_ID + "_name", walletToConnect.info.name);
        Storage.set(WALLET_KEYS.LAST_ACCOUNTS, JSON.stringify(accounts));
        Storage.set(WALLET_KEYS.LAST_CHAIN_ID, network.chainId.toString());
        Storage.set(WALLET_KEYS.CONNECTED, "true");

        console.log("✓ Wallet connected:", {
          account: accounts[0],
          wallet: walletToConnect.info.name,
          uuid: walletToConnect.info.uuid,
          rdns: walletToConnect.info.rdns,
        });
      } catch (err: any) {
        console.error("Connect wallet error:", err);
        setError(err.message || "Failed to connect wallet");
      } finally {
        setIsConnecting(false);
      }
    },
    [availableWallets]
  );

  const disconnectWallet = useCallback(() => {
    setRawProvider(null);
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setError(null);

    // Clear storage
    Storage.set(WALLET_KEYS.CONNECTED, "false");
    Storage.remove(WALLET_KEYS.LAST_ACCOUNTS);

    console.log("✓ Wallet disconnected");
  }, []);

  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      if (!provider) {
        throw new Error("No provider available");
      }

      try {
        await provider.send("wallet_switchEthereumChain", [
          { chainId: `0x${targetChainId.toString(16)}` },
        ]);
      } catch (err: any) {
        // Chain not added to wallet
        if (err.code === 4902) {
          throw new Error(`Please add chain ID ${targetChainId} to your wallet`);
        }
        throw err;
      }
    },
    [provider]
  );

  const value: WalletContextValue = {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isConnecting,
    error,
    availableWallets,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

