#!/usr/bin/env node

import hre from "hardhat";
const { ethers } = hre;
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT_ADDRESS = "0xcA3f476842353291084948BB162b5e54fe2c7D45";
const DB_PATH = path.join(__dirname, "../../backend/certificates.db");

async function main() {
    console.log("🔄 Syncing database events to blockchain...");
    console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🗄️  Database: ${DB_PATH}`);
    
    // Connect to the contract
    const contract = await hre.ethers.getContractAt("CertificateNFT", CONTRACT_ADDRESS);
    console.log("✅ Connected to contract");
    
    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log(`👤 Using signer: ${signer.address}`);
    
    // Check signer balance
    const balance = await hre.ethers.provider.getBalance(signer.address);
    console.log(`💰 Signer balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    if (balance < hre.ethers.parseEther("0.001")) {
        console.log("⚠️  WARNING: Low balance, may not be enough for transactions");
    }
    
    // Connect to database
    const db = new sqlite3.default.Database(DB_PATH, sqlite3.default.OPEN_READONLY, (err) => {
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
            await new Promise(resolve => setTimeout(resolve, 1000));
            
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
        console.log(`\n🎉 Successfully synced ${successCount} events to blockchain!`);
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