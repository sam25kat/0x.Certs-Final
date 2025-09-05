# 🚀 Quick Development Setup

## ⚡ **IMMEDIATE FIX FOR YOUR ISSUE:**

### **The "Internal JSON-RPC error" happens because:**
1. **Hardhat node isn't running** ❌
2. **Contract isn't deployed** ❌  
3. **Backend not updated** ❌

## 🔧 **COMPLETE SETUP (3 Terminals):**

### **Terminal 1: Start Hardhat Node**
```bash
cd blockchain
npx hardhat node
```
**Keep this running!** Look for:
- ✅ `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`
- ✅ Shows 20 test accounts with ETH

### **Terminal 2: Deploy Contract**
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
**Copy the contract address!** Should show:
```
CertificateNFT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Save this address to your .env file as CONTRACT_ADDRESS
```

### **Terminal 3: Start Backend**
```bash
# Update backend/.env with the contract address from step 2:
# CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

cd backend
python main.py
```

## ✅ **VERIFICATION STEPS:**

### **1. Check Hardhat Node:**
```bash
curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}'
```
Should return: `{"jsonrpc":"2.0","id":1,"result":"0x0"}`

### **2. Check Backend:**
```bash
curl http://localhost:8000/health
```
Should return: `{"status":"healthy","timestamp":"..."}`

### **3. Check Contract Config:**
```bash
curl http://localhost:8000/config
```
Should return: `{"contract_address":"0x...","rpc_url":"...","chain_id":31337}`

## 🎯 **NOW TEST IN BROWSER:**

1. **Open:** `frontend/public/hacker.html`
2. **Connect Wallet** → MetaMask popup should appear
3. **Register for Event** → Should trigger NFT minting
4. **Sign Transaction** → MetaMask shows transaction details
5. **Success!** → Shows transaction hash

## 🚨 **TROUBLESHOOTING:**

### **"Internal JSON-RPC error" →**
- ❌ Hardhat node not running
- **Fix:** `cd blockchain && npx hardhat node`

### **"Contract not found" →**
- ❌ Contract not deployed
- **Fix:** `cd blockchain && npx hardhat run scripts/deploy.js --network localhost`

### **"Network connection failed" →**
- ❌ Wrong network in MetaMask
- **Fix:** Add Hardhat Localhost network (Chain ID: 31337)

### **"Transaction rejected" →**
- ❌ User cancelled in MetaMask
- **Fix:** Try again and click "Confirm"

## 🎉 **SUCCESS INDICATORS:**

✅ **Hardhat node shows:** `eth_sendRawTransaction`
✅ **MetaMask shows:** Transaction confirmation popup  
✅ **Browser shows:** `✅ PoA NFT minted successfully!`
✅ **Organizer dashboard shows:** Token ID instead of "Pending"

## 📝 **FOR EXISTING PARTICIPANTS:**

Sameer and Sai Jadhav can now:
1. **Open `hacker.html`**
2. **Connect same wallet address**
3. **Register again** → System will detect they're already registered
4. **Mint NFT** → MetaMask popup appears
5. **Success!** → Status changes from "Pending" to "Minted"

**Just follow the 3-terminal setup above and the NFT minting will work!** 🚀