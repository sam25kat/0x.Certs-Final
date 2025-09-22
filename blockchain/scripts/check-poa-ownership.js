import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    // Use localhost configuration
    const RPC = "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(RPC);
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Localhost contract
    
    console.log("🔍 Checking PoA ownership for certificate minting...");
    console.log("📄 Contract:", contractAddress);
    console.log("🌐 Network: Localhost Hardhat");
    
    // Use Hardhat test account instead of your personal wallet
    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat Account #0
    console.log("👤 Checking user:", userAddress);
    console.log("");

    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function hasPoAForEvent(address, uint256) external view returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)",
        "function ownerOf(uint256 tokenId) external view returns (address)",
        "function tokenURI(uint256 tokenId) external view returns (string)",
        "function isPoA(uint256) external view returns (bool)",
        "function tokenToEventId(uint256) external view returns (uint256)"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    // Check existing events that have PoA NFTs
    const eventsToCheck = [5203]; // We know this event has PoA NFTs from previous test
    
    console.log("📋 Checking PoA ownership for events:", eventsToCheck.join(", "));
    console.log("");

    for (const eventId of eventsToCheck) {
        try {
            const eventName = await contract.eventNames(eventId);
            const hasPoA = await contract.hasPoAForEvent(userAddress, eventId);
            
            console.log(`🔍 Event ${eventId}: "${eventName}"`);
            console.log(`   📊 Has PoA: ${hasPoA ? "✅ YES" : "❌ NO"}`);
            
            if (!hasPoA) {
                console.log("   💡 Certificate minting will FAIL - need to mint PoA first!");
            } else {
                console.log("   ✅ Certificate minting will SUCCESS - PoA exists!");
            }
            console.log("");
            
        } catch (error) {
            console.log(`❌ Error checking event ${eventId}:`, error.message);
        }
    }

    // Check user's NFT balance and tokens
    try {
        console.log(`👛 NFTs owned by ${userAddress}:`);
        const balance = await contract.balanceOf(userAddress);
        console.log(`   📊 Total NFT Balance: ${balance}`);
        
        if (balance > 0) {
            console.log("   🎖️  Owned Tokens:");
            
            // Check first 10 token IDs to see which ones the user owns
            for (let i = 0; i < 10; i++) {
                try {
                    const owner = await contract.ownerOf(i);
                    if (owner === userAddress) {
                        const uri = await contract.tokenURI(i);
                        const isPoa = await contract.isPoA(i);
                        const eventId = await contract.tokenToEventId(i);
                        const eventName = await contract.eventNames(eventId);
                        
                        console.log(`      Token #${i}:`);
                        console.log(`        Type: ${isPoa ? "PoA" : "Certificate"}`);
                        console.log(`        Event: ${eventId} (${eventName})`);
                        console.log(`        URI: ${uri}`);
                        console.log("");
                    }
                } catch {
                    // Token doesn't exist or not owned by user
                    continue;
                }
            }
        }
        
    } catch (error) {
        console.log("❌ Error getting user tokens:", error.message);
    }

    console.log("📋 Summary:");
    console.log("- To mint certificates, you must first have PoA NFTs for the events");
    console.log("- Use the bulk mint function to mint PoA NFTs first, then mint certificates");
    console.log("- Certificate minting will fail with 'Must have PoA for this event first' if no PoA exists");
    console.log("");
    console.log("🏁 Check completed");
}

main().catch(console.error);