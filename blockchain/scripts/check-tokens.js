import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
  const contract = await ethers.getContractAt("CertificateNFT", contractAddress);
  
  console.log("🔍 Checking tokens 0-5...");
  
  for (let i = 0; i <= 5; i++) {
    try {
      const owner = await contract.ownerOf(i);
      const uri = await contract.tokenURI(i);
      console.log(`Token ${i}: Owner=${owner}, URI=${uri}`);
    } catch (error) {
      console.log(`Token ${i}: Does not exist or error:`, error.message);
    }
  }
  
  // Check total supply
  try {
    const totalSupply = await contract.totalSupply();
    console.log(`\nTotal Supply: ${totalSupply}`);
  } catch (error) {
    console.log("Total supply not available");
  }
}

main().catch(console.error);