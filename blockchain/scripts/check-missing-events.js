import { ethers } from "ethers";

async function checkMissingEvents() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // All database event IDs
    const dbEventIds = [1026, 1415, 1763, 2411, 2544, 3062, 3330, 3379, 3446, 3929, 3965, 4217, 4294, 4637, 4660, 5203, 5288, 5467, 7496, 7633, 8005, 8190, 8357, 8466, 8770, 8927, 9003, 9114, 9527, 9944];
    
    console.log("Checking which database events are missing from blockchain:\n");
    
    const missing = [];
    
    for (const eventId of dbEventIds) {
        try {
            const eventName = await contract.eventNames(eventId);
            if (!eventName || eventName.length === 0) {
                missing.push(eventId);
                console.log(`❌ Event ${eventId} MISSING from blockchain`);
            } else {
                console.log(`✅ Event ${eventId} exists: ${eventName}`);
            }
        } catch (error) {
            missing.push(eventId);
            console.log(`❌ Event ${eventId} ERROR: ${error.message}`);
        }
    }
    
    console.log(`\n🚨 MISSING EVENT IDs: [${missing.join(", ")}]`);
    console.log(`📊 Total missing: ${missing.length} out of ${dbEventIds.length}`);
    
    if (missing.length > 0) {
        console.log("\n💡 These missing events are likely causing the 'Event does not exist' error!");
    }
}

checkMissingEvents().catch(console.error);