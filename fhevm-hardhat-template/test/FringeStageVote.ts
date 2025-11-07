import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FringeStageVote, FringeStageVote__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
  theaterCompany: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FringeStageVote")) as FringeStageVote__factory;
  const contract = (await factory.deploy()) as FringeStageVote;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FringeStageVote", function () {
  let signers: Signers;
  let contract: FringeStageVote;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
      theaterCompany: ethSigners[4],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite is designed for FHEVM mock environment`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Session Management", function () {
    it("should create a new session successfully", async function () {
      const title = "Hamlet Preview";
      const venue = "Small Theater";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600; // 1 hour session

      const tx = await contract
        .connect(signers.theaterCompany)
        .createSession(title, venue, startTime, endTime);

      await tx.wait();

      const sessionInfo = await contract.getSessionInfo(0);
      expect(sessionInfo.title).to.equal(title);
      expect(sessionInfo.venue).to.equal(venue);
      expect(sessionInfo.theaterCompany).to.equal(signers.theaterCompany.address);
      expect(sessionInfo.voteCount).to.equal(0);
      expect(sessionInfo.isActive).to.be.true;
      expect(sessionInfo.decryptionCompleted).to.be.false;
    });

    it("should emit SessionCreated event", async function () {
      const title = "Macbeth Preview";
      const venue = "Grand Theater";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600;

      await expect(contract.connect(signers.theaterCompany).createSession(title, venue, startTime, endTime))
        .to.emit(contract, "SessionCreated")
        .withArgs(0, title, venue, startTime, endTime, signers.theaterCompany.address);
    });

    it("should auto-authorize theater company on session creation", async function () {
      const title = "Romeo Preview";
      const venue = "Small Theater";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600;

      await contract.connect(signers.theaterCompany).createSession(title, venue, startTime, endTime);

      const isAuthorized = await contract.isAuthorized(0, signers.theaterCompany.address);
      expect(isAuthorized).to.be.true;
    });

    it("should allow theater company to end session", async function () {
      const title = "Othello Preview";
      const venue = "Small Theater";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600;

      await contract.connect(signers.theaterCompany).createSession(title, venue, startTime, endTime);

      await contract.connect(signers.theaterCompany).endSession(0);

      const sessionInfo = await contract.getSessionInfo(0);
      expect(sessionInfo.isActive).to.be.false;
    });

    it("should reject ending session by non-theater-company", async function () {
      const title = "King Lear Preview";
      const venue = "Small Theater";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600;

      await contract.connect(signers.theaterCompany).createSession(title, venue, startTime, endTime);

      await expect(contract.connect(signers.alice).endSession(0)).to.be.revertedWithCustomError(
        contract,
        "OnlyTheaterCompany",
      );
    });
  });

  describe("Vote Submission", function () {
    let sessionId: number;

    beforeEach(async function () {
      const title = "Test Performance";
      const venue = "Test Venue";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600;

      const tx = await contract
        .connect(signers.theaterCompany)
        .createSession(title, venue, startTime, endTime);
      await tx.wait();
      sessionId = 0;
    });

    it("should submit a vote successfully", async function () {
      // Create encrypted inputs
      const plotTension = 85;
      const performance = 90;
      const stageDesign = 80;
      const pacing = 88;

      const encryptedPlotTension = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(plotTension)
        .encrypt();

      const encryptedPerformance = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(performance)
        .encrypt();

      const encryptedStageDesign = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(stageDesign)
        .encrypt();

      const encryptedPacing = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(pacing)
        .encrypt();

      const commentHash = ethers.keccak256(ethers.toUtf8Bytes("Great performance!"));

      const tx = await contract.connect(signers.alice).submitVote(
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

      await tx.wait();

      const sessionInfo = await contract.getSessionInfo(sessionId);
      expect(sessionInfo.voteCount).to.equal(1);

      const hasVoted = await contract.hasVoted(sessionId, signers.alice.address);
      expect(hasVoted).to.be.true;
    });

    it("should emit VoteSubmitted event", async function () {
      const plotTension = 75;
      const encryptedPlotTension = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(plotTension)
        .encrypt();

      const encryptedPerformance = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(80)
        .encrypt();

      const encryptedStageDesign = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(85)
        .encrypt();

      const encryptedPacing = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(90)
        .encrypt();

      const commentHash = ethers.keccak256(ethers.toUtf8Bytes("Amazing show!"));

      await expect(
        contract.connect(signers.alice).submitVote(
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
        ),
      )
        .to.emit(contract, "VoteSubmitted")
        .withArgs(sessionId, signers.alice.address, 1);
    });

    it("should reject duplicate votes", async function () {
      // First vote
      const encryptedPlotTension = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(85)
        .encrypt();

      const encryptedPerformance = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(90)
        .encrypt();

      const encryptedStageDesign = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(80)
        .encrypt();

      const encryptedPacing = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(88)
        .encrypt();

      const commentHash = ethers.keccak256(ethers.toUtf8Bytes("First vote"));

      await contract.connect(signers.alice).submitVote(
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

      // Attempt second vote
      await expect(
        contract.connect(signers.alice).submitVote(
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
        ),
      ).to.be.revertedWithCustomError(contract, "AlreadyVoted");
    });

    it("should reject votes for ended sessions", async function () {
      // End the session
      await contract.connect(signers.theaterCompany).endSession(sessionId);

      const encryptedPlotTension = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(85)
        .encrypt();

      const encryptedPerformance = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(90)
        .encrypt();

      const encryptedStageDesign = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(80)
        .encrypt();

      const encryptedPacing = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(88)
        .encrypt();

      const commentHash = ethers.keccak256(ethers.toUtf8Bytes("Late vote"));

      await expect(
        contract.connect(signers.alice).submitVote(
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
        ),
      ).to.be.revertedWithCustomError(contract, "SessionNotActive");
    });
  });

  describe("Aggregation and Decryption", function () {
    let sessionId: number;

    beforeEach(async function () {
      const title = "Test Performance";
      const venue = "Test Venue";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600;

      const tx = await contract
        .connect(signers.theaterCompany)
        .createSession(title, venue, startTime, endTime);
      await tx.wait();
      sessionId = 0;
    });

    it("should aggregate multiple votes correctly", async function () {
      // Submit votes from multiple users
      const voters = [signers.alice, signers.bob, signers.charlie];
      const ratings = [
        { plot: 80, perf: 85, stage: 75, pacing: 90 },
        { plot: 90, perf: 88, stage: 82, pacing: 85 },
        { plot: 85, perf: 90, stage: 88, pacing: 87 },
      ];

      for (let i = 0; i < voters.length; i++) {
        const voter = voters[i];
        const rating = ratings[i];

        const encryptedPlotTension = await fhevm
          .createEncryptedInput(contractAddress, voter.address)
          .add16(rating.plot)
          .encrypt();

        const encryptedPerformance = await fhevm
          .createEncryptedInput(contractAddress, voter.address)
          .add16(rating.perf)
          .encrypt();

        const encryptedStageDesign = await fhevm
          .createEncryptedInput(contractAddress, voter.address)
          .add16(rating.stage)
          .encrypt();

        const encryptedPacing = await fhevm
          .createEncryptedInput(contractAddress, voter.address)
          .add16(rating.pacing)
          .encrypt();

        const commentHash = ethers.keccak256(ethers.toUtf8Bytes(`Vote ${i}`));

        await contract.connect(voter).submitVote(
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
      }

      const sessionInfo = await contract.getSessionInfo(sessionId);
      expect(sessionInfo.voteCount).to.equal(3);

      // Authorize theater company to decrypt aggregates
      await contract.connect(signers.theaterCompany).authorizeTheater(sessionId, signers.theaterCompany.address);

      // Decrypt aggregates to verify correct aggregation
      const aggregates = await contract.getEncryptedAggregates(sessionId);

      const clearPlotTension = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        aggregates.plotTension,
        contractAddress,
        signers.theaterCompany,
      );

      const clearPerformance = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        aggregates.performance,
        contractAddress,
        signers.theaterCompany,
      );

      const clearStageDesign = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        aggregates.stageDesign,
        contractAddress,
        signers.theaterCompany,
      );

      const clearPacing = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        aggregates.pacing,
        contractAddress,
        signers.theaterCompany,
      );

      // Verify sums
      expect(clearPlotTension).to.equal(80 + 90 + 85);
      expect(clearPerformance).to.equal(85 + 88 + 90);
      expect(clearStageDesign).to.equal(75 + 82 + 88);
      expect(clearPacing).to.equal(90 + 85 + 87);
    });

    it("should allow theater company to authorize other addresses", async function () {
      await contract.connect(signers.theaterCompany).authorizeTheater(sessionId, signers.alice.address);

      const isAuthorized = await contract.isAuthorized(sessionId, signers.alice.address);
      expect(isAuthorized).to.be.true;
    });

    it("should reject authorization by non-theater-company", async function () {
      await expect(
        contract.connect(signers.alice).authorizeTheater(sessionId, signers.bob.address),
      ).to.be.revertedWithCustomError(contract, "OnlyTheaterCompany");
    });

    it("should allow authorized theater to request decryption after session ends", async function () {
      // Submit 10+ votes to meet minimum threshold
      const voters = [signers.alice, signers.bob, signers.charlie];

      for (let i = 0; i < 10; i++) {
        // Use multiple signers by cycling
        const voterIndex = i % voters.length;
        const voter = voters[voterIndex];

        // Create unique wallet for each vote
        const uniqueVoter = ethers.Wallet.createRandom().connect(ethers.provider);
        await signers.deployer.sendTransaction({
          to: uniqueVoter.address,
          value: ethers.parseEther("1"),
        });

        const encryptedPlotTension = await fhevm
          .createEncryptedInput(contractAddress, uniqueVoter.address)
          .add16(80 + i)
          .encrypt();

        const encryptedPerformance = await fhevm
          .createEncryptedInput(contractAddress, uniqueVoter.address)
          .add16(85 + i)
          .encrypt();

        const encryptedStageDesign = await fhevm
          .createEncryptedInput(contractAddress, uniqueVoter.address)
          .add16(75 + i)
          .encrypt();

        const encryptedPacing = await fhevm
          .createEncryptedInput(contractAddress, uniqueVoter.address)
          .add16(90 + i)
          .encrypt();

        const commentHash = ethers.keccak256(ethers.toUtf8Bytes(`Vote ${i}`));

        await contract.connect(uniqueVoter).submitVote(
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
      }

      // End the session
      await contract.connect(signers.theaterCompany).endSession(sessionId);

      // Advance time to ensure session is ended (mock time manipulation)
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      // Request decryption
      await expect(contract.connect(signers.theaterCompany).requestDecryption(sessionId))
        .to.emit(contract, "DecryptionRequested")
        .withArgs(sessionId, signers.theaterCompany.address);
    });

    it("should reject decryption request with insufficient votes", async function () {
      // Create a session with longer duration
      const title = "Test Performance 2";
      const venue = "Test Venue 2";
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 7200; // 2 hours

      const tx = await contract
        .connect(signers.theaterCompany)
        .createSession(title, venue, startTime, endTime);
      await tx.wait();
      const sessionId2 = 1;

      // No votes submitted (below MIN_VOTES_FOR_DECRYPTION = 1)

      // End the session and advance time beyond endTime
      await contract.connect(signers.theaterCompany).endSession(sessionId2);
      await ethers.provider.send("evm_increaseTime", [7201]);
      await ethers.provider.send("evm_mine", []);

      // Try to request decryption
      await expect(
        contract.connect(signers.theaterCompany).requestDecryption(sessionId2),
      ).to.be.revertedWithCustomError(contract, "InsufficientVotes");
    });

    it("should reject decryption request by unauthorized address", async function () {
      await expect(contract.connect(signers.alice).requestDecryption(sessionId)).to.be.revertedWithCustomError(
        contract,
        "UnauthorizedTheater",
      );
    });
  });

  describe("Utility Functions", function () {
    it("should return total sessions count", async function () {
      expect(await contract.getTotalSessions()).to.equal(0);

      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600;

      await contract.connect(signers.theaterCompany).createSession("Session 1", "Venue 1", startTime, endTime);

      expect(await contract.getTotalSessions()).to.equal(1);

      await contract.connect(signers.theaterCompany).createSession("Session 2", "Venue 2", startTime, endTime);

      expect(await contract.getTotalSessions()).to.equal(2);
    });

    it("should revert on non-existent session query", async function () {
      await expect(contract.getSessionInfo(999)).to.be.revertedWithCustomError(contract, "SessionNotFound");
    });
  });
});

