export type RootStackParamList = {
  Main: undefined;
  AgeVerifier: undefined;
  CoinbaseKyc: undefined;
  Metamask: undefined;
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
  | 'Proof verified!'
  | 'Proof invalid'
  | 'Error generating VK'
  | 'Error generating proof'
  | 'Error verifying proof'
  | 'Invalid input';
