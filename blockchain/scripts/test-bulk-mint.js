import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function bulkMintPoA(address[] memory recipients, uint256 eventId) external",
        "function hasPoAForEvent(address, uint256) external view returns (bool)"
    ];
    
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    const eventId = 5203;
    const testRecipients = ["0xFaBB0e2ccF4b7d19fB4d87e01B0Ee2F1DF62694a"];
    
    console.log("Contract address:", contractAddress);
    console.log("Event ID:", eventId);
    console.log("Recipients:", testRecipients);
    console.log("Signer address:", await signer.getAddress());
    
    try {
        // First check if event exists
        const eventName = await contract.eventNames(eventId);
        console.log("Event name:", eventName);
        
        if (!eventName) {
            console.log("❌ Event does not exist!");
            return;
        }
        
        // Check if recipient already has PoA
        const hasPoA = await contract.hasPoAForEvent(testRecipients[0], eventId);
        console.log("Already has PoA:", hasPoA);
        
        // Try to estimate gas first
        console.log("🔍 Estimating gas...");
        const gasEstimate = await contract.bulkMintPoA.estimateGas(testRecipients, eventId);
        console.log("Gas estimate:", gasEstimate.toString());
        
        // Now try the actual transaction
        console.log("🏭 Executing bulk mint...");
        const tx = await contract.bulkMintPoA(testRecipients, eventId, {
            gasLimit: gasEstimate * 2n // Add some buffer
        });
        
        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        
        // Check events
        const events = receipt.events || [];
        console.log("Events emitted:", events.length);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Full error:", error);
        
        // Try to get more specific error info
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main().catch(console.error);