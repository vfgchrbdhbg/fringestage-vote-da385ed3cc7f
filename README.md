# FringeStage Vote

A decentralized voting platform for theater performance sessions using Fully Homomorphic Encryption (FHE) to ensure vote privacy. Built with FHEVM, Hardhat, and Next.js.

## Features

- **Private Voting**: Votes are encrypted using FHEVM, ensuring complete privacy until decryption
- **Session Management**: Create and manage theater performance sessions with voting periods
- **Real-time Results**: View encrypted vote counts and decrypted results with visual charts
- **Theater Dashboard**: Authorized theater companies can decrypt and publish results
- **Multi-network Support**: Deployed on Sepolia testnet and localhost for development

## Project Structure

```
.
├── fhevm-hardhat-template/    # Smart contracts and Hardhat configuration
│   ├── contracts/             # Solidity contracts
│   ├── deploy/                 # Deployment scripts
│   ├── tasks/                  # Hardhat custom tasks
│   └── test/                   # Contract tests
└── fringestage-vote-frontend/  # Next.js frontend application
    ├── app/                    # Next.js app router pages
    ├── components/             # React components
    ├── hooks/                  # Custom React hooks
    └── lib/                    # Utility libraries
```

## Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager
- **MetaMask** or compatible Web3 wallet
- **Sepolia ETH** (for testnet deployment)

## Getting Started

### 1. Install Dependencies

```bash
# Install contract dependencies
cd fhevm-hardhat-template
npm install

# Install frontend dependencies
cd ../fringestage-vote-frontend
npm install
```

### 2. Configure Environment

```bash
cd fhevm-hardhat-template

# Set up Hardhat variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY
```

### 3. Deploy Contracts

```bash
# Deploy to localhost
npx hardhat node
npx hardhat deploy --network localhost

# Or deploy to Sepolia testnet
npx hardhat deploy --network sepolia
```

### 4. Run Frontend

```bash
cd fringestage-vote-frontend

# Development mode with mock FHEVM (localhost)
npm run dev:mock

# Development mode with real Relayer (Sepolia)
npm run dev

# Build for production
npm run build
```

## Usage

### Creating a Session

1. Navigate to "Sessions" page
2. Click "+ Create Session"
3. Fill in session details (title, venue, date)
4. Submit to create a new voting session

### Voting

1. Browse available sessions
2. Click on a session to vote
3. Rate the performance on four dimensions:
   - Plot
   - Performance
   - Stage Design
   - Pacing
4. Submit your encrypted vote

### Viewing Results

1. Navigate to "Results" page for a session
2. View encrypted vote counts
3. If you're the session creator, you can:
   - Request decryption (after voting period ends)
   - Decrypt and store results on-chain
   - View decrypted results with radar chart

### Theater Dashboard

1. Navigate to "Theater Dashboard"
2. View all sessions you've created
3. Manage sessions: end voting early, request decryption, decrypt results

## Smart Contract

The `FringeStageVote` contract manages:
- Session creation and lifecycle
- Encrypted vote aggregation
- Decryption permission management
- Result storage and retrieval

### Key Functions

- `createSession(title, venue, startTime, endTime)`: Create a new voting session
- `vote(sessionId, encryptedVote)`: Submit an encrypted vote
- `endSession(sessionId)`: End voting early (creator only)
- `requestDecryption(sessionId)`: Request decryption permission
- `storeDecryptedResults(sessionId, results)`: Store decrypted results on-chain

## Technology Stack

- **FHEVM v0.9**: Fully Homomorphic Encryption Virtual Machine
- **Hardhat**: Ethereum development environment
- **Next.js 14**: React framework with static export
- **ethers.js v6**: Ethereum library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling

## Network Configuration

- **Localhost**: Chain ID 31337 (for development with mock FHEVM)
- **Sepolia**: Chain ID 11155111 (testnet deployment)

## License

This project is licensed under the BSD-3-Clause-Clear License.

## Support

For issues and questions:
- Check the [FHEVM Documentation](https://docs.zama.ai/fhevm)
- Review contract tests in `fhevm-hardhat-template/test/`
- Check frontend implementation in `fringestage-vote-frontend/`

