import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    
    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function createEvent(uint256 eventId, string memory eventName) external"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    console.log("Checking event 1415...");
    try {
        const eventName = await contract.eventNames(1415);
        console.log(`Event 1415: "${eventName}"`);
        
        if (!eventName || eventName === "") {
            console.log("Event 1415 does not exist. Creating it...");
            
            // Need signer to create event
            const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
            const signer = new ethers.Wallet(privateKey, provider);
            const contractWithSigner = new ethers.Contract(contractAddress, contractABI, signer);
            
            const tx = await contractWithSigner.createEvent(1415, "Leverage2");
            await tx.wait();
            
            console.log("✅ Event 1415 'Leverage2' created!");
        } else {
            console.log("✅ Event 1415 already exists");
        }
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);