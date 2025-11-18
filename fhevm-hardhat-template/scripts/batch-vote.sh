#!/bin/bash

# Batch voting script for FringeStage Vote
# Usage: ./scripts/batch-vote.sh <sessionId> [network]

SESSION_ID=$1
NETWORK=${2:-localhost}

if [ -z "$SESSION_ID" ]; then
  echo "Usage: ./scripts/batch-vote.sh <sessionId> [network]"
  echo "Example: ./scripts/batch-vote.sh 0 localhost"
  exit 1
fi

echo "🗳️  Batch voting for Session $SESSION_ID on network: $NETWORK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Array of vote data (plot, performance, stage, pacing)
# Each line represents votes from a different account
VOTES=(
  "85 90 75 80"
  "88 92 78 85"
  "82 87 80 78"
  "90 95 85 88"
  "86 89 82 84"
  "84 91 79 81"
  "89 93 83 86"
  "87 88 81 83"
  "91 94 84 87"
  "83 86 77 79"
)

# Submit votes from accounts 1-10 (account 0 is theater company)
for i in "${!VOTES[@]}"; do
  ACCOUNT_INDEX=$((i + 1))
  read -r PLOT PERF STAGE PACE <<< "${VOTES[$i]}"
  
  echo ""
  echo "📝 Account $ACCOUNT_INDEX voting..."
  echo "   Plot: $PLOT | Performance: $PERF | Stage: $STAGE | Pacing: $PACE"
  
  npx hardhat --network "$NETWORK" task:vote \
    --session "$SESSION_ID" \
    --plot "$PLOT" \
    --performance "$PERF" \
    --stage "$STAGE" \
    --pacing "$PACE" \
    --account "$ACCOUNT_INDEX"
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Vote submitted successfully"
  else
    echo "   ❌ Vote failed"
    exit 1
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All 10 votes submitted successfully!"
echo ""
echo "📊 Next steps:"
echo "   1. End session:    npx hardhat --network $NETWORK task:end-session --session $SESSION_ID"
echo "   2. Decrypt:        npx hardhat --network $NETWORK task:decrypt-results --session $SESSION_ID"
echo "   3. Store on-chain: (use command from decrypt output)"


