#!/usr/bin/env node

import { ethers } from 'ethers';
import sqlite3Package from 'sqlite3';
const sqlite3 = sqlite3Package.verbose();
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = "0xcA3f476842353291084948BB162b5e54fe2c7D45";
const DB_PATH = path.join(__dirname, "../../backend/certificates.db");
const RPC_URL = "https://public-en-kairos.node.kaia.io";

// Contract ABI (only the functions we need)
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
        console.log("💡 Please add your private key to the .env file:");
        console.log("   PRIVATE_KEY=your_private_key_here");
        process.exit(1);
    }
    
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`👤 Using wallet: ${wallet.address}`);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.001")) {
        console.log("⚠️  WARNING: Low balance, may not be enough for transactions");
    }
    
    // Connect to contract
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    console.log("✅ Connected to contract");
    
    // Connect to database
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error("❌ Database connection error:", err.message);
            process.exit(1);
        }
        console.log("✅ Connected to database");
    });
    
    // Get all events from database
    const events = await new Promise((resolve, reject) => {
        db.all("SELECT id, event_name FROM events ORDER BY id", (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
    
    console.log(`📋 Found ${events.length} events in database`);
    
    // Check which events exist on blockchain
    const eventsToSync = [];
    
    for (const event of events) {
        try {
            // Try to get event name from blockchain
            const blockchainEventName = await contract.eventNames(event.id);
            
            if (blockchainEventName === "") {
                // Event doesn't exist on blockchain
                eventsToSync.push(event);
                console.log(`❌ Event ${event.id} "${event.event_name}" not found on blockchain`);
            } else {
                console.log(`✅ Event ${event.id} "${blockchainEventName}" exists on blockchain`);
            }
        } catch (error) {
            // Event doesn't exist on blockchain
            eventsToSync.push(event);
            console.log(`❌ Event ${event.id} "${event.event_name}" not found on blockchain`);
        }
    }
    
    console.log(`\n🔄 Need to sync ${eventsToSync.length} events to blockchain`);
    
    if (eventsToSync.length === 0) {
        console.log("✅ All events are already synced!");
        db.close();
        return;
    }
    
    // Sync events to blockchain
    let successCount = 0;
    let failCount = 0;
    
    for (const event of eventsToSync) {
        try {
            console.log(`\n📤 Creating event ${event.id}: "${event.event_name}"`);
            
            // Create event on blockchain
            const tx = await contract.createEvent(event.id, event.event_name);
            console.log(`   🔗 Transaction hash: ${tx.hash}`);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`   ✅ Event ${event.id} created successfully (Block: ${receipt.blockNumber})`);
            
            successCount++;
            
            // Small delay to avoid overwhelming the network
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`   ❌ Failed to create event ${event.id}:`, error.message);
            failCount++;
        }
    }
    
    console.log(`\n📊 Sync Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Total: ${eventsToSync.length}`);
    
    if (successCount > 0) {
        console.log(`\n🎉 Successfully synced ${successCount} events to Base Sepolia blockchain!`);
    }
    
    if (failCount > 0) {
        console.log(`\n⚠️  ${failCount} events failed to sync. Check errors above.`);
    }
    
    // Close database connection
    db.close((err) => {
        if (err) {
            console.error("❌ Database close error:", err.message);
        } else {
            console.log("✅ Database connection closed");
        }
    });
}

// Handle errors
main()
    .then(() => {
        console.log("\n🏁 Sync process completed");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Sync process failed:", error);
        process.exit(1);
    });