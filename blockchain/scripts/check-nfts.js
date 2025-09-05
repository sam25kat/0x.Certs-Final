import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    
    const contractABI = [
        "event PoAMinted(address indexed recipient, uint256 tokenId, uint256 eventId)",
        "event CertificateMinted(address indexed recipient, uint256 tokenId, uint256 eventId, string ipfsHash)",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    console.log("🔍 Checking all PoA NFT mints...");
    
    try {
        // Get all PoA minting events
        const poaEvents = await contract.queryFilter(
            contract.filters.PoAMinted(),
            0,
            'latest'
        );
        
        console.log(`Found ${poaEvents.length} PoA NFT minting events:`);
        
        for (const event of poaEvents) {
            const { recipient, tokenId, eventId } = event.args;
            const eventName = await contract.eventNames(eventId);
            
            console.log(`  🎖️  Token #${tokenId}`);
            console.log(`      Recipient: ${recipient}`);
            console.log(`      Event ID: ${eventId} (${eventName})`);
            console.log(`      Block: ${event.blockNumber}`);
            console.log(`      TX: ${event.transactionHash}`);
            console.log("");
        }
        
        // Check specific event 1415
        console.log("🎯 Checking Event 1415 'Leverage2' specifically...");
        const event1415NFTs = await contract.queryFilter(
            contract.filters.PoAMinted(null, null, 1415),
            0,
            'latest'
        );
        
        console.log(`Found ${event1415NFTs.length} PoA NFTs for Event 1415:`);
        for (const event of event1415NFTs) {
            console.log(`  - ${event.args.recipient} minted Token #${event.args.tokenId}`);
        }
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);