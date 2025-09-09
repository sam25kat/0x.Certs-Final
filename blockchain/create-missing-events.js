import { ethers } from "ethers";

async function createMissingEvents() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Missing events from database
    const missingEvents = [
        { id: 3330, name: "Leverage4" },
        { id: 3446, name: "Leverage6" },
        { id: 8466, name: "Leverage100" }
    ];
    
    console.log("🔧 Creating missing events on blockchain...\n");
    
    for (const event of missingEvents) {
        try {
            console.log(`Creating event ${event.id}: ${event.name}`);
            
            // Get current nonce
            const nonce = await provider.getTransactionCount(signer.address, 'pending');
            
            const tx = await contract.createEvent(event.id, event.name, {
                gasLimit: 100000,
                gasPrice: ethers.parseUnits("1", "gwei"),
                nonce: nonce
            });
            
            await tx.wait();
            console.log(`✅ Event ${event.id} created - TX: ${tx.hash}`);
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`❌ Failed to create event ${event.id}: ${error.message}`);
        }
    }
    
    console.log("\n🔍 Verifying all events were created:");
    
    for (const event of missingEvents) {
        try {
            const eventName = await contract.eventNames(event.id);
            if (eventName && eventName.length > 0) {
                console.log(`✅ Event ${event.id} verified: "${eventName}"`);
            } else {
                console.log(`❌ Event ${event.id} still missing!`);
            }
        } catch (error) {
            console.log(`❌ Error verifying event ${event.id}: ${error.message}`);
        }
    }
    
    console.log("\n🎉 Missing events creation completed!");
    console.log("The 'Event does not exist' error should now be resolved.");
}

createMissingEvents().catch(console.error);