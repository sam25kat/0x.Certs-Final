const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  
  console.log("Setting up event 5203 with PoA for test user...");
  console.log("Deployer address:", deployer.address);
  
  const contract = await ethers.getContractAt("CertificateNFT", contractAddress);
  
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
    
    // Transfer the PoA to the recipient (since bulkMintPoA mints to deployer first)
    const tokens = await contract.getTokensByOwner(deployer.address);
    console.log("Deployer tokens:", tokens.map(t => t.toString()));
    
    if (tokens.length > 0) {
      const latestToken = tokens[tokens.length - 1];
      console.log("Transferring token", latestToken.toString(), "to", recipient);
      const transferTx = await contract.transferFrom(deployer.address, recipient, latestToken);
      await transferTx.wait();
      console.log("✅ Token transferred!");
      
      // Verify the recipient has the token
      const recipientTokens = await contract.getTokensByOwner(recipient);
      console.log("Recipient tokens:", recipientTokens.map(t => t.toString()));
    }
    
    console.log("🎉 Setup complete! Event 5203 is ready for certificate generation.");
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });