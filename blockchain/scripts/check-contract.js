const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    
    console.log("🔍 Checking contract at:", contractAddress);
    
    // Get the contract factory
    const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    const contract = CertificateNFT.attach(contractAddress);
    
    console.log("✅ Contract connected successfully");
    
    // Check if bulkMintPoA function exists
    try {
        // Test with empty arrays to see if function exists
        const tx = await contract.populateTransaction.bulkMintPoA([], 999);
        console.log("✅ bulkMintPoA function exists");
        console.log("Function signature:", tx.data.substring(0, 10));
    } catch (error) {
        console.log("❌ bulkMintPoA function NOT found:", error.message);
    }
    
    // Check if batchTransfer function exists
    try {
        const tx = await contract.populateTransaction.batchTransfer([], []);
        console.log("✅ batchTransfer function exists");
        console.log("Function signature:", tx.data.substring(0, 10));
    } catch (error) {
        console.log("❌ batchTransfer function NOT found:", error.message);
    }
    
    // List all available functions
    console.log("\n📋 Available functions:");
    const interface = contract.interface;
    for (const [name, func] of Object.entries(interface.functions)) {
        if (func.type === 'function') {
            console.log(`  - ${func.name}(${func.inputs.map(i => i.type).join(', ')})`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });