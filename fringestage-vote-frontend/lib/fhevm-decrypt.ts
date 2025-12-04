/**
 * Helper functions for FHEVM user decryption with signature
 */

interface DecryptionSignature {
  publicKey: string;
  privateKey: string;
  signature: string;
  contractAddresses: string[];
  userAddress: string;
  startTimestamp: number;
  durationDays: number;
}

/**
 * Request user signature for decryption and perform userDecrypt
 */
export async function userDecryptHandles(
  fhevmInstance: any,
  contractAddress: string,
  handles: string[],
  signer: any
): Promise<bigint[]> {
  // Generate keypair for this decryption
  const { publicKey, privateKey } = fhevmInstance.generateKeypair();
  
  // Create EIP712 typed data for signature
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 7; // Valid for 7 days
  
  const eip712 = fhevmInstance.createEIP712(
    publicKey,
    [contractAddress],
    startTimestamp,
    durationDays
  );
  
  // Request signature from user
  console.log("📝 Requesting decryption signature from user...");
  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message
  );
  
  console.log("✅ Signature obtained");
  
  // Prepare handles with contract address
  const handlesWithContract = handles.map(handle => ({
    handle,
    contractAddress
  }));
  
  // Perform userDecrypt
  console.log("🔓 Decrypting with user signature...");
  const decryptedResults = await fhevmInstance.userDecrypt(
    handlesWithContract,
    privateKey,
    publicKey,
    signature,
    [contractAddress],
    await signer.getAddress(),
    startTimestamp,
    durationDays
  );
  
  // Extract values in order
  const values: bigint[] = handles.map(handle => {
    const value = decryptedResults[handle];
    return typeof value === 'bigint' ? value : BigInt(value);
  });
  
  console.log("✅ Decryption complete");
  return values;
}


