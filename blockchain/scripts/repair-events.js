import { ethers } from "ethers";
import sqlite3 from "sqlite3";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function repairEvents() {
    // Database connection
    const dbPath = join(__dirname, "../backend/certificates.db");
    const db = new sqlite3.Database(dbPath);
    
    // Blockchain connection
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    try {
        // Get all events from database
        const events = await new Promise((resolve, reject) => {
            db.all("SELECT id, event_name FROM events WHERE is_active = 1", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`Found ${events.length} events in database`);
        
        let created = 0;
        let skipped = 0;
        let failed = 0;
        
        for (const event of events) {
            try {
                // Check if event already exists on blockchain
                const existingName = await contract.eventNames(event.id);
                
                if (existingName && existingName.length > 0) {
                    console.log(`✓ Event ${event.id} (${event.event_name}) already exists`);
                    skipped++;
                    continue;
                }
                
                // Create event on blockchain
                console.log(`Creating event ${event.id}: ${event.event_name}`);
                const tx = await contract.createEvent(event.id, event.event_name, {
                    gasLimit: 100000
                });
                
                await tx.wait();
                console.log(`✅ Created event ${event.id} - TX: ${tx.hash}`);
                created++;
                
            } catch (error) {
                console.error(`❌ Failed to create event ${event.id}: ${error.message}`);
                failed++;
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Created: ${created}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Failed: ${failed}`);
        
    } catch (error) {
        console.error("Repair script failed:", error);
    } finally {
        db.close();
    }
}

repairEvents().catch(console.error);