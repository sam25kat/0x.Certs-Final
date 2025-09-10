#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0xc571588e55cE0E7F3E0AB9335E5033F3b1b62558";
const RPC_URL = "https://sepolia.base.org";

// Contract ABI (only the functions we need)
const CONTRACT_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "hasPoAForEvent",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "getTokensByOwner",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "isPoA",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "tokenToEventId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "eventNames",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    }
];

async function main() {
    console.log("🔍 Checking PoA ownership for certificate minting...");
    console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network: Base Sepolia (${RPC_URL})`);
    
    // Setup provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Get wallet address from environment
    if (!process.env.PRIVATE_KEY) {
        console.error("❌ PRIVATE_KEY not found in .env file!");
        process.exit(1);
    }
    
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const userAddress = wallet.address;
    
    console.log(`👤 Checking user: ${userAddress}`);
    
    // Get events to check
    const eventIds = [9642]; // The events we created for testing
    
    console.log(`\n📋 Checking PoA ownership for events: ${eventIds.join(', ')}`);
    
    for (const eventId of eventIds) {
        try {
            // Get event name
            const eventName = await contract.eventNames(eventId);
            console.log(`\n🔍 Event ${eventId}: "${eventName}"`);
            
            // Check if user has PoA for this event
            const hasPoA = await contract.hasPoAForEvent(userAddress, eventId);
            console.log(`   📊 Has PoA: ${hasPoA ? '✅ YES' : '❌ NO'}`);
            
            if (!hasPoA) {
                console.log(`   💡 Certificate minting will FAIL - need to mint PoA first!`);
            } else {
                console.log(`   🎉 Certificate minting should work for this event!`);
            }
            
        } catch (error) {
            console.error(`   ❌ Error checking event ${eventId}:`, error.message);
        }
    }
    
    // Get all tokens owned by user
    try {
        console.log(`\n👛 All NFTs owned by ${userAddress}:`);
        const tokens = await contract.getTokensByOwner(userAddress);
        
        if (tokens.length === 0) {
            console.log("   📭 No NFTs found");
        } else {
            console.log(`   📄 Found ${tokens.length} NFTs:`);
            
            for (const tokenId of tokens) {
                const isPoA = await contract.isPoA(tokenId);
                const eventId = await contract.tokenToEventId(tokenId);
                const eventName = await contract.eventNames(eventId);
                
                console.log(`   🎫 Token #${tokenId}: ${isPoA ? 'PoA' : 'Certificate'} for Event ${eventId} "${eventName}"`);
            }
        }
        
    } catch (error) {
        console.error("❌ Error getting user tokens:", error.message);
    }
    
    console.log(`\n📋 Summary:`);
    console.log(`- To mint certificates, you must first have PoA NFTs for the events`);
    console.log(`- Use the frontend to mint PoA NFTs first, then mint certificates`);
    console.log(`- Certificate minting will fail with "Must have PoA for this event first" if no PoA exists`);
}

// Handle errors
main()
    .then(() => {
        console.log("\n🏁 Check completed");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Check failed:", error);
        process.exit(1);
    });