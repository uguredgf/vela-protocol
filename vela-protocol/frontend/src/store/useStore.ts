import { create } from 'zustand';
import { Position, AnchorTransaction } from '../types';
import { ClassicAccount } from '../services/classicAccount';
import { Keypair, StrKey } from '@stellar/stellar-sdk';

const SESSION_KEY = 'vela:testnet:session:v2';
const positionKey = (address: string) => `vela:testnet:demo-position:${address}`;
type AuthMethod = 'passkey' | 'freighter';

function restorePosition(address: string | null): Position | null {
  if (!address) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(positionKey(address)) || 'null');
    if (saved?.user === address && /^[0-9a-f]{64}$/i.test(saved.txHash || '') && Number.isFinite(saved.totalPosition) && Number.isFinite(saved.borrowAmount)) {
      return saved as Position;
    }
  } catch {
    // Ignore stale demo state.
  }
  return null;
}

function restoreSession(): { walletAddress: string | null; classicAccount: ClassicAccount; authMethod: AuthMethod } | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (!saved || !StrKey.isValidEd25519PublicKey(saved.publicKey)) return null;
    if (saved.method === 'freighter') {
      return { walletAddress: null, classicAccount: { publicKey: saved.publicKey }, authMethod: 'freighter' };
    }
    if (saved.method === 'passkey-kit' && StrKey.isValidContract(saved.walletAddress)) {
      const secret = sessionStorage.getItem(`vela:testnet:classic:${saved.walletAddress}`);
      if (secret && Keypair.fromSecret(secret).publicKey() === saved.publicKey) {
        return { walletAddress: saved.walletAddress, classicAccount: { publicKey: saved.publicKey, secret }, authMethod: 'passkey' };
      }
    }
  } catch {
    // A stale or malformed session requires a fresh wallet connection.
  }
  return null;
}

const restored = restoreSession();

interface VelaStore {
  isAuthenticated: boolean;
  walletAddress: string | null;
  classicAccount: ClassicAccount | null;
  authMethod: AuthMethod | null;
  passkeyConnected: boolean;
  score: number | null;
  scoreExplanation: Record<string, any> | null;
  features: Record<string, number> | null;
  identityHash: Uint8Array | null;
  identityVerified: boolean;
  proofGenerated: boolean;
  proofData: Uint8Array | null;
  publicInputs: Uint8Array | null;
  commitment: string | null;
  position: Position | null;
  collateralAmount: number;
  subsidyAmount: number;
  anchorJwt: string | null;
  anchorTransactions: AnchorTransaction[];
  recordAnchorTransaction: (transaction: AnchorTransaction) => void;
  currentStep: number;
  loading: boolean;
  error: string | null;

  setAuth: (address: string, classicAccount: ClassicAccount) => void;
  setFreighterAuth: (publicKey: string) => void;
  setScore: (score: number, explanation: any, features: any) => void;
  setIdentity: (identityHash: Uint8Array) => void;
  setProof: (proof: Uint8Array, commitment: string, publicInputs: Uint8Array) => void;
  setPosition: (position: Position) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

export const useStore = create<VelaStore>((set) => ({
  isAuthenticated: !!restored,
  walletAddress: restored?.walletAddress ?? null,
  classicAccount: restored?.classicAccount ?? null,
  authMethod: restored?.authMethod ?? null,
  passkeyConnected: restored?.authMethod === 'passkey',
  score: null,
  scoreExplanation: null,
  features: null,
  identityHash: null,
  identityVerified: false,
  proofGenerated: false,
  proofData: null,
  publicInputs: null,
  commitment: null,
  position: restorePosition(restored?.classicAccount.publicKey ?? null),
  collateralAmount: 0,
  subsidyAmount: 0,
  anchorJwt: null,
  anchorTransactions: [],
  recordAnchorTransaction: (transaction) => set(state => ({
    anchorTransactions: [...state.anchorTransactions.filter(item => item.id !== transaction.id), transaction],
  })),
  currentStep: 0,
  loading: false,
  error: null,

  setAuth: (address, classicAccount) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ method: 'passkey-kit', walletAddress: address, publicKey: classicAccount.publicKey }));
    set({ isAuthenticated: true, walletAddress: address, classicAccount, authMethod: 'passkey', passkeyConnected: true,
      score: null, scoreExplanation: null, features: null, proofData: null, publicInputs: null, proofGenerated: false,
      position: restorePosition(classicAccount.publicKey), anchorTransactions: [], identityHash: null, identityVerified: false });
  },
  setFreighterAuth: (publicKey) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ method: 'freighter', publicKey }));
    set({ isAuthenticated: true, walletAddress: null, classicAccount: { publicKey }, authMethod: 'freighter', passkeyConnected: false,
    score: null, scoreExplanation: null, features: null, proofData: null, publicInputs: null, proofGenerated: false, position: null, anchorTransactions: [], identityHash: null, identityVerified: false });
  },
  setScore: (score, explanation, features) => set({ score, scoreExplanation: explanation, features }),
  setIdentity: (identityHash) => set({ identityHash, identityVerified: true }),
  setProof: (proof, commitment, publicInputs) => set({ proofData: proof, commitment, publicInputs, proofGenerated: true }),
  setPosition: (position) => {
    sessionStorage.setItem(positionKey(position.user), JSON.stringify(position));
    set({ position, collateralAmount: position.collateral, subsidyAmount: position.subsidy });
  },
  setStep: (step) => set({ currentStep: step }),
  reset: () => set((state) => {
    sessionStorage.removeItem(SESSION_KEY);
    if (state.walletAddress) {
      sessionStorage.removeItem(`vela:testnet:classic:${state.walletAddress}`);
    }
    if (state.classicAccount) sessionStorage.removeItem(positionKey(state.classicAccount.publicKey));
    return {
    isAuthenticated: false, walletAddress: null, classicAccount: null, authMethod: null, passkeyConnected: false,
    score: null, scoreExplanation: null, features: null, identityHash: null, identityVerified: false,
    proofGenerated: false, proofData: null, publicInputs: null, commitment: null,
    position: null, collateralAmount: 0, subsidyAmount: 0,
    anchorJwt: null, anchorTransactions: [], currentStep: 0, loading: false, error: null
    };
  })
}));
