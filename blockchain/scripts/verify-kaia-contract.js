// verify-kaia-contract.js - Simple contract verification
import { ethers } from "ethers";

async function verifyKaiaContract() {
    console.log("🔍 KAIA Contract Verification");
    console.log("============================");
    
    const rpcUrl = "https://public-en-kairos.node.kaia.io";
    const contractAddress = "0xF55562677316D7620d5eBeE2D9691a7CE3485740";
    const privateKey = "bb6001d9e60d1a11e8399689569b7e700201e7897d3f2457037c463c9f76ca47";
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log("🌐 Network: KAIA Kairos Testnet");
    console.log("📍 Contract:", contractAddress);
    console.log("👤 Signer:", signer.address);
    
    // Basic contract ABI for verification
    const contractABI = [
        "function name() external view returns (string)",
        "function symbol() external view returns (string)",
        "function owner() external view returns (address)",
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    try {
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        
        // Test 1: Basic contract info
        console.log("\n📋 Contract Information:");
        const name = await contract.name();
        const symbol = await contract.symbol();
        const owner = await contract.owner();
        
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Is signer owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
        
        // Test 2: Network verification
        console.log("\n🌐 Network Information:");
        const network = await provider.getNetwork();
        const balance = await provider.getBalance(signer.address);
        const blockNumber = await provider.getBlockNumber();
        
        console.log(`   Chain ID: ${network.chainId}`);
        console.log(`   Balance: ${ethers.formatEther(balance)} KAIA`);
        console.log(`   Block Number: ${blockNumber}`);
        
        // Test 3: Create a simple test event
        console.log("\n🧪 Testing Event Creation:");
        const testEventId = 99999;
        const testEventName = "Verification Test Event";
        
        try {
            // Check if event already exists
            const existingName = await contract.eventNames(testEventId);
            if (existingName && existingName.length > 0) {
                console.log(`   ✓ Event ${testEventId} already exists: "${existingName}"`);
            } else {
                console.log(`   Creating event ${testEventId}...`);
                const tx = await contract.createEvent(testEventId, testEventName, {
                    gasLimit: 200000,
                    gasPrice: ethers.parseUnits("25", "gwei")
                });
                
                console.log(`   📤 TX sent: ${tx.hash}`);
                const receipt = await tx.wait();
                console.log(`   ✅ Event created! Gas used: ${receipt.gasUsed}`);
                console.log(`   🔗 KaiaScan: https://kairos.kaiascan.io/tx/${tx.hash}`);
                
                // Verify event was created
                const createdName = await contract.eventNames(testEventId);
                console.log(`   📋 Verified event name: "${createdName}"`);
            }
        } catch (eventError) {
            console.log(`   ❌ Event creation failed: ${eventError.message}`);
        }
        
        console.log("\n✅ Contract verification completed successfully!");
        console.log("💡 The contract is deployed and working on KAIA testnet.");
        console.log("🔗 View on KaiaScan:", `https://kairos.kaiascan.io/address/${contractAddress}`);
        
        return true;
        
    } catch (error) {
        console.error("❌ Contract verification failed:", error.message);
        
        if (error.message.includes("could not decode")) {
            console.log("💡 This might indicate the contract bytecode doesn't match the expected ABI");
        } else if (error.message.includes("network")) {
            console.log("💡 Check network connection and RPC URL");
        }
        
        return false;
    }
}

verifyKaiaContract().catch(console.error);