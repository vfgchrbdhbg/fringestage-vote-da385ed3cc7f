// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint16, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FringeStage Vote - Anonymous Theater Preview Voting
/// @author FringeStage Vote Team
/// @notice Encrypted voting system for theater performances with aggregated results
contract FringeStageVote is ZamaEthereumConfig {
    /// @notice Session structure containing performance metadata
    struct Session {
        string title;
        string venue;
        uint256 startTime;
        uint256 endTime;
        address theaterCompany;
        uint256 voteCount;
        bool isActive;
        bool decryptionRequested;
        bool decryptionCompleted;
        // Aggregated encrypted ratings (4 dimensions)
        euint16 aggregatedPlotTension;
        euint16 aggregatedPerformance;
        euint16 aggregatedStageDesign;
        euint16 aggregatedPacing;
    }

    /// @notice Decrypted results structure (only filled after decryption)
    struct DecryptedResults {
        uint16 totalPlotTension;
        uint16 totalPerformance;
        uint16 totalStageDesign;
        uint16 totalPacing;
    }

    // State variables
    uint256 private _nextSessionId;
    mapping(uint256 => Session) private _sessions;
    mapping(uint256 => DecryptedResults) private _decryptedResults;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => mapping(address => bool)) private _authorizedTheaters;
    
    // Minimum votes required before decryption
    uint256 public constant MIN_VOTES_FOR_DECRYPTION = 1;

    // Events
    event SessionCreated(
        uint256 indexed sessionId,
        string title,
        string venue,
        uint256 startTime,
        uint256 endTime,
        address indexed theaterCompany
    );
    
    event VoteSubmitted(
        uint256 indexed sessionId,
        address indexed voter,
        uint256 newVoteCount
    );
    
    event TheaterAuthorized(
        uint256 indexed sessionId,
        address indexed theaterAddress
    );
    
    event DecryptionRequested(
        uint256 indexed sessionId,
        address indexed requester
    );
    
    event DecryptionCompleted(
        uint256 indexed sessionId,
        uint16 avgPlotTension,
        uint16 avgPerformance,
        uint16 avgStageDesign,
        uint16 avgPacing
    );

    // Errors
    error SessionNotFound();
    error SessionNotActive();
    error SessionNotEnded();
    error AlreadyVoted();
    error UnauthorizedTheater();
    error InsufficientVotes();
    error InvalidRatingValue();
    error DecryptionAlreadyRequested();
    error OnlyTheaterCompany();
    error SessionStillActive();

    /// @notice Creates a new performance session
    /// @param title Performance title
    /// @param venue Venue name
    /// @param startTime Session start timestamp
    /// @param endTime Session end timestamp
    /// @return sessionId The newly created session ID
    function createSession(
        string calldata title,
        string calldata venue,
        uint256 startTime,
        uint256 endTime
    ) external returns (uint256 sessionId) {
        sessionId = _nextSessionId++;
        
        Session storage session = _sessions[sessionId];
        session.title = title;
        session.venue = venue;
        session.startTime = startTime;
        session.endTime = endTime;
        session.theaterCompany = msg.sender;
        session.isActive = true;
        
        // Initialize aggregated ratings to zero (encrypted)
        session.aggregatedPlotTension = FHE.asEuint16(0);
        session.aggregatedPerformance = FHE.asEuint16(0);
        session.aggregatedStageDesign = FHE.asEuint16(0);
        session.aggregatedPacing = FHE.asEuint16(0);
        
        // Allow contract to access initialized encrypted values
        FHE.allowThis(session.aggregatedPlotTension);
        FHE.allowThis(session.aggregatedPerformance);
        FHE.allowThis(session.aggregatedStageDesign);
        FHE.allowThis(session.aggregatedPacing);
        
        // Authorize theater company by default
        _authorizedTheaters[sessionId][msg.sender] = true;
        
        emit SessionCreated(sessionId, title, venue, startTime, endTime, msg.sender);
        emit TheaterAuthorized(sessionId, msg.sender);
    }

    /// @notice Submits an encrypted vote for a session
    /// @param sessionId The session ID to vote for
    /// @param inputPlotTension Encrypted plot tension rating (0-100)
    /// @param proofPlotTension Input proof for plot tension
    /// @param inputPerformance Encrypted performance rating (0-100)
    /// @param proofPerformance Input proof for performance
    /// @param inputStageDesign Encrypted stage design rating (0-100)
    /// @param proofStageDesign Input proof for stage design
    /// @param inputPacing Encrypted pacing rating (0-100)
    /// @param proofPacing Input proof for pacing
    /// @dev Comment hash can be passed but is not stored on-chain to save gas
    function submitVote(
        uint256 sessionId,
        externalEuint16 inputPlotTension,
        bytes calldata proofPlotTension,
        externalEuint16 inputPerformance,
        bytes calldata proofPerformance,
        externalEuint16 inputStageDesign,
        bytes calldata proofStageDesign,
        externalEuint16 inputPacing,
        bytes calldata proofPacing,
        bytes32 /* commentHash */
    ) external {
        _validateVote(sessionId);
        _processVote(sessionId, inputPlotTension, proofPlotTension, inputPerformance, proofPerformance, inputStageDesign, proofStageDesign, inputPacing, proofPacing);
        
        emit VoteSubmitted(sessionId, msg.sender, _sessions[sessionId].voteCount);
    }
    
    /// @dev Internal function to validate vote submission
    function _validateVote(uint256 sessionId) internal view {
        Session storage session = _sessions[sessionId];
        if (session.startTime == 0) revert SessionNotFound();
        if (!session.isActive) revert SessionNotActive();
        if (block.timestamp < session.startTime || block.timestamp > session.endTime) {
            revert SessionNotActive();
        }
        if (_hasVoted[sessionId][msg.sender]) revert AlreadyVoted();
    }
    
    /// @dev Internal function to process vote and aggregate ratings
    function _processVote(
        uint256 sessionId,
        externalEuint16 inputPlotTension,
        bytes calldata proofPlotTension,
        externalEuint16 inputPerformance,
        bytes calldata proofPerformance,
        externalEuint16 inputStageDesign,
        bytes calldata proofStageDesign,
        externalEuint16 inputPacing,
        bytes calldata proofPacing
    ) internal {
        Session storage session = _sessions[sessionId];
        
        // Convert external inputs to internal euint16
        euint16 encryptedPlotTension = FHE.fromExternal(inputPlotTension, proofPlotTension);
        euint16 encryptedPerformance = FHE.fromExternal(inputPerformance, proofPerformance);
        euint16 encryptedStageDesign = FHE.fromExternal(inputStageDesign, proofStageDesign);
        euint16 encryptedPacing = FHE.fromExternal(inputPacing, proofPacing);
        
        // Aggregate ratings using FHE.add
        session.aggregatedPlotTension = FHE.add(session.aggregatedPlotTension, encryptedPlotTension);
        session.aggregatedPerformance = FHE.add(session.aggregatedPerformance, encryptedPerformance);
        session.aggregatedStageDesign = FHE.add(session.aggregatedStageDesign, encryptedStageDesign);
        session.aggregatedPacing = FHE.add(session.aggregatedPacing, encryptedPacing);
        
        // Mark voter as having voted
        _hasVoted[sessionId][msg.sender] = true;
        session.voteCount++;
        
        // Allow contract to access encrypted values
        FHE.allowThis(session.aggregatedPlotTension);
        FHE.allowThis(session.aggregatedPerformance);
        FHE.allowThis(session.aggregatedStageDesign);
        FHE.allowThis(session.aggregatedPacing);
    }

    /// @notice Authorizes a theater company to view aggregated results
    /// @param sessionId The session ID
    /// @param theaterAddress The address to authorize
    function authorizeTheater(uint256 sessionId, address theaterAddress) external {
        Session storage session = _sessions[sessionId];
        
        if (session.startTime == 0) revert SessionNotFound();
        if (msg.sender != session.theaterCompany) revert OnlyTheaterCompany();
        
        _authorizedTheaters[sessionId][theaterAddress] = true;
        
        // Grant FHE.allow permission for aggregated results
        FHE.allow(session.aggregatedPlotTension, theaterAddress);
        FHE.allow(session.aggregatedPerformance, theaterAddress);
        FHE.allow(session.aggregatedStageDesign, theaterAddress);
        FHE.allow(session.aggregatedPacing, theaterAddress);
        
        emit TheaterAuthorized(sessionId, theaterAddress);
    }

    /// @notice Requests decryption of aggregated results (for authorized theaters)
    /// @param sessionId The session ID
    function requestDecryption(uint256 sessionId) external {
        Session storage session = _sessions[sessionId];
        
        if (session.startTime == 0) revert SessionNotFound();
        if (!_authorizedTheaters[sessionId][msg.sender]) revert UnauthorizedTheater();
        // Allow decryption if session is manually ended OR time has passed
        if (session.isActive && block.timestamp <= session.endTime) revert SessionStillActive();
        if (session.voteCount < MIN_VOTES_FOR_DECRYPTION) revert InsufficientVotes();
        if (session.decryptionRequested) revert DecryptionAlreadyRequested();
        
        session.decryptionRequested = true;
        
        // Grant permission to the theater company to decrypt the aggregated results
        FHE.allow(session.aggregatedPlotTension, msg.sender);
        FHE.allow(session.aggregatedPerformance, msg.sender);
        FHE.allow(session.aggregatedStageDesign, msg.sender);
        FHE.allow(session.aggregatedPacing, msg.sender);
        
        emit DecryptionRequested(sessionId, msg.sender);
        
        // Note: In production, this would trigger the decryption oracle
        // For mock environments, decryption happens immediately via fhevmjs
        // The oracle would call a callback function to store decrypted values
    }

    /// @notice Ends a session (only theater company can call)
    /// @param sessionId The session ID to end
    function endSession(uint256 sessionId) external {
        Session storage session = _sessions[sessionId];
        
        if (session.startTime == 0) revert SessionNotFound();
        if (msg.sender != session.theaterCompany) revert OnlyTheaterCompany();
        
        session.isActive = false;
    }

    /// @notice Checks if an address has voted in a session
    /// @param sessionId The session ID
    /// @param voter The voter address
    /// @return hasVoted True if the address has voted
    function hasVoted(uint256 sessionId, address voter) external view returns (bool) {
        return _hasVoted[sessionId][voter];
    }

    /// @notice Checks if an address is authorized for a session
    /// @param sessionId The session ID
    /// @param theaterAddress The address to check
    /// @return isAuthorized True if authorized
    function isAuthorized(uint256 sessionId, address theaterAddress) external view returns (bool) {
        return _authorizedTheaters[sessionId][theaterAddress];
    }

    /// @notice Gets session metadata (public information only)
    /// @param sessionId The session ID
    /// @return title Performance title
    /// @return venue Venue name
    /// @return startTime Session start timestamp
    /// @return endTime Session end timestamp
    /// @return theaterCompany Theater company address
    /// @return voteCount Number of votes received
    /// @return isActive Session active status
    /// @return decryptionRequested Whether decryption has been requested
    /// @return decryptionCompleted Whether results have been decrypted
    function getSessionInfo(uint256 sessionId) 
        external 
        view 
        returns (
            string memory title,
            string memory venue,
            uint256 startTime,
            uint256 endTime,
            address theaterCompany,
            uint256 voteCount,
            bool isActive,
            bool decryptionRequested,
            bool decryptionCompleted
        ) 
    {
        Session storage session = _sessions[sessionId];
        if (session.startTime == 0) revert SessionNotFound();
        
        return (
            session.title,
            session.venue,
            session.startTime,
            session.endTime,
            session.theaterCompany,
            session.voteCount,
            session.isActive,
            session.decryptionRequested,
            session.decryptionCompleted
        );
    }

    /// @notice Gets encrypted aggregated ratings (only for authorized addresses via FHE.allow)
    /// @param sessionId The session ID
    /// @return plotTension Encrypted aggregated plot tension
    /// @return performance Encrypted aggregated performance
    /// @return stageDesign Encrypted aggregated stage design
    /// @return pacing Encrypted aggregated pacing
    function getEncryptedAggregates(uint256 sessionId)
        external
        view
        returns (
            euint16 plotTension,
            euint16 performance,
            euint16 stageDesign,
            euint16 pacing
        )
    {
        Session storage session = _sessions[sessionId];
        if (session.startTime == 0) revert SessionNotFound();
        
        return (
            session.aggregatedPlotTension,
            session.aggregatedPerformance,
            session.aggregatedStageDesign,
            session.aggregatedPacing
        );
    }

    /// @notice Gets the total number of sessions created
    /// @return count Total session count
    function getTotalSessions() external view returns (uint256) {
        return _nextSessionId;
    }

    /// @notice Stores decrypted results on-chain (only authorized theaters can call after decryption)
    /// @param sessionId The session ID
    /// @param totalPlotTension Total plot tension score (sum of all votes)
    /// @param totalPerformance Total performance score (sum of all votes)
    /// @param totalStageDesign Total stage design score (sum of all votes)
    /// @param totalPacing Total pacing score (sum of all votes)
    function storeDecryptedResults(
        uint256 sessionId,
        uint16 totalPlotTension,
        uint16 totalPerformance,
        uint16 totalStageDesign,
        uint16 totalPacing
    ) external {
        Session storage session = _sessions[sessionId];
        
        if (session.startTime == 0) revert SessionNotFound();
        if (!_authorizedTheaters[sessionId][msg.sender]) revert UnauthorizedTheater();
        if (!session.decryptionRequested) revert("Decryption not requested");
        if (session.decryptionCompleted) revert("Results already stored");
        
        // Store decrypted results
        _decryptedResults[sessionId] = DecryptedResults({
            totalPlotTension: totalPlotTension,
            totalPerformance: totalPerformance,
            totalStageDesign: totalStageDesign,
            totalPacing: totalPacing
        });
        
        session.decryptionCompleted = true;
        
        // Calculate averages for event (avoid division by zero)
        uint256 voteCount = session.voteCount;
        uint16 avgPlotTension = voteCount > 0 ? totalPlotTension / uint16(voteCount) : 0;
        uint16 avgPerformance = voteCount > 0 ? totalPerformance / uint16(voteCount) : 0;
        uint16 avgStageDesign = voteCount > 0 ? totalStageDesign / uint16(voteCount) : 0;
        uint16 avgPacing = voteCount > 0 ? totalPacing / uint16(voteCount) : 0;
        
        emit DecryptionCompleted(
            sessionId,
            avgPlotTension,
            avgPerformance,
            avgStageDesign,
            avgPacing
        );
    }

    /// @notice Gets decrypted results (public, anyone can view after decryption)
    /// @param sessionId The session ID
    /// @return totalPlotTension Total plot tension score
    /// @return totalPerformance Total performance score
    /// @return totalStageDesign Total stage design score
    /// @return totalPacing Total pacing score
    /// @return avgPlotTension Average plot tension score
    /// @return avgPerformance Average performance score
    /// @return avgStageDesign Average stage design score
    /// @return avgPacing Average pacing score
    /// @return voteCount Number of votes
    function getDecryptedResults(uint256 sessionId)
        external
        view
        returns (
            uint16 totalPlotTension,
            uint16 totalPerformance,
            uint16 totalStageDesign,
            uint16 totalPacing,
            uint16 avgPlotTension,
            uint16 avgPerformance,
            uint16 avgStageDesign,
            uint16 avgPacing,
            uint256 voteCount
        )
    {
        Session storage session = _sessions[sessionId];
        if (session.startTime == 0) revert SessionNotFound();
        if (!session.decryptionCompleted) revert("Results not yet decrypted");
        
        DecryptedResults storage results = _decryptedResults[sessionId];
        voteCount = session.voteCount;
        
        // Return totals
        totalPlotTension = results.totalPlotTension;
        totalPerformance = results.totalPerformance;
        totalStageDesign = results.totalStageDesign;
        totalPacing = results.totalPacing;
        
        // Calculate averages (safe division)
        avgPlotTension = voteCount > 0 ? results.totalPlotTension / uint16(voteCount) : 0;
        avgPerformance = voteCount > 0 ? results.totalPerformance / uint16(voteCount) : 0;
        avgStageDesign = voteCount > 0 ? results.totalStageDesign / uint16(voteCount) : 0;
        avgPacing = voteCount > 0 ? results.totalPacing / uint16(voteCount) : 0;
    }
}

