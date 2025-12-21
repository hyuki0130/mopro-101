export type RootStackParamList = {
  Main: undefined;
  AgeVerifier: undefined;
  CoinbaseKyc: undefined;
  PrivyWallet: undefined;
};

export interface AgeVerifierInputs {
  birthYear: string;
  currentYear: string;
  minAge: string;
}

export interface ProofState {
  vk: ArrayBuffer | null;
  proof: ArrayBuffer | null;
}

export type ProofStatus =
  | 'Ready'
  | 'Generating verification key...'
  | 'Verification key ready'
  | 'Generating proof...'
  | 'Proof ready'
  | 'Verifying proof...'
  | 'Verifying proof (off-chain)...'
  | 'Verifying proof on-chain...'
  | 'Proof verified!'
  | 'Proof verified (off-chain)!'
  | 'Proof verified on-chain!'
  | 'Proof invalid'
  | 'Proof invalid (on-chain)'
  | 'Error generating VK'
  | 'Error generating proof'
  | 'Error verifying proof'
  | 'Error: on-chain verification failed'
  | 'Invalid input';
