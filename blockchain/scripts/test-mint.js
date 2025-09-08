const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    
    console.log("🔍 Testing contract at:", contractAddress);
    console.log("Using account:", deployer.address);
    
    // Get the contract
    const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
    const contract = CertificateNFT.attach(contractAddress);
    
    // Check if basic function works
    try {
        console.log("📋 Checking available functions...");
        
        // Try to call eventNames function (should be safe)
        const eventName = await contract.eventNames(999);
        console.log("Event 999 name:", eventName);
        
    } catch (error) {
        console.error("❌ Error calling contract:", error.message);
    }
    
    // Test if bulkMintPoA exists by checking contract interface
    const interface = contract.interface;
    const functions = Object.keys(interface.functions);
    
    console.log("📋 Contract functions:", functions);
    
    const hasBulkMint = functions.includes('bulkMintPoA(address[],uint256)');
    const hasBatchTransfer = functions.includes('batchTransfer(address[],uint256[])');
    
    console.log("✅ Has bulkMintPoA:", hasBulkMint);
    console.log("✅ Has batchTransfer:", hasBatchTransfer);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});