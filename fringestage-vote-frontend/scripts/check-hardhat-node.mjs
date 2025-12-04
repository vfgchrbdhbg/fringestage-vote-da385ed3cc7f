#!/usr/bin/env node

import http from "http";

const HARDHAT_URL = "http://127.0.0.1:8545";
const EXPECTED_CHAIN_ID = "0x7a69"; // 31337 in hex

function checkHardhatNode() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
      id: 1,
    });

    const options = {
      hostname: "127.0.0.1",
      port: 8545,
      path: "/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          if (response.result === EXPECTED_CHAIN_ID) {
            console.log("✓ Hardhat node is running on http://127.0.0.1:8545");
            console.log(`✓ Chain ID: ${parseInt(EXPECTED_CHAIN_ID, 16)} (${EXPECTED_CHAIN_ID})`);
            resolve(true);
          } else {
            console.error(`❌ Unexpected chain ID: ${response.result}`);
            console.error(`   Expected: ${EXPECTED_CHAIN_ID} (31337)`);
            reject(new Error("Wrong chain ID"));
          }
        } catch (error) {
          console.error("❌ Failed to parse response from Hardhat node");
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("\n❌ Error: Hardhat node is not running!\n");
      console.error("Please start the Hardhat node first:");
      console.error("   cd ../fhevm-hardhat-template");
      console.error("   npx hardhat node\n");
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      console.error("❌ Connection timeout");
      reject(new Error("Connection timeout"));
    });

    req.write(postData);
    req.end();
  });
}

checkHardhatNode()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });

