// test-kaia-connection.js - Test KAIA network connection
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function testKaiaConnection() {
    console.log("🔗 Testing KAIA Testnet Connection");
    console.log("=================================");
    
    const rpcUrl = "https://public-en-kairos.node.kaia.io";
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        console.error("❌ PRIVATE_KEY not set in .env");
        return;
    }
    
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        
        console.log("📡 RPC URL:", rpcUrl);
        console.log("👤 Wallet Address:", wallet.address);
        
        // Test network connection
        const network = await provider.getNetwork();
        console.log("🌐 Network Chain ID:", network.chainId.toString());
        console.log("🔗 Network Name:", network.name);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log("💰 Account Balance:", ethers.formatEther(balance), "KAIA");
        
        // Get current block number
        const blockNumber = await provider.getBlockNumber();
        console.log("📦 Current Block:", blockNumber);
        
        // Test gas price
        const gasPrice = await provider.getFeeData();
        console.log("⛽ Gas Price:", ethers.formatUnits(gasPrice.gasPrice || 0n, "gwei"), "gwei");
        
        if (balance === 0n) {
            console.log("\n⚠️  WARNING: Account has no KAIA tokens!");
            console.log("Get testnet tokens from: https://faucet.kaia.io");
            return false;
        }
        
        console.log("\n✅ KAIA connection successful! Ready to deploy.");
        return true;
        
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        return false;
    }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testKaiaConnection();
}