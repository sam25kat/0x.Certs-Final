# Base Sepolia Deployment Guide

## Prerequisites

Before deploying to Base Sepolia testnet, ensure you have:

1. **Base Sepolia ETH**: Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. **Wallet Private Key**: Your wallet's private key (keep secure!)
3. **Wallet Address**: Your wallet's public address

## Step 1: Configure Environment Variables

### 1.1 Blockchain Configuration
Update `blockchain/.env`:

```bash
# Add your credentials (replace with actual values)
PRIVATE_KEY=your_private_key_here_without_0x_prefix
WALLET_ADDRESS=your_wallet_address_here
CONTRACT_ADDRESS=  # Will be filled after deployment
```

## Step 2: Deploy the Contract

### 2.1 Compile the Contract
```bash
cd blockchain
npm run compile
```

### 2.2 Deploy to Base Sepolia
```bash
npm run deploy:baseSepolia
```

The deployment script will:
- Validate your private key and balance
- Deploy the CertificateNFT contract
- Save deployment info to `deployment-info-base-sepolia.json`
- Display the new contract address

## Step 3: Update Contract Address Across the Application

After successful deployment, update the contract address in these files:

### 3.1 Blockchain Configuration
**File**: `blockchain/.env`
```bash
CONTRACT_ADDRESS=your_new_contract_address_here
```

### 3.2 Backend Configuration
**File**: `backend/.env`
```bash
CONTRACT_ADDRESS=your_new_contract_address_here
RPC_URL=https://sepolia.base.org  # Update if using Base Sepolia
```

### 3.3 Root Configuration
**File**: `.env` (project root)
```bash
CONTRACT_ADDRESS=your_new_contract_address_here
RPC_URL=https://sepolia.base.org
```

### 3.4 New Frontend Configuration
**File**: `new frontend/src/config/wagmi.ts`

Update line 45:
```typescript
export const CONTRACT_ADDRESS = 'your_new_contract_address_here' as const;
```

Also update the wagmi configuration to include Base Sepolia:
```typescript
import { base, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: '0x.Certs',
  projectId: 'YOUR_PROJECT_ID',
  chains: [baseSepolia], // Add Base Sepolia
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: false,
});
```

### 3.5 Legacy Frontend Configuration
**File**: `frontend/src/wagmi.ts`

Update the contract address and add Base Sepolia configuration similar to the new frontend.

## Step 4: Network Configuration Updates

### 4.1 Update RPC URLs
Replace localhost RPC URLs with Base Sepolia RPC URL (`https://sepolia.base.org`) in:
- `backend/.env`
- `.env` (root)
- Frontend configuration files

### 4.2 Update Chain ID
Update chain ID from `31337` (localhost) to `84532` (Base Sepolia) where needed.

## Step 5: Verification

### 5.1 Verify Contract on BaseScan
Visit: `https://sepolia.basescan.org/address/your_contract_address`

### 5.2 Test Frontend Connection
1. Update MetaMask to connect to Base Sepolia testnet
2. Test wallet connection on your frontend
3. Verify contract interactions work

## Step 6: Environment-Specific Configurations

### Development
Keep localhost configuration for local development in separate environment files.

### Production/Testnet
Use Base Sepolia configuration for testing and production deployments.

## Files That Need Contract Address Updates

| File | Description | Line/Section |
|------|-------------|--------------|
| `blockchain/.env` | Blockchain environment | `CONTRACT_ADDRESS=` |
| `backend/.env` | Backend environment | `CONTRACT_ADDRESS=` |
| `.env` (root) | Root environment | `CONTRACT_ADDRESS=` |
| `new frontend/src/config/wagmi.ts` | New frontend config | Line ~45 |
| `frontend/src/wagmi.ts` | Legacy frontend config | Contract address export |

## Deployment Commands Reference

```bash
# Compile contract
cd blockchain && npm run compile

# Deploy to Base Sepolia
cd blockchain && npm run deploy:baseSepolia

# Or using hardhat directly
npx hardhat run scripts/deploy-base-sepolia.js --network baseSepolia
```

## Network Information

- **Network Name**: Base Sepolia
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

## Troubleshooting

### Common Issues

1. **Insufficient funds**: Get more Base Sepolia ETH from the faucet
2. **Invalid private key**: Ensure private key is correct and doesn't include '0x' prefix
3. **Network connection**: Verify Base Sepolia RPC URL is accessible
4. **Contract not verified**: Use BaseScan's contract verification tool

### Gas Settings

The deployment script uses optimized gas settings for Base:
- Gas Limit: 3,000,000
- Gas Price: 0.001 gwei

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract address updated in all configuration files
- [ ] Frontend connects to Base Sepolia network
- [ ] Backend connects to new contract
- [ ] Test basic contract functions (create event, mint PoA)
- [ ] Verify contract on BaseScan
- [ ] Update environment variables on hosting platforms

## Security Notes

⚠️ **Important Security Reminders**:
- Never commit private keys to version control
- Use environment variables for sensitive data
- Keep deployment info file secure
- Regularly rotate API keys and secrets
- Use different wallets/keys for different environments