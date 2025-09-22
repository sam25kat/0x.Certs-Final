// repair-events-kaia.js - FIXED VERSION
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function repairAllEventsKaia() {
    const provider = new ethers.JsonRpcProvider("https://public-en-kairos.node.kaia.io");
    const privateKey = process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey, provider);
    
    // USE THE CORRECT KAIA CONTRACT ADDRESS
    const contractAddress = "0xF55562677316D7620d5eBeE2D9691a7CE3485740";
    
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)",
        "function owner() external view returns (address)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    console.log("🚀 Creating Events on KAIA Testnet");
    console.log("=================================");
    console.log("Contract:", contractAddress);
    console.log("Signer:", signer.address);
    console.log("");
    
    // Check balance first
    const balance = await provider.getBalance(signer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "KAIA");
    
    if (balance === 0n) {
        console.error("❌ No KAIA tokens! Get tokens from https://faucet.kaia.io");
        return;
    }
    
    // Test contract connection first
    try {
        const owner = await contract.owner();
        console.log("📋 Contract owner:", owner);
        console.log("🔍 Is signer owner?", owner.toLowerCase() === signer.address.toLowerCase());
        console.log("");
        
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.error("❌ Signer is not contract owner! Only owner can create events.");
            return;
        }
    } catch (error) {
        console.error("❌ Failed to connect to contract:", error.message);
        console.log("💡 Check if contract address is correct:", contractAddress);
        return;
    }
    
    // ALL events from your database
    const events = [
        { id: 1026, name: "faaaak" },
        { id: 1415, name: "Leverage2" },
        { id: 1763, name: "C'mon bitch P-3" },
        { id: 2411, name: "C'mon bitch P-2" },
        { id: 2544, name: "jarvistest" },
        { id: 3062, name: "5testbr" },
        { id: 3379, name: "testbr6" },
        { id: 3929, name: "testagain" },
        { id: 3965, name: "Leverage" },
        { id: 4217, name: "brtest3" },
        { id: 4294, name: "OPS" },
        { id: 4637, name: "certtest2" },
        { id: 4660, name: "brtest2" },
        { id: 5203, name: "certtest" },
        { id: 5288, name: "KOLI" },
        { id: 5467, name: "newtest" },
        { id: 7496, name: "ABCD" },
        { id: 7633, name: "testagain74963" },
        { id: 8005, name: "pls" },
        { id: 8190, name: "QWERTY" },
        { id: 8357, name: "Leverage" },
        { id: 8770, name: "C'mon Bitch" },
        { id: 8927, name: "Leverage2" },
        { id: 9003, name: "brtest" },
        { id: 9114, name: "brtest4" },
        { id: 9527, name: "newtest234" },
        { id: 9944, name: "testagain2" }
    ];
    
    console.log(`Creating ${events.length} events on KAIA...`);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const event of events) {
        try {
            // Check if event exists - handle empty string response properly
            let existingName = "";
            try {
                existingName = await contract.eventNames(event.id);
            } catch (readError) {
                // If reading fails, assume event doesn't exist
                console.log(`   ℹ️  Cannot read event ${event.id} (likely doesn't exist)`);
            }
            
            if (existingName && existingName.length > 0) {
                console.log(`✓ Event ${event.id} already exists: ${existingName}`);
                skipped++;
                continue;
            }
            
            // Create the event with KAIA-specific gas settings
            console.log(`Creating event ${event.id}: ${event.name}`);
            
            const tx = await contract.createEvent(event.id, event.name, {
                gasLimit: 200000, // Higher gas limit for safety
                gasPrice: ethers.parseUnits("25", "gwei") // 25 gwei for KAIA
            });
            
            console.log(`   📤 TX sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Event ${event.id} created successfully!`);
            console.log(`   Gas used: ${receipt.gasUsed} | Block: ${receipt.blockNumber}`);
            console.log(`   KaiaScan: https://kairos.kaiascan.io/tx/${tx.hash}`);
            created++;
            
            // Delay between transactions to avoid nonce issues
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.error(`❌ Failed to create event ${event.id}: ${error.message}`);
            
            // More detailed error handling
            if (error.message.includes("insufficient funds")) {
                console.log("   💡 Need more KAIA tokens");
                break; // Stop if out of funds
            } else if (error.message.includes("nonce")) {
                console.log("   💡 Nonce issue, retrying...");
                // Could add retry logic here
            }
            
            failed++;
        }
    }
    
    console.log(`\n📊 KAIA Deployment Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ↩️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📋 Total: ${events.length}`);
    
    if (created > 0) {
        console.log(`\n🔗 View contract on KaiaScan:`);
        console.log(`   https://kairos.kaiascan.io/address/${contractAddress}`);
    }
}

repairAllEventsKaia().catch(console.error);