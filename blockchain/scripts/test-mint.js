import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    // CORRECT contract address from your deployment
    const contractAddress = "0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7";
    
    console.log("🔍 Testing contract at:", contractAddress);
    console.log("Using account:", deployer.address);
    
    // Get the contract
    const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
    const contract = CertificateNFT.attach(contractAddress);
    
    // Check if basic function works
    try {
        console.log("📋 Checking available functions...");
        
        // Try to call eventNames function with an existing event
        const eventName1 = await contract.eventNames(5203); // "certtest"
        console.log("Event 5203 name:", eventName1);
        
        const eventName2 = await contract.eventNames(1415); // "Leverage2"
        console.log("Event 1415 name:", eventName2);
        
        // Check a non-existent event
        const eventName999 = await contract.eventNames(999);
        console.log("Event 999 name:", eventName999 || "(empty)");
        
    } catch (error) {
        console.error("❌ Error calling contract:", error.message);
    }
    
    // Test if functions exist by checking contract interface
    const interface = contract.interface;
    const functions = Object.keys(interface.functions);
    
    console.log("\n📋 All Contract functions:");
    functions.forEach(func => console.log("  -", func));
    
    // Check for specific functions with CORRECT signatures
    const hasBulkMintPoA = functions.includes('bulkMintPoA(address[],uint256,string)');
    const hasBatchTransfer = functions.includes('batchTransfer(address[],uint256[])');
    const hasCreateEvent = functions.includes('createEvent(uint256,string)');
    const hasMintPoA = functions.includes('mintPoA(address,uint256,string)');
    
    console.log("\n✅ Function availability:");
    console.log("  bulkMintPoA:", hasBulkMintPoA);
    console.log("  batchTransfer:", hasBatchTransfer);
    console.log("  createEvent:", hasCreateEvent);
    console.log("  mintPoA:", hasMintPoA);
    
    // Test actual bulk minting
    if (hasBulkMintPoA) {
        try {
            console.log("\n🧪 Testing bulkMintPoA...");
            const eventId = 5203; // "certtest"
            const recipients = [deployer.address]; // Mint to deployer
            const ipfsHash = "QmTestHash123";
            
            // Check if already has PoA
            const hasPoA = await contract.hasPoAForEvent(deployer.address, eventId);
            console.log("Deployer already has PoA for event 5203:", hasPoA);
            
            if (!hasPoA) {
                console.log("Attempting to mint PoA...");
                const tx = await contract.bulkMintPoA(recipients, eventId, ipfsHash);
                console.log("Transaction sent:", tx.hash);
                
                const receipt = await tx.wait();
                console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
                
                // Check if PoA was minted
                const hasPoAAfter = await contract.hasPoAForEvent(deployer.address, eventId);
                console.log("Has PoA after minting:", hasPoAAfter);
            } else {
                console.log("⚠️ Already has PoA, skipping mint");
            }
            
        } catch (error) {
            console.error("❌ Error testing bulkMintPoA:", error.message);
            if (error.reason) {
                console.error("Reason:", error.reason);
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});