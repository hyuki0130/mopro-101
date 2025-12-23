#[macro_use]
mod stubs;

mod error;
pub use error::MoproError;

// Initializes the shared UniFFI scaffolding and defines the `MoproError` enum.
mopro_ffi::app!();

/// You can also customize the bindings by #[uniffi::export]
/// Reference: https://mozilla.github.io/uniffi-rs/latest/proc_macro/index.html
#[cfg_attr(feature = "uniffi", uniffi::export)]
pub fn mopro_hello_world() -> String {
    "Hello, World!".to_string()
}

#[cfg(test)]
mod uniffi_tests {
    #[test]
    fn test_mopro_hello_world() {
        assert_eq!(super::mopro_hello_world(), "Hello, World!");
    }
}


// CIRCOM_TEMPLATE
circom_stub!();

// HALO2_TEMPLATE
halo2_stub!();

// NOIR_TEMPLATE
// --- Noir Example of using Ultra Honk proving and verifying circuits ---

// Module containing the Noir circuit logic (Multiplier2)
mod noir;
pub use noir::{generate_noir_proof, get_noir_verification_key, verify_noir_proof};

// --- Proof Parsing Utilities (for on-chain verification) ---

/// Struct representing a proof with separated public inputs
/// Used for on-chain verification where proof and public inputs are passed separately
#[cfg_attr(feature = "uniffi", derive(uniffi::Record))]
#[derive(Debug, Clone)]
pub struct ProofWithPublicInputs {
    /// The proof without public inputs (for Solidity verifier)
    pub proof: Vec<u8>,
    /// The public inputs as an array of 32-byte values (for Solidity verifier)
    pub public_inputs: Vec<Vec<u8>>,
    /// The number of public inputs
    pub num_public_inputs: u32,
}

/// Get the number of public inputs from a circuit's JSON manifest
/// This reads the circuit bytecode and extracts the public parameter count
#[cfg_attr(feature = "uniffi", uniffi::export)]
pub fn get_num_public_inputs_from_circuit(circuit_path: String) -> u32 {
    let circuit_txt = std::fs::read_to_string(&circuit_path).unwrap();
    let circuit: serde_json::Value = serde_json::from_str(&circuit_txt).unwrap();
    let circuit_bytecode = circuit["bytecode"].as_str().unwrap().to_string();

    noir_rs::utils::get_num_public_inputs_from_circuit(&circuit_bytecode)
        .map(|size| size as u32)
        .unwrap_or(0)
}

/// Parse a combined proof (proof + public inputs) into separated components
/// The mopro proof format has public inputs prepended to the proof bytes
/// This function separates them for on-chain verification
#[cfg_attr(feature = "uniffi", uniffi::export)]
pub fn parse_proof_with_public_inputs(proof: Vec<u8>, num_public_inputs: u32) -> ProofWithPublicInputs {
    let parsed = noir_rs::utils::parse_proof_with_public_inputs(&proof, num_public_inputs as usize)
        .expect("Failed to parse proof with public inputs");

    ProofWithPublicInputs {
        proof: parsed.proof,
        public_inputs: parsed.public_inputs,
        num_public_inputs: parsed.num_public_inputs as u32,
    }
}

/// Combine proof and public inputs back into a single proof
/// Used when you need to reconstruct the combined format
#[cfg_attr(feature = "uniffi", uniffi::export)]
pub fn combine_proof_and_public_inputs(proof: Vec<u8>, public_inputs: Vec<Vec<u8>>) -> Vec<u8> {
    noir_rs::utils::combine_proof_and_public_inputs(proof, public_inputs)
}

#[cfg(test)]
mod noir_tests {
    use super::noir::{generate_noir_proof, get_noir_verification_key, verify_noir_proof};
    use serial_test::serial;

    #[test]
    #[serial]
    fn test_noir_multiplier2() {
        let srs_path = "./test-vectors/noir/noir_multiplier2.srs".to_string();
        let circuit_path = "./test-vectors/noir/noir_multiplier2.json".to_string();
        let circuit_inputs = vec!["3".to_string(), "5".to_string()];
        let vk = get_noir_verification_key(
            circuit_path.clone(),
            Some(srs_path.clone()),
            true,  // on_chain (uses Keccak for Solidity compatibility)
            false, // low_memory_mode
        )
        .unwrap();

        let proof = generate_noir_proof(
            circuit_path.clone(),
            Some(srs_path.clone()),
            circuit_inputs.clone(),
            true, // on_chain (uses Keccak for Solidity compatibility)
            vk.clone(),
            false, // low_memory_mode
        )
        .unwrap();

        let valid = verify_noir_proof(
            circuit_path,
            proof,
            true, // on_chain (uses Keccak for Solidity compatibility)
            vk,
            false, // low_memory_mode
        )
        .unwrap();
        assert!(valid);
    }

    #[test]
    #[serial]
    fn test_noir_multiplier2_with_existing_vk() {
        let srs_path = "./test-vectors/noir/noir_multiplier2.srs".to_string();
        let circuit_path = "./test-vectors/noir/noir_multiplier2.json".to_string();
        let vk_path = "./test-vectors/noir/noir_multiplier2.vk".to_string();

        // read vk from file as Vec<u8>
        let vk = std::fs::read(vk_path).unwrap();

        let circuit_inputs = vec!["3".to_string(), "5".to_string()];

        let proof = generate_noir_proof(
            circuit_path.clone(),
            Some(srs_path),
            circuit_inputs,
            true, // on_chain (uses Keccak for Solidity compatibility)
            vk.clone(),
            false, // low_memory_mode
        )
        .unwrap();

        let valid = verify_noir_proof(
            circuit_path,
            proof,
            true, // on_chain (uses Keccak for Solidity compatibility)
            vk,
            false, // low_memory_mode
        )
        .unwrap();
        assert!(valid);
    }

    #[test]
    #[serial]
    fn test_parse_proof_with_public_inputs() {
        use super::{get_num_public_inputs_from_circuit, parse_proof_with_public_inputs, combine_proof_and_public_inputs, get_noir_verification_key};

        let srs_path = "./test-vectors/noir/age_verifier.srs".to_string();
        let circuit_path = "./test-vectors/noir/age_verifier.json".to_string();

        // Generate VK on the fly (like app does)
        let vk = get_noir_verification_key(
            circuit_path.clone(),
            Some(srs_path.clone()),
            true,
            false,
        ).unwrap();
        // age_verifier inputs: birth_year, current_year, min_age
        let circuit_inputs = vec!["1990".to_string(), "2024".to_string(), "18".to_string()];

        // Generate proof
        let proof = generate_noir_proof(
            circuit_path.clone(),
            Some(srs_path),
            circuit_inputs,
            true,
            vk.clone(),
            false,
        )
        .unwrap();

        // Get number of public inputs from circuit
        let num_public_inputs = get_num_public_inputs_from_circuit(circuit_path.clone());
        println!("Number of public inputs: {}", num_public_inputs);
        assert!(num_public_inputs > 0, "Should have at least 1 public input");

        // Parse proof into components
        let parsed = parse_proof_with_public_inputs(proof.clone(), num_public_inputs);
        println!("Parsed proof size: {} bytes", parsed.proof.len());
        println!("Number of public inputs: {}", parsed.public_inputs.len());

        assert_eq!(parsed.num_public_inputs, num_public_inputs);
        assert_eq!(parsed.public_inputs.len(), num_public_inputs as usize);

        // Each public input should be 32 bytes
        for (i, pi) in parsed.public_inputs.iter().enumerate() {
            assert_eq!(pi.len(), 32, "Public input {} should be 32 bytes", i);
        }

        // Combine back and verify it matches original
        let combined = combine_proof_and_public_inputs(parsed.proof.clone(), parsed.public_inputs.clone());
        assert_eq!(combined.len(), proof.len(), "Combined proof should match original size");
        assert_eq!(combined, proof, "Combined proof should match original");

        // Verify combined proof still works
        let valid = verify_noir_proof(
            circuit_path,
            combined,
            true,
            vk,
            false,
        )
        .unwrap();
        assert!(valid, "Combined proof should verify");

        println!("Test passed: parse/combine round-trip works correctly");
    }

    /// Test comparing mopro proof with nargo CLI proof for age_verifier
    /// Uses same inputs from Prover.toml to verify both produce compatible results
    #[test]
    #[serial]
    fn test_age_verifier_mopro_vs_nargo() {
        use super::{get_num_public_inputs_from_circuit, parse_proof_with_public_inputs};

        let srs_path = "./test-vectors/noir/age_verifier.srs".to_string();
        let circuit_path = "./test-vectors/noir/age_verifier.json".to_string();
        let vk_path = "./test-vectors/noir/age_verifier.vk".to_string();

        // Load pre-generated VK (like official demo does)
        let vk = std::fs::read(&vk_path).expect("Failed to read VK file");
        println!("Loaded VK from file: {} bytes", vk.len());

        // Inputs from Prover.toml: birth_year=1985, current_year=2025, min_age=20
        let circuit_inputs = vec!["1985".to_string(), "2025".to_string(), "20".to_string()];

        // Generate mopro proof
        println!("\n=== Generating mopro proof ===");
        let mopro_proof = generate_noir_proof(
            circuit_path.clone(),
            Some(srs_path),
            circuit_inputs,
            true, // on_chain (keccak)
            vk.clone(),
            false,
        ).unwrap();
        println!("Mopro proof size: {} bytes", mopro_proof.len());

        // Get number of public inputs
        let num_public_inputs = get_num_public_inputs_from_circuit(circuit_path.clone());
        println!("Number of public inputs: {}", num_public_inputs);

        // Parse mopro proof using new API
        let parsed = parse_proof_with_public_inputs(mopro_proof.clone(), num_public_inputs);
        println!("Parsed proof size: {} bytes", parsed.proof.len());
        println!("Parsed public inputs: {} items", parsed.public_inputs.len());

        // Load nargo proof files
        println!("\n=== Loading nargo proof files ===");
        let nargo_proof = std::fs::read("../circuits/age_verifier/target/proof/proof")
            .expect("Failed to read nargo proof");
        let nargo_public_inputs = std::fs::read("../circuits/age_verifier/target/proof/public_inputs")
            .expect("Failed to read nargo public_inputs");
        println!("Nargo proof size: {} bytes", nargo_proof.len());
        println!("Nargo public_inputs size: {} bytes", nargo_public_inputs.len());

        // Compare sizes
        println!("\n=== Size Comparison ===");
        println!("Mopro parsed proof: {} bytes", parsed.proof.len());
        println!("Nargo proof:        {} bytes", nargo_proof.len());
        assert_eq!(parsed.proof.len(), nargo_proof.len(), "Proof sizes should match");

        let mopro_pi_size: usize = parsed.public_inputs.iter().map(|pi| pi.len()).sum();
        println!("Mopro public inputs total: {} bytes", mopro_pi_size);
        println!("Nargo public inputs:       {} bytes", nargo_public_inputs.len());
        assert_eq!(mopro_pi_size, nargo_public_inputs.len(), "Public inputs sizes should match");

        // Compare public inputs content
        println!("\n=== Public Inputs Comparison ===");
        let mut mopro_pi_flat: Vec<u8> = Vec::new();
        for pi in &parsed.public_inputs {
            mopro_pi_flat.extend(pi);
        }

        let pi_match = mopro_pi_flat == nargo_public_inputs;
        println!("Public inputs match: {}", pi_match);

        if !pi_match {
            println!("Mopro PI: {:02x?}", &mopro_pi_flat[..64.min(mopro_pi_flat.len())]);
            println!("Nargo PI: {:02x?}", &nargo_public_inputs[..64.min(nargo_public_inputs.len())]);
        }
        assert!(pi_match, "Public inputs should match");

        // Note: Proofs themselves will differ due to ZK randomization
        // But both should verify correctly
        println!("\n=== Proof Verification ===");

        // Verify mopro proof off-chain
        let mopro_valid = verify_noir_proof(
            circuit_path.clone(),
            mopro_proof,
            true,
            vk.clone(),
            false,
        ).unwrap();
        println!("Mopro proof verification: {}", mopro_valid);
        assert!(mopro_valid, "Mopro proof should verify");

        // Try to verify nargo proof (need to combine with public inputs)
        let mut nargo_combined = nargo_public_inputs.clone();
        nargo_combined.extend(&nargo_proof);

        let nargo_valid = verify_noir_proof(
            circuit_path,
            nargo_combined,
            true,
            vk,
            false,
        ).unwrap();
        println!("Nargo proof verification: {}", nargo_valid);
        assert!(nargo_valid, "Nargo proof should verify");

        println!("\n=== Test Passed: Both mopro and nargo proofs verify correctly! ===");
    }

    /// Test that outputs mopro proof in hex format for on-chain testing
    /// Run with: cargo test test_mopro_proof_for_onchain -- --nocapture
    #[test]
    #[serial]
    fn test_mopro_proof_for_onchain() {
        use super::{get_num_public_inputs_from_circuit, parse_proof_with_public_inputs};

        let srs_path = "./test-vectors/noir/age_verifier.srs".to_string();
        let circuit_path = "./test-vectors/noir/age_verifier.json".to_string();
        let vk_path = "./test-vectors/noir/age_verifier.vk".to_string();

        let vk = std::fs::read(&vk_path).expect("Failed to read VK file");
        let circuit_inputs = vec!["1985".to_string(), "2025".to_string(), "20".to_string()];

        let mopro_proof = generate_noir_proof(
            circuit_path.clone(),
            Some(srs_path),
            circuit_inputs,
            true,
            vk.clone(),
            false,
        ).unwrap();

        let num_public_inputs = get_num_public_inputs_from_circuit(circuit_path);
        let parsed = parse_proof_with_public_inputs(mopro_proof, num_public_inputs);

        fn to_hex(bytes: &[u8]) -> String {
            bytes.iter().map(|b| format!("{:02x}", b)).collect()
        }

        println!("\n=== MOPRO PROOF FOR ON-CHAIN VERIFICATION ===");
        println!("Proof (hex): 0x{}", to_hex(&parsed.proof));
        println!("\nPublic inputs:");
        for (i, pi) in parsed.public_inputs.iter().enumerate() {
            println!("  [{}]: 0x{}", i, to_hex(pi));
        }
        println!("\nCast command:");
        let pi_str: Vec<String> = parsed.public_inputs.iter()
            .map(|pi| format!("0x{}", to_hex(pi)))
            .collect();
        println!("cast call $VERIFIER 'verify(bytes,bytes32[])(bool)' '0x{}' '[{}]' --rpc-url $RPC_URL",
            to_hex(&parsed.proof),
            pi_str.join(",")
        );
    }
}

