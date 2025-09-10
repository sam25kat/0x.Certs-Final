import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';

async function main() {
    // Setup provider and deployer
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat test account
    const deployer = new ethers.Wallet(privateKey, provider);
    
    console.log("Using account:", deployer.address);
    
    // Load contract ABI and bytecode
    const contractPath = path.resolve("artifacts/contracts/CertificateNFT.sol/CertificateNFT.json");
    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    // Create contract factory
    const CertificateNFTFactory = new ethers.ContractFactory(
        contractArtifact.abi,
        contractArtifact.bytecode,
        deployer
    );
    
    // Deploy the contract
    console.log("Deploying CertificateNFT contract...");
    const contract = await CertificateNFTFactory.deploy();
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("CertificateNFT deployed to:", contractAddress);
    
    // Create a test event
    const eventId = 1;
    const eventName = "Test PoA Event";
    console.log(`\nCreating event: ${eventName} (ID: ${eventId})`);
    await contract.createEvent(eventId, eventName);
    
    // Mint a PoA NFT
    console.log(`\nMinting PoA NFT for ${deployer.address}...`);
    const tx = await contract.mintPoA(deployer.address, eventId);
    await tx.wait();
    
    // Get the token ID (should be 0 for the first minted token)
    const tokenId = 0;
    
    // Get the token URI and decode it
    console.log(`\nGetting metadata for token ID: ${tokenId}`);
    const tokenURI = await contract.tokenURI(tokenId);
    
    // Decode base64 metadata
    if (tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.replace("data:application/json;base64,", "");
        const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
        const metadata = JSON.parse(jsonData);
        
        console.log("\n=== PoA NFT Metadata ===");
        console.log("Name:", metadata.name);
        console.log("Description:", metadata.description);
        console.log("Image URL:", metadata.image);
        console.log("Attributes:", JSON.stringify(metadata.attributes, null, 2));
        
        // Verify the PoA image is included
        if (metadata.image && metadata.image.includes("Qmf3vzYCg8wszTevWdqyLJLCHZaYDPpDgMkcHFqihRgKL6")) {
            console.log("\n✅ SUCCESS: PoA image is correctly included in metadata!");
        } else {
            console.log("\n❌ ERROR: PoA image not found in metadata");
        }
    } else {
        console.log("Token URI:", tokenURI);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });