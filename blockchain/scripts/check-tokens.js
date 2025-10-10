import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contractAddress = "0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7";

  const abi = [
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string)",
    "function isPoA(uint256) external view returns (bool)",
    "function tokenToEventId(uint256) external view returns (uint256)",
    "function eventNames(uint256) external view returns (string)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, provider);

  console.log("🔍 Checking existing tokens...");
  console.log("Contract:", contractAddress);
  console.log("");
  
  let foundTokens = 0;
  
  // Check tokens 0-20 to find existing ones
  for (let i = 0; i <= 20; i++) {
    try {
      const owner = await contract.ownerOf(i);
      foundTokens++;
      
      console.log(`✅ Token ${i}:`);
      console.log(`   Owner: ${owner}`);
      
      try {
        const uri = await contract.tokenURI(i);
        console.log(`   URI: ${uri}`);
      } catch {
        console.log("   URI: (error reading URI)");
      }
      
      try {
        const isPoa = await contract.isPoA(i);
        const eventId = await contract.tokenToEventId(i);
        const eventName = await contract.eventNames(eventId);
        
        console.log(`   Type: ${isPoa ? "PoA" : "Certificate"}`);
        console.log(`   Event: ${eventId} (${eventName})`);
      } catch {
        console.log("   Type: (error reading type)");
      }
      
      console.log("");
      
    } catch (error) {
      // Token doesn't exist - this is normal
      if (i < 5 || foundTokens === 0) {
        console.log(`❌ Token ${i}: Does not exist`);
      }
    }
  }
  
  if (foundTokens === 0) {
    console.log("ℹ️  No tokens found. Contract might be empty or not deployed.");
  } else {
    console.log(`📊 Summary: Found ${foundTokens} existing tokens`);
  }
}

main().catch(console.error);