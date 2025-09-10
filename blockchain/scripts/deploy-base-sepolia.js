import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Check if required environment variables are set
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY not set in .env file");
    console.log("Please add your private key to .env file:");
    console.log("PRIVATE_KEY=your_private_key_here");
    process.exit(1);
  }

  if (!process.env.BASE_SEPOLIA_RPC_URL) {
    console.log("ℹ️  Using default Base Sepolia RPC URL: https://sepolia.base.org");
  }

  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("🚀 Deploying CertificateNFT to Base Sepolia...");
  console.log("📝 Deployer address:", deployer.address);
  
  try {
    const balance = await provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.error("❌ Error: Account has no ETH for deployment");
      console.log("Please add some ETH to your account on Base Sepolia testnet");
      console.log("You can get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
    process.exit(1);
  }

  // Read the compiled contract
  const contractPath = "./artifacts/contracts/CertificateNFT.sol/CertificateNFT.json";
  
  if (!fs.existsSync(contractPath)) {
    console.error("❌ Error: Contract artifact not found!");
    console.log("Please compile the contract first by running:");
    console.log("npx hardhat compile");
    process.exit(1);
  }

  const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  
  console.log("📄 Creating contract factory...");
  const CertificateNFT = new ethers.ContractFactory(
    contractArtifact.abi, 
    contractArtifact.bytecode, 
    deployer
  );

  console.log("⏳ Deploying contract...");
  
  try {
    // Deploy contract (let ethers estimate gas)
    const certificate = await CertificateNFT.deploy();

    console.log("🔄 Waiting for deployment transaction to be mined...");
    await certificate.waitForDeployment();

    const contractAddress = await certificate.getAddress();
    console.log("\n✅ Deployment successful!");
    console.log("🏠 Contract address:", contractAddress);
    console.log("🌐 Network: Base Sepolia (Chain ID: 84532)");
    console.log("🔍 View on BaseScan:", `https://sepolia.basescan.org/address/${contractAddress}`);
    
    console.log("\n📋 Next steps:");
    console.log("1. Update your .env files with the new contract address:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log("2. Update frontend configuration files");
    console.log("3. Update backend configuration files");
    
    // Save deployment info to file
    const deploymentInfo = {
      network: "baseSepolia",
      chainId: 84532,
      contractAddress: contractAddress,
      deployerAddress: deployer.address,
      deploymentTime: new Date().toISOString(),
      transactionHash: certificate.deploymentTransaction().hash
    };
    
    fs.writeFileSync(
      './deployment-info-base-sepolia.json', 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("💾 Deployment info saved to: deployment-info-base-sepolia.json");

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("💡 You need more ETH in your account for deployment");
      console.log("Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment script failed:", error);
    process.exit(1);
  });