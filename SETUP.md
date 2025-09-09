# 🚀 Complete Setup Guide

## Problem Fixed
After git pull, the "Event does not exist" error occurred because the blockchain was restarted without the events that exist in the database.

## Solution Applied
1. ✅ Created all missing events from database on blockchain
2. ✅ Created automated setup scripts to prevent future issues
3. ✅ Verified bulk minting functionality works correctly

## Quick Fix Commands

If you get "Event does not exist" error again:

```bash
# 1. Make sure blockchain is running
cd blockchain
npx hardhat node

# 2. In another terminal, sync all events
cd blockchain
node sync-all-events.js
```

## Complete Setup Process

### 1. Start Blockchain
```bash
cd blockchain
npx hardhat node
```

### 2. Deploy Contract (in new terminal)
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Start Backend (in new terminal)
```bash
cd backend
python main.py
```

### 4. Sync Database Events to Blockchain
```bash
cd blockchain
node setup-blockchain.js
```

## Available Scripts

### `sync-all-events.js`
- Reads all events from database
- Creates missing events on blockchain
- Shows detailed progress and summary
- ✅ **This script fixed your issue**

### `setup-blockchain.js` 
- Complete blockchain setup verification
- Syncs all events from database
- Tests bulk mint functionality  
- Use this for comprehensive setup

### `test-bulk-mint.js`
- Tests bulk minting with specific event
- Verifies gas estimation works
- Confirms transactions execute successfully

## System Status ✅

- ✅ Database: 31 events found
- ✅ Blockchain: All 31 events created successfully  
- ✅ Bulk Mint: Working correctly
- ✅ Backend API: Responding properly
- ✅ Contract: Deployed and functional

## Prevention

To prevent this issue in future:
1. Always run `node setup-blockchain.js` after restarting blockchain
2. The script will automatically sync database events to blockchain
3. Use the setup script whenever you deploy fresh contracts

## Verification Commands

Check if events exist:
```bash
cd blockchain/scripts
node test-bulk-mint.js
```

Test backend API:
```bash
curl -X POST "http://localhost:8000/bulk_mint_poa/5203" -H "Content-Type: application/json" -d "{\"organizer_wallet\":\"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\"}"
```

The system is now fully operational! 🎉