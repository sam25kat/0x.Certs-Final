import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
    
    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function bulkMintPoA(address[] memory recipients, uint256 eventId) external",
        "function transferFrom(address from, address to, uint256 tokenId) external",
        "function getTokensByOwner(address owner) external view returns (uint256[])"
    ];
    
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    console.log("Setting up event 5203 for certificate testing...");
    console.log("Signer address:", signer.address);
    
    try {
        // Create event 5203
        console.log("Creating event 5203: 'certtest'");
        const createTx = await contract.createEvent(5203, "certtest");
        await createTx.wait();
        console.log("✅ Event 5203 created!");
        
        // Mint PoA for test user
        const recipient = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";  // Sameer Katte's address
        console.log("Minting PoA for:", recipient);
        const mintTx = await contract.bulkMintPoA([recipient], 5203);
        await mintTx.wait();
        console.log("✅ PoA minted!");
        
        // Check if we need to transfer (bulkMintPoA might mint directly to recipient)
        const signerTokens = await contract.getTokensByOwner(signer.address);
        const recipientTokens = await contract.getTokensByOwner(recipient);
        
        console.log("Signer tokens:", signerTokens.map(t => t.toString()));
        console.log("Recipient tokens:", recipientTokens.map(t => t.toString()));
        
        if (signerTokens.length > 0) {
            const latestToken = signerTokens[signerTokens.length - 1];
            console.log("Transferring token", latestToken.toString(), "to", recipient);
            const transferTx = await contract.transferFrom(signer.address, recipient, latestToken);
            await transferTx.wait();
            console.log("✅ Token transferred!");
            
            // Verify final state
            const finalRecipientTokens = await contract.getTokensByOwner(recipient);
            console.log("Final recipient tokens:", finalRecipientTokens.map(t => t.toString()));
        }
        
        console.log("🎉 Setup complete! Event 5203 is ready for certificate generation.");
        
    } catch (error) {
        if (error.message && error.message.includes("Event already exists")) {
            console.log("Event 5203 already exists, continuing with PoA setup...");
            
            // Still try to mint PoA
            const recipient = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";
            try {
                console.log("Minting PoA for:", recipient);
                const mintTx = await contract.bulkMintPoA([recipient], 5203);
                await mintTx.wait();
                console.log("✅ PoA minted!");
            } catch (mintError) {
                console.log("Note: PoA might already exist for this user");
            }
        } else {
            console.error("Error:", error.message);
        }
    }
}

main().catch(console.error);