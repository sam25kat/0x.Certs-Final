import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
    
    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function createEvent(uint256 eventId, string memory eventName) external"
    ];
    
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    const eventId = 5467;
    const eventName = "newtest";
    
    console.log(`Creating event ${eventId}: "${eventName}"`);
    
    try {
        const tx = await contract.createEvent(eventId, eventName);
        await tx.wait();
        
        console.log("✅ Event created! Use Event ID:", eventId, "to mint PoA NFTs");
        
        // Verify the event was created
        const storedName = await contract.eventNames(eventId);
        console.log("Event Name:", `"${storedName}"`);
        
    } catch (error) {
        if (error.message.includes("Event already exists")) {
            console.log(`✅ Event ${eventId} already exists`);
        } else {
            console.error("❌ Error creating event:", error.message);
        }
    }
}

main().catch(console.error);