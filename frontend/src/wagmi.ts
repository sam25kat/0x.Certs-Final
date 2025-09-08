import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat, localhost } from 'wagmi/chains';
import { http } from 'wagmi';

// Custom localhost chain configuration
const customLocalhost = {
  ...localhost,
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
} as const;

export const config = getDefaultConfig({
  appName: 'Hackathon Certificate DApp',
  projectId: 'YOUR_PROJECT_ID', // Get from WalletConnect if needed
  chains: [hardhat],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545', {
      batch: false, // Disable batching to avoid block tag issues
      retryCount: 0, // No retries
      retryDelay: 0,
      timeout: 10000,
      fetchOptions: {
        cache: 'no-store', // More aggressive no-cache
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      },
    }),
  },
  ssr: false, // Since we're not using SSR
});

// Contract configuration
export const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const;

export const CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'eventId', type: 'uint256' }, { internalType: 'string', name: 'eventName', type: 'string' }],
    name: 'createEvent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }, { internalType: 'uint256', name: 'eventId', type: 'uint256' }],
    name: 'mintPoA',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address[]', name: 'recipients', type: 'address[]' }, { internalType: 'uint256', name: 'eventId', type: 'uint256' }],
    name: 'bulkMintPoA',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address[]', name: 'recipients', type: 'address[]' }, { internalType: 'uint256[]', name: 'tokenIds', type: 'uint256[]' }],
    name: 'batchTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }, { internalType: 'uint256', name: 'eventId', type: 'uint256' }, { internalType: 'string', name: 'ipfsHash', type: 'string' }],
    name: 'mintCertificate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'eventNames',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }, { internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'hasPoAForEvent',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'eventId', type: 'uint256' }
    ],
    name: 'PoAMinted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'eventId', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'ipfsHash', type: 'string' }
    ],
    name: 'CertificateMinted',
    type: 'event'
  }
] as const;