import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    
    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function createEvent(uint256 eventId, string memory eventName) external"
    ];
    
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Create a simple test event
    const testEventId = 999;
    const testEventName = "Test Event";
    
    console.log(`Creating test event ${testEventId}: "${testEventName}"`);
    
    try {
        const tx = await contract.createEvent(testEventId, testEventName);
        await tx.wait();
        
        console.log(`✅ Event created! Use Event ID: ${testEventId} to mint PoA NFTs`);
        console.log(`Event Name: "${testEventName}"`);
        
    } catch (error) {
        if (error.message.includes("Event already exists")) {
            console.log(`✅ Event ${testEventId} already exists`);
        } else {
            console.error("Error:", error.message);
        }
    }
}

main().catch(console.error);