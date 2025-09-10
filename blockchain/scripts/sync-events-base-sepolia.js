#!/usr/bin/env node

import { ethers } from 'ethers';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0x4AAe1d1B875FED32014DBa2d3E2D10D499092A6D";
const RPC_URL = "https://base-sepolia-rpc.publicnode.com";
const DB_PATH = path.join(__dirname, "../../backend/certificates.db");

// Contract ABI
const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "eventId", "type": "uint256" },
            { "internalType": "string", "name": "eventName", "type": "string" }
        ],
        "name": "createEvent",
        "outputs": [],
        "stateMutability": "nonpayable",
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
    console.log("🔄 Syncing database events to Base Sepolia blockchain...");
    console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network: Base Sepolia (${RPC_URL})`);
    console.log(`🗄️  Database: ${DB_PATH}`);
    
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    if (!process.env.PRIVATE_KEY) {
        console.error("❌ PRIVATE_KEY not found in .env file!");
        process.exit(1);
    }
    
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`👤 Using wallet: ${wallet.address}`);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
        console.error("❌ Wallet has no ETH for gas fees!");
        process.exit(1);
    }
    
    // Connect to contract
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    console.log("✅ Connected to contract");
    
    // Get events from database
    const db = new sqlite3.Database(DB_PATH);
    const events = await new Promise((resolve, reject) => {
        db.all("SELECT id, event_name FROM events ORDER BY id", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
    
    console.log(`📋 Found ${events.length} events in database`);
    
    // Check which events exist on blockchain
    const existingEvents = [];
    const missingEvents = [];
    
    for (const event of events) {
        try {
            const onChainName = await contract.eventNames(event.id);
            if (onChainName && onChainName !== "") {
                existingEvents.push(event);
                console.log(`✅ Event ${event.id} "${event.event_name}" already exists on chain`);
            } else {
                missingEvents.push(event);
                console.log(`❌ Event ${event.id} "${event.event_name}" missing from chain`);
            }
        } catch (error) {
            missingEvents.push(event);
            console.log(`❌ Event ${event.id} "${event.event_name}" missing from chain (error: ${error.message})`);
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ ${existingEvents.length} events already on chain`);
    console.log(`   ❌ ${missingEvents.length} events missing from chain`);
    
    if (missingEvents.length === 0) {
        console.log("\n🎉 All events are already synced!");
        db.close();
        return;
    }
    
    console.log(`\n🔄 Syncing ${missingEvents.length} missing events...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const event of missingEvents) {
        try {
            console.log(`\n📝 Creating event ${event.id}: "${event.event_name}"`);
            
            // Estimate gas
            const gasEstimate = await contract.createEvent.estimateGas(event.id, event.event_name);
            console.log(`   ⛽ Gas estimate: ${gasEstimate.toString()}`);
            
            // Send transaction
            const tx = await contract.createEvent(event.id, event.event_name, {
                gasLimit: gasEstimate + 30000n, // Smaller buffer
                gasPrice: ethers.parseUnits('0.1', 'gwei') // Ultra low gas price
            });
            
            console.log(`   📤 Transaction sent: ${tx.hash}`);
            console.log(`   ⏳ Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            console.log(`   ✅ Event created! Block: ${receipt.blockNumber}, Gas used: ${receipt.gasUsed}`);
            
            successCount++;
            
            // Small delay to avoid overwhelming the network
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`   ❌ Failed to create event ${event.id}: ${error.message}`);
            failCount++;
        }
    }
    
    console.log(`\n🏁 Sync completed!`);
    console.log(`   ✅ Successfully synced: ${successCount} events`);
    console.log(`   ❌ Failed to sync: ${failCount} events`);
    
    if (successCount > 0) {
        console.log(`\n🎉 Events are now synced to Base Sepolia blockchain!`);
        console.log(`   You can now mint PoA and certificates without RPC errors.`);
    }
    
    db.close();
}

// Handle errors
main()
    .then(() => {
        console.log("\n✨ Sync process completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Sync process failed:", error);
        process.exit(1);
    });