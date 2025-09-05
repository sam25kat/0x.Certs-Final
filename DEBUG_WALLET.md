# 🔧 Debugging Wallet Connection Issue

## 🧪 **Testing Steps:**

1. **Open** `frontend/public/hacker.html` in browser
2. **Open Browser Console** (F12 → Console tab)
3. **Check initialization logs:**
   - Should see: `🚀 DApp initializing...`
   - Should see: `✅ Ethers.js loaded: 5.7.2`
   - Should see: `✅ MetaMask detected`
   - Should see: `Contract address loaded: 0x...`

4. **Click "Test Wallet Connection"** - Check console for:
   - `window.ethereum: true`
   - `ethers: true` 
   - `CONTRACT_ADDRESS: 0x...`

5. **Click "Connect Wallet"** - Should see detailed logs:
   - `Attempting to connect wallet...`
   - `Wallet connected: 0x...`
   - `Current network: {chainId: ...}`

## 🚨 **Common Issues & Fixes:**

### **Issue 1: MetaMask Not Detected**
- **Symptoms:** `❌ MetaMask not found`
- **Fix:** Install MetaMask browser extension

### **Issue 2: Ethers.js Not Loading**
- **Symptoms:** `❌ Ethers.js not loaded`
- **Fix:** Check internet connection, refresh page

### **Issue 3: Contract Address Not Loading**
- **Symptoms:** `❌ Smart contract not deployed yet`
- **Fix:** 
  1. Start Hardhat node: `npx hardhat node`
  2. Deploy contract: `npx hardhat run scripts/deploy.js --network localhost`
  3. Update `backend/.env` with `CONTRACT_ADDRESS`

### **Issue 4: Network Not Switching**
- **Symptoms:** `⚠️ Please manually switch to Hardhat Localhost network`
- **Fix:** Manually add Hardhat network in MetaMask:
  - Network Name: `Hardhat Localhost`
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency: `ETH`

### **Issue 5: Connection Rejected**
- **Symptoms:** `❌ Connection rejected by user`
- **Fix:** Click "Connect" in MetaMask popup

### **Issue 6: MetaMask Busy**
- **Symptoms:** `⏳ MetaMask is already processing a request`
- **Fix:** Open MetaMask, clear pending requests, try again

## 🔍 **Debug Commands:**

### Browser Console:
```javascript
// Check MetaMask
console.log('MetaMask:', !!window.ethereum);

// Check Ethers
console.log('Ethers:', !!ethers);

// Check accounts
window.ethereum.request({method: 'eth_accounts'}).then(console.log);

// Check network
window.ethereum.request({method: 'eth_chainId'}).then(console.log);
```

### Backend Debug:
```bash
# Check backend config
curl http://localhost:8000/config

# Check blockchain connection
curl http://localhost:8000/debug/blockchain
```

## ✅ **Success Indicators:**

1. **Console shows all green checkmarks** ✅
2. **"Test Wallet Connection" shows connected account** ✅
3. **"Connect Wallet" button changes to "Wallet Connected ✅"** ✅
4. **Wallet info appears with shortened address** ✅
5. **"Register & Mint PoA NFT" button becomes enabled** ✅

## 🎯 **Quick Fix Commands:**

If wallet connection keeps failing:

```bash
# 1. Clear browser cache and reload
# 2. Reset MetaMask connections (Settings → Advanced → Reset)
# 3. Make sure Hardhat node is running
cd blockchain && npx hardhat node

# 4. Check backend is running
cd backend && python main.py

# 5. Verify contract deployment
curl http://localhost:8000/config
```

**Try the "Test Wallet Connection" button first to see exactly what's failing!** 🔍