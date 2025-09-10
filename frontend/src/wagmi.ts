import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: '0x.Certs',
  projectId: 'YOUR_PROJECT_ID', // Get from WalletConnect if needed
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: false, // Since we're not using SSR
});

// Contract configuration
export const CONTRACT_ADDRESS = '0xa51A70d9C18FFED4fC4214dedEC05E8C988900d0' as const;

export const CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'eventId', type: 'uint256' }, { internalType: 'string', name: 'eventName', type: 'string' }],
    name: 'createEvent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }, { internalType: 'uint256', name: 'eventId', type: 'uint256' }, { internalType: 'string', name: 'ipfsHash', type: 'string' }],
    name: 'mintPoA',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address[]', name: 'recipients', type: 'address[]' }, { internalType: 'uint256', name: 'eventId', type: 'uint256' }, { internalType: 'string', name: 'ipfsHash', type: 'string' }],
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