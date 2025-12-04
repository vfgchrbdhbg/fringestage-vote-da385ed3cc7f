"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useWallet } from "@/hooks/useWallet";

// Type definitions for fhevmjs / @fhevm/mock-utils
interface FhevmInstance {
  createEncryptedInput: (contractAddress: string, userAddress: string) => any;
  publicDecrypt: (handles: (string | Uint8Array)[]) => Promise<Record<string, bigint | boolean>>;
  userDecrypt: (handles: (string | Uint8Array)[], signer: any) => Promise<Record<string, bigint | boolean>>;
  // Add more methods as needed
}

interface FhevmContextValue {
  fhevmInstance: FhevmInstance | null;
  isInitialized: boolean;
  isMockMode: boolean;
  error: string | null;
}

const FhevmContext = createContext<FhevmContextValue | undefined>(undefined);

const MOCK_CHAIN_ID = 31337;
const SEPOLIA_CHAIN_ID = 11155111;

export function FhevmProvider({ children }: { children: ReactNode }) {
  const { provider, account, chainId } = useWallet();
  const [fhevmInstance, setFhevmInstance] = useState<FhevmInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    const initializeFhevm = async () => {
      if (!provider || !account || !chainId) {
        setFhevmInstance(null);
        setIsInitialized(false);
        return;
      }

      try {
        setError(null);
        
        if (chainId === MOCK_CHAIN_ID || chainId === SEPOLIA_CHAIN_ID) {
          setIsMockMode(chainId === MOCK_CHAIN_ID);
          
          if (chainId === MOCK_CHAIN_ID) {
            // Use MockFhevmInstance for localhost Hardhat node
            const ethersModule = await import("ethers");
            const provider = new ethersModule.JsonRpcProvider("http://127.0.0.1:8545");
            
            // Fetch FHEVM metadata from Hardhat node
            const metadata = await provider.send("fhevm_relayer_metadata", []);
            console.log("✓ Retrieved FHEVM metadata from Hardhat node");
            
            // Dynamically import mock utils (to avoid bundling in production)
            const { MockFhevmInstance } = await import("@fhevm/mock-utils");
            
            // Query InputVerifier's EIP712 domain for correct verifyingContract address
            const inputVerifierContract = new ethersModule.Contract(
              metadata.InputVerifierAddress,
              ["function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"],
              provider
            );
            const domain = await inputVerifierContract.eip712Domain();
            const verifyingContractAddress = domain[4]; // index 4 is the verifyingContract address
            const domainChainId = Number(domain[3]); // index 3 is chainId
            
            console.log(`✓ InputVerifier EIP712 domain: chainId=${domainChainId}, verifyingContract=${verifyingContractAddress}`);
            
            const instance = await MockFhevmInstance.create(
              provider,
              provider,
              {
                aclContractAddress: metadata.ACLAddress,
                chainId: chainId,
                gatewayChainId: domainChainId,
                inputVerifierContractAddress: metadata.InputVerifierAddress,
                kmsContractAddress: metadata.KMSVerifierAddress,
                verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
                verifyingContractAddressInputVerification: verifyingContractAddress,
              },
              {
                // v0.3.0 requires 4th parameter: properties
                inputVerifierProperties: {},
                kmsVerifierProperties: {},
              }
            );
            
            setFhevmInstance(instance as any);
            setIsInitialized(true);
            console.log("✓ FHEVM initialized in MOCK mode (v0.3.0)");
          } else {
            // Use fhevmjs for Sepolia (relayer mode)
            const { createInstance } = await import("fhevmjs");
            
            const instance = await createInstance({
              chainId: chainId,
              gatewayUrl: "https://gateway.sepolia.zama.dev",
            });
            
            setFhevmInstance(instance as any);
            setIsInitialized(true);
            console.log("✓ FHEVM initialized in RELAYER mode");
          }
        } else {
          setError(`Unsupported chain ID: ${chainId}. Please switch to Sepolia (${SEPOLIA_CHAIN_ID}) or localhost (${MOCK_CHAIN_ID})`);
          setIsInitialized(false);
        }
      } catch (err: any) {
        console.error("Failed to initialize FHEVM:", err);
        setError(err.message || "Failed to initialize FHEVM");
        setIsInitialized(false);
      }
    };

    initializeFhevm();
  }, [provider, account, chainId]);

  const value: FhevmContextValue = {
    fhevmInstance,
    isInitialized,
    isMockMode,
    error,
  };

  return <FhevmContext.Provider value={value}>{children}</FhevmContext.Provider>;
}

export function useFhevm() {
  const context = useContext(FhevmContext);
  if (context === undefined) {
    throw new Error("useFhevm must be used within an FhevmProvider");
  }
  return context;
}

