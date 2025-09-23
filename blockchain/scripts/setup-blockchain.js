import { ethers } from "ethers";
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

async function setupBlockchain() {
    console.log("🚀 Setting up blockchain with all required data...\n");
    
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = "0xf55562677316d7620d5ebee2d9691a7ce3485740";
    
    console.log("📋 Setup Details:");
    console.log(`   🔗 RPC URL: http://127.0.0.1:8545`);
    console.log(`   📄 Contract: ${contractAddress}`);
    console.log(`   👤 Signer: ${await signer.getAddress()}`);
    console.log("");
    
    // Check if contract is deployed
    const contractCode = await provider.getCode(contractAddress);
    if (contractCode === '0x') {
        console.log("❌ Contract not found! Deploy the contract first with: npx hardhat run scripts/deploy.js --network localhost");
        process.exit(1);
    }
    
    console.log("✅ Contract found on blockchain");
    
    // Database connection
    const dbPath = path.join('../backend/certificates.db');
    if (!fs.existsSync(dbPath)) {
        console.log("❌ Database not found! Make sure backend is running first.");
        process.exit(1);
    }
    
    const db = new Database(dbPath);
    console.log("✅ Database connected");
    
    // Get all events from database
    const events = db.prepare("SELECT id, event_name FROM events ORDER BY id").all();
    console.log(`📊 Found ${events.length} events in database`);
    
    if (events.length === 0) {
        console.log("⚠️  No events in database. Skipping event creation.");
        db.close();
        return;
    }
    
    // Contract setup
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)",
        "function owner() external view returns (address)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Verify we're the owner
    try {
        const owner = await contract.owner();
        if (owner.toLowerCase() !== (await signer.getAddress()).toLowerCase()) {
            console.log(`❌ Not contract owner! Owner: ${owner}, Signer: ${await signer.getAddress()}`);
            process.exit(1);
        }
        console.log("✅ Verified as contract owner");
    } catch (error) {
        console.log("⚠️  Could not verify ownership (contract might not have owner function)");
    }
    
    console.log("\n🔧 Creating events on blockchain...");
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const event of events) {
        try {
            // Check if event already exists
            const existingName = await contract.eventNames(event.id);
            if (existingName && existingName.length > 0) {
                skipped++;
                continue;
            }
            
            // Create event
            const tx = await contract.createEvent(event.id, event.event_name, {
                gasLimit: 200000,
                gasPrice: ethers.parseUnits("1", "gwei")
            });
            
            await tx.wait();
            created++;
            
            // Progress indicator
            if (created % 10 === 0) {
                console.log(`   📈 Created ${created} events so far...`);
            }
            
        } catch (error) {
            console.log(`   ❌ Failed to create event ${event.id}: ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📊 Setup Complete!`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Total: ${events.length}`);
    
    // Test a bulk mint to verify everything works
    console.log(`\n🧪 Testing bulk mint functionality...`);
    
    const testEventId = events[0].id; // Use first event
    const testRecipient = "0xFaBB0e2ccF4b7d19fB4d87e01B0Ee2F1DF62694a";
    
    try {
        const bulkMintABI = [
            "function bulkMintPoA(address[] memory recipients, uint256 eventId) external",
            "function hasPoAForEvent(address, uint256) external view returns (bool)"
        ];
        
        const bulkMintContract = new ethers.Contract(contractAddress, bulkMintABI, signer);
        
        // Check if already minted
        const alreadyHas = await bulkMintContract.hasPoAForEvent(testRecipient, testEventId);
        
        if (!alreadyHas) {
            const tx = await bulkMintContract.bulkMintPoA([testRecipient], testEventId, {
                gasLimit: 500000
            });
            await tx.wait();
            console.log(`✅ Test bulk mint successful for event ${testEventId}`);
        } else {
            console.log(`⏭️  Test recipient already has PoA for event ${testEventId}`);
        }
        
    } catch (error) {
        console.log(`❌ Test bulk mint failed: ${error.message}`);
    }
    
    console.log(`\n🎉 Blockchain setup completed! The system is ready to use.`);
    console.log(`\n💡 To run this setup again: node setup-blockchain.js`);
    
    db.close();
}

setupBlockchain().catch(console.error);