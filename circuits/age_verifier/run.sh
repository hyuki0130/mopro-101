#!/bin/bash

set -e

echo "=================================================="
echo "Noir Circuit Proving with Keccak256 Oracle Hash"
echo "=================================================="
echo ""

echo "📝 Step 1: Compiling circuit..."
nargo compile
echo "✅ Compilation complete"
echo ""

echo "👤 Step 2: Generating witness..."
nargo execute
echo "✅ Witness generated"
echo ""

if ! command -v bb &> /dev/null; then
    echo ""
    echo "⚠️  Warning: bb (barretenberg) not installed"
    echo "Skipping proof generation and verification"
    echo "Install bb to enable proving:"
    echo "curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/cpp/installation/install | bash"
    exit 0
fi

echo "🔐 Step 3: Generating proof (Keccak256 oracle hash)..."
bb prove \
  -b ./target/age_verifier.json \
  -w ./target/age_verifier.gz \
  -o ./target/proof \
  --oracle_hash keccak
PROOF_SIZE=$(wc -c < ./target/proof/proof 2>/dev/null || echo "0")
echo "✅ Proof generated: $PROOF_SIZE bytes"
echo ""

echo "🔑 Step 4: Writing verification key (Keccak256 oracle hash)..."
bb write_vk \
  -b ./target/age_verifier.json \
  -o ./target/vk \
  --oracle_hash keccak
echo "✅ Verification key generated"
echo ""

echo "📋 Step 5: Copying public inputs..."
cp ./target/proof/public_inputs ./target/public_inputs
echo "✅ Public inputs copied"
echo ""

echo "✅ Step 6: Verifying proof (Keccak256 oracle hash)..."
bb verify \
  -p ./target/proof/proof \
  -k ./target/vk/vk \
  --oracle_hash keccak
echo ""

echo "=================================================="
echo "🎉 All steps completed successfully!"
echo "=================================================="
