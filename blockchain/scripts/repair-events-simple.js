import { ethers } from "ethers";

async function repairEvents() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = "0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7";
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Events from your database - add the ones you need
    const events = [
        { id: 5467, name: "newtest" },
        { id: 8770, name: "C'mon Bitch" },
        { id: 1026, name: "faaaak" },
        { id: 1415, name: "Leverage2" },
        // Add more events as needed
    ];
    
    console.log("Starting event repair...");
    
    for (const event of events) {
        try {
            // Check if event exists
            const existingName = await contract.eventNames(event.id);
            
            if (existingName && existingName.length > 0) {
                console.log(`✓ Event ${event.id} already exists: ${existingName}`);
                continue;
            }
            
            // Create the event
            console.log(`Creating event ${event.id}: ${event.name}`);
            const tx = await contract.createEvent(event.id, event.name, {
                gasLimit: 100000,
                gasPrice: ethers.parseUnits("1", "gwei")
            });
            
            const receipt = await tx.wait();
            console.log(`✅ Event ${event.id} created successfully - TX: ${tx.hash}`);
            
        } catch (error) {
            console.error(`❌ Failed to create event ${event.id}: ${error.message}`);
        }
    }
    
    console.log("Event repair completed!");
}

repairEvents().catch(console.error);