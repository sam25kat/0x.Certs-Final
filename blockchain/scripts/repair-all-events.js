import { ethers } from "ethers";

async function repairAllEvents() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = "0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7";
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
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
    
    console.log(`Creating ALL ${events.length} events from database...`);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const event of events) {
        try {
            // Check if event exists
            const existingName = await contract.eventNames(event.id);
            
            if (existingName && existingName.length > 0) {
                console.log(`✓ Event ${event.id} already exists: ${existingName}`);
                skipped++;
                continue;
            }
            
            // Create the event
            console.log(`Creating event ${event.id}: ${event.name}`);
            
            // Get current nonce to prevent conflicts
            const nonce = await provider.getTransactionCount(signer.address, 'pending');
            
            const tx = await contract.createEvent(event.id, event.name, {
                gasLimit: 100000,
                gasPrice: ethers.parseUnits("1", "gwei"),
                nonce: nonce
            });
            
            await tx.wait();
            console.log(`✅ Event ${event.id} created - TX: ${tx.hash}`);
            created++;
            
            // Small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`❌ Failed to create event ${event.id}: ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📊 Final Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ↩️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📋 Total: ${events.length}`);
}

repairAllEvents().catch(console.error);