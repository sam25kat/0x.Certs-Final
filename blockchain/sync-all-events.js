import { ethers } from "ethers";
import Database from 'better-sqlite3';
import path from 'path';

async function syncAllEvents() {
    console.log("🔄 Syncing all events from database to blockchain...\n");
    
    // Database connection
    const dbPath = path.join('../backend/certificates.db');
    const db = new Database(dbPath);
    
    // Get all events from database
    const events = db.prepare("SELECT id, event_name FROM events ORDER BY id").all();
    console.log(`📊 Found ${events.length} events in database\n`);
    
    // Blockchain setup
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const event of events) {
        try {
            // Check if event already exists
            const existingName = await contract.eventNames(event.id);
            if (existingName && existingName.length > 0) {
                console.log(`⏭️  Event ${event.id} already exists: "${existingName}"`);
                skipped++;
                continue;
            }
            
            console.log(`🔧 Creating event ${event.id}: "${event.event_name}"`);
            
            // Create event
            const tx = await contract.createEvent(event.id, event.event_name, {
                gasLimit: 200000,
                gasPrice: ethers.parseUnits("1", "gwei")
            });
            
            await tx.wait();
            console.log(`✅ Event ${event.id} created successfully - TX: ${tx.hash}`);
            created++;
            
            // Small delay to avoid nonce issues
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`❌ Failed to create event ${event.id}: ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📈 Sync Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${events.length}`);
    
    // Verify a few random events
    console.log(`\n🔍 Verifying random events:`);
    const sampleEvents = events.slice(0, 5); // Check first 5
    for (const event of sampleEvents) {
        try {
            const eventName = await contract.eventNames(event.id);
            if (eventName && eventName.length > 0) {
                console.log(`✅ Event ${event.id} verified: "${eventName}"`);
            } else {
                console.log(`❌ Event ${event.id} missing!`);
            }
        } catch (error) {
            console.log(`❌ Error verifying event ${event.id}: ${error.message}`);
        }
    }
    
    console.log(`\n🎉 Event sync completed! All database events should now exist on blockchain.`);
    db.close();
}

syncAllEvents().catch(console.error);