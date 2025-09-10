import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat } from 'wagmi/chains';

// Hardhat local network configuration
export const config = getDefaultConfig({
  appName: '0x.Certs',
  projectId: 'your-project-id', // Replace with your WalletConnect project ID
  chains: [hardhat],
  ssr: false,
});