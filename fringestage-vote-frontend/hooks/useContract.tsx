"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet";
import { FringeStageVoteABI } from "@/abi/FringeStageVoteABI";
import { FringeStageVoteAddresses } from "@/abi/FringeStageVoteAddresses";

export function useContract() {
  const { provider, signer, chainId } = useWallet();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!provider || !chainId) {
      setContract(null);
      setContractAddress(null);
      return;
    }

    const address = FringeStageVoteAddresses[chainId];
    if (!address) {
      console.warn(`No contract deployed on chain ${chainId}`);
      setContract(null);
      setContractAddress(null);
      return;
    }

    try {
      // Use signer if available, otherwise use provider (read-only)
      const contractInstance = new ethers.Contract(
        address,
        FringeStageVoteABI,
        signer || provider
      );
      
      setContract(contractInstance);
      setContractAddress(address);
      console.log(`✓ Contract connected at ${address}`);
    } catch (error) {
      console.error("Failed to connect to contract:", error);
      setContract(null);
      setContractAddress(null);
    }
  }, [provider, signer, chainId]);

  return { contract, contractAddress };
}

