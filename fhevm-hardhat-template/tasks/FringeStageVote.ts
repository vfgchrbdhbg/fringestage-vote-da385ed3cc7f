import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the FringeStageVote contract
 *
 *   npx hardhat --network localhost deploy --tags FringeStageVote
 *
 * 3. Create a session
 *
 *   npx hardhat --network localhost task:create-session --title "Hamlet Preview" --venue "Small Theater" --duration 86400
 *
 * 4. Submit a vote
 *
 *   npx hardhat --network localhost task:vote --session 0 --plot 85 --performance 90 --stage 80 --pacing 88
 *
 * 5. Get session info
 *
 *   npx hardhat --network localhost task:session-info --session 0
 *
 * 6. Request decryption (after session ends and sufficient votes)
 *
 *   npx hardhat --network localhost task:request-decryption --session 0
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:fvote-address
 *   - npx hardhat --network sepolia task:fvote-address
 */
task("task:fvote-address", "Prints the FringeStageVote address").setAction(
  async function (_taskArguments: TaskArguments, hre) {
    const { deployments } = hre;

    const fringeStageVote = await deployments.get("FringeStageVote");

    console.log("FringeStageVote address is " + fringeStageVote.address);
  },
);

/**
 * Example:
 *   - npx hardhat --network localhost task:create-session --title "Hamlet Preview" --venue "Small Theater" --duration 3600
 *   - npx hardhat --network sepolia task:create-session --title "Hamlet Preview" --venue "Small Theater" --duration 3600
 */
task("task:create-session", "Creates a new performance session")
  .addOptionalParam("address", "Optionally specify the FringeStageVote contract address")
  .addParam("title", "Performance title")
  .addParam("venue", "Venue name")
  .addParam("duration", "Session duration in seconds (default: 86400 = 1 day)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const FringeStageVoteDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FringeStageVote");
    console.log(`FringeStageVote: ${FringeStageVoteDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("FringeStageVote", FringeStageVoteDeployment.address);

    const startTime = Math.floor(Date.now() / 1000); // Current timestamp
    const duration = parseInt(taskArguments.duration) || 86400;
    const endTime = startTime + duration;

    const tx = await contract
      .connect(signers[0])
      .createSession(taskArguments.title, taskArguments.venue, startTime, endTime);

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    // Parse event to get session ID
    const event = receipt?.logs.find((log: any) => {
      try {
        return contract.interface.parseLog(log)?.name === "SessionCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      console.log(`Session created with ID: ${parsedEvent?.args.sessionId}`);
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vote --session 0 --plot 85 --performance 90 --stage 80 --pacing 88
 *   - npx hardhat --network localhost task:vote --session 0 --plot 85 --performance 90 --stage 80 --pacing 88 --account 1
 *   - npx hardhat --network sepolia task:vote --session 0 --plot 85 --performance 90 --stage 80 --pacing 88
 */
task("task:vote", "Submits an encrypted vote")
  .addOptionalParam("address", "Optionally specify the FringeStageVote contract address")
  .addOptionalParam("account", "Account index to use (default: 0)", "0")
  .addParam("session", "Session ID to vote for")
  .addParam("plot", "Plot tension rating (0-100)")
  .addParam("performance", "Performance rating (0-100)")
  .addParam("stage", "Stage design rating (0-100)")
  .addParam("pacing", "Pacing rating (0-100)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const sessionId = parseInt(taskArguments.session);
    const plotTension = parseInt(taskArguments.plot);
    const performance = parseInt(taskArguments.performance);
    const stageDesign = parseInt(taskArguments.stage);
    const pacing = parseInt(taskArguments.pacing);
    const accountIndex = parseInt(taskArguments.account);

    // Validate ratings
    if (
      plotTension < 0 ||
      plotTension > 100 ||
      performance < 0 ||
      performance > 100 ||
      stageDesign < 0 ||
      stageDesign > 100 ||
      pacing < 0 ||
      pacing > 100
    ) {
      throw new Error("All ratings must be between 0 and 100");
    }

    await fhevm.initializeCLIApi();

    const FringeStageVoteDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FringeStageVote");
    console.log(`FringeStageVote: ${FringeStageVoteDeployment.address}`);

    const signers = await ethers.getSigners();
    const signer = signers[accountIndex];
    
    if (!signer) {
      throw new Error(`Account index ${accountIndex} not found. Available accounts: 0-${signers.length - 1}`);
    }
    
    console.log(`Using account ${accountIndex}: ${signer.address}`);
    
    const contract = await ethers.getContractAt("FringeStageVote", FringeStageVoteDeployment.address);

    // Encrypt all four ratings
    const encryptedPlotTension = await fhevm
      .createEncryptedInput(FringeStageVoteDeployment.address, signer.address)
      .add16(plotTension)
      .encrypt();

    const encryptedPerformance = await fhevm
      .createEncryptedInput(FringeStageVoteDeployment.address, signer.address)
      .add16(performance)
      .encrypt();

    const encryptedStageDesign = await fhevm
      .createEncryptedInput(FringeStageVoteDeployment.address, signer.address)
      .add16(stageDesign)
      .encrypt();

    const encryptedPacing = await fhevm
      .createEncryptedInput(FringeStageVoteDeployment.address, signer.address)
      .add16(pacing)
      .encrypt();

    // Create a simple comment hash (in production, this would be SHA-256 of actual comment)
    const commentHash = ethers.keccak256(ethers.toUtf8Bytes(`Comment from account ${accountIndex}`));

    const tx = await contract.connect(signer).submitVote(
      sessionId,
      encryptedPlotTension.handles[0],
      encryptedPlotTension.inputProof,
      encryptedPerformance.handles[0],
      encryptedPerformance.inputProof,
      encryptedStageDesign.handles[0],
      encryptedStageDesign.inputProof,
      encryptedPacing.handles[0],
      encryptedPacing.inputProof,
      commentHash,
    );

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log("Vote submitted successfully!");
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:session-info --session 0
 *   - npx hardhat --network sepolia task:session-info --session 0
 */
task("task:session-info", "Gets session information")
  .addOptionalParam("address", "Optionally specify the FringeStageVote contract address")
  .addParam("session", "Session ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const sessionId = parseInt(taskArguments.session);

    const FringeStageVoteDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FringeStageVote");
    console.log(`FringeStageVote: ${FringeStageVoteDeployment.address}`);

    const contract = await ethers.getContractAt("FringeStageVote", FringeStageVoteDeployment.address);

    const sessionInfo = await contract.getSessionInfo(sessionId);

    console.log("\n=== Session Information ===");
    console.log(`Title: ${sessionInfo.title}`);
    console.log(`Venue: ${sessionInfo.venue}`);
    console.log(`Start Time: ${new Date(Number(sessionInfo.startTime) * 1000).toLocaleString()}`);
    console.log(`End Time: ${new Date(Number(sessionInfo.endTime) * 1000).toLocaleString()}`);
    console.log(`Theater Company: ${sessionInfo.theaterCompany}`);
    console.log(`Vote Count: ${sessionInfo.voteCount}`);
    console.log(`Is Active: ${sessionInfo.isActive}`);
    console.log(`Decryption Completed: ${sessionInfo.decryptionCompleted}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:request-decryption --session 0
 *   - npx hardhat --network sepolia task:request-decryption --session 0
 */
task("task:request-decryption", "Requests decryption of aggregated results")
  .addOptionalParam("address", "Optionally specify the FringeStageVote contract address")
  .addParam("session", "Session ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const sessionId = parseInt(taskArguments.session);

    const FringeStageVoteDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FringeStageVote");
    console.log(`FringeStageVote: ${FringeStageVoteDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("FringeStageVote", FringeStageVoteDeployment.address);

    const tx = await contract.connect(signers[0]).requestDecryption(sessionId);

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log("Decryption requested successfully!");
    console.log(
      "Note: In production, the decryption oracle will process this request and call back with results.",
    );
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-results --session 0
 *   - npx hardhat --network sepolia task:decrypt-results --session 0
 */
task("task:decrypt-results", "Decrypts and displays aggregated results (mock environment only)")
  .addOptionalParam("address", "Optionally specify the FringeStageVote contract address")
  .addParam("session", "Session ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const sessionId = parseInt(taskArguments.session);

    await fhevm.initializeCLIApi();

    const FringeStageVoteDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FringeStageVote");
    console.log(`FringeStageVote: ${FringeStageVoteDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("FringeStageVote", FringeStageVoteDeployment.address);

    // Get encrypted aggregates
    const aggregates = await contract.getEncryptedAggregates(sessionId);
    const sessionInfo = await contract.getSessionInfo(sessionId);

    // Decrypt each aggregate
    const clearPlotTension = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      aggregates.plotTension,
      FringeStageVoteDeployment.address,
      signers[0],
    );

    const clearPerformance = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      aggregates.performance,
      FringeStageVoteDeployment.address,
      signers[0],
    );

    const clearStageDesign = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      aggregates.stageDesign,
      FringeStageVoteDeployment.address,
      signers[0],
    );

    const clearPacing = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      aggregates.pacing,
      FringeStageVoteDeployment.address,
      signers[0],
    );

    const voteCount = Number(sessionInfo.voteCount);

    console.log("\n=== Aggregated Results ===");
    console.log(`Total Votes: ${voteCount}`);
    console.log(`\nTotal Scores (Sum):`);
    console.log(`  Plot Tension: ${clearPlotTension}`);
    console.log(`  Performance: ${clearPerformance}`);
    console.log(`  Stage Design: ${clearStageDesign}`);
    console.log(`  Pacing: ${clearPacing}`);

    if (voteCount > 0) {
      console.log(`\nAverage Scores:`);
      console.log(`  Plot Tension: ${(clearPlotTension / voteCount).toFixed(2)}`);
      console.log(`  Performance: ${(clearPerformance / voteCount).toFixed(2)}`);
      console.log(`  Stage Design: ${(clearStageDesign / voteCount).toFixed(2)}`);
      console.log(`  Pacing: ${(clearPacing / voteCount).toFixed(2)}`);
    }

    // Prompt to store results on-chain
    console.log("\n=== Store Results On-Chain ===");
    console.log("To make these results publicly viewable in the frontend, run:");
    console.log(`npx hardhat task:store-decrypted --session ${sessionId} --plot ${clearPlotTension} --performance ${clearPerformance} --stage ${clearStageDesign} --pacing ${clearPacing}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:store-decrypted --session 0 --plot 425 --performance 450 --stage 380 --pacing 410
 *   - npx hardhat --network sepolia task:store-decrypted --session 0 --plot 425 --performance 450 --stage 380 --pacing 410
 */
task("task:store-decrypted", "Stores decrypted results on-chain for public viewing")
  .addOptionalParam("address", "Optionally specify the FringeStageVote contract address")
  .addParam("session", "Session ID")
  .addParam("plot", "Total plot tension score")
  .addParam("performance", "Total performance score")
  .addParam("stage", "Total stage design score")
  .addParam("pacing", "Total pacing score")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const sessionId = parseInt(taskArguments.session);
    const totalPlotTension = parseInt(taskArguments.plot);
    const totalPerformance = parseInt(taskArguments.performance);
    const totalStageDesign = parseInt(taskArguments.stage);
    const totalPacing = parseInt(taskArguments.pacing);

    const FringeStageVoteDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FringeStageVote");
    console.log(`FringeStageVote: ${FringeStageVoteDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("FringeStageVote", FringeStageVoteDeployment.address);

    console.log(`\nStoring decrypted results for session ${sessionId}...`);
    const tx = await contract
      .connect(signers[0])
      .storeDecryptedResults(sessionId, totalPlotTension, totalPerformance, totalStageDesign, totalPacing);

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    if (receipt?.status === 1) {
      console.log("\n✅ Results successfully stored on-chain!");
      console.log("🎭 These results are now publicly viewable in the frontend Results page.");
    } else {
      console.log("\n❌ Transaction failed.");
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:end-session --session 0
 *   - npx hardhat --network sepolia task:end-session --session 0
 */
task("task:end-session", "Ends a session (theater company only)")
  .addOptionalParam("address", "Optionally specify the FringeStageVote contract address")
  .addParam("session", "Session ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const sessionId = parseInt(taskArguments.session);

    const FringeStageVoteDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FringeStageVote");
    console.log(`FringeStageVote: ${FringeStageVoteDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("FringeStageVote", FringeStageVoteDeployment.address);

    const tx = await contract.connect(signers[0]).endSession(sessionId);

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log("Session ended successfully!");
  });

