import { ethers } from "ethers";

async function debugMintError() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function bulkMintPoA(address[] memory recipients, uint256 eventId) external"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    console.log("🔍 Debugging bulkMintPoA 'Event does not exist' error...\n");
    
    // Test some common event IDs that might be used
    const testEventIds = [1, 2, 3, 4, 5, 1000, 2000, 3000, 5467, 8357, 1415];
    
    console.log("📋 Checking which events exist on blockchain:");
    for (const eventId of testEventIds) {
        try {
            const eventName = await contract.eventNames(eventId);
            if (eventName && eventName.length > 0) {
                console.log(`✅ Event ${eventId}: "${eventName}"`);
            } else {
                console.log(`❌ Event ${eventId}: NOT FOUND`);
            }
        } catch (error) {
            console.log(`❌ Event ${eventId}: ERROR - ${error.message}`);
        }
    }
    
    console.log("\n🧪 Testing bulkMintPoA with different event IDs:");
    
    // Test recipient (organizer address)
    const testRecipient = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    
    for (const eventId of [5467, 8357, 1415]) {
        try {
            console.log(`\n🔬 Testing bulkMintPoA with event ${eventId}:`);
            
            // First check if event exists
            const eventName = await contract.eventNames(eventId);
            console.log(`   Event name: "${eventName}"`);
            
            if (!eventName || eventName.length === 0) {
                console.log(`   ❌ Event ${eventId} does not exist on blockchain`);
                continue;
            }
            
            // Try to estimate gas (this will fail if the transaction would revert)
            try {
                const gasEstimate = await contract.bulkMintPoA.estimateGas([testRecipient], eventId);
                console.log(`   ✅ Gas estimate successful: ${gasEstimate}`);
            } catch (gasError) {
                console.log(`   ❌ Gas estimation failed: ${gasError.message}`);
                
                // This is likely the problematic event ID
                if (gasError.message.includes("Event does not exist")) {
                    console.log(`   🚨 FOUND THE PROBLEM: Event ${eventId} fails with "Event does not exist"`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Error testing event ${eventId}: ${error.message}`);
        }
    }
    
    console.log("\n📊 Summary:");
    console.log("If gas estimation fails with 'Event does not exist', that event ID is the problem.");
    console.log("Check frontend code to see which event ID it's actually using for minting.");
}

debugMintError().catch(console.error);