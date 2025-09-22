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

  if (!process.env.KAIA_TESTNET_RPC_URL) {
    console.log("ℹ️  Using default KAIA Kairos Testnet RPC URL: https://public-en-kairos.node.kaia.io");
  }

  const rpcUrl = process.env.KAIA_TESTNET_RPC_URL || "https://public-en-kairos.node.kaia.io";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("🚀 Deploying CertificateNFT to KAIA Kairos Testnet...");
  console.log("📍 Deployer address:", deployer.address);
  
  try {
    const balance = await provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "KAIA");
    
    if (balance === 0n) {
      console.error("❌ Error: Account has no KAIA for deployment");
      console.log("Please add some KAIA to your account on KAIA Kairos testnet");
      console.log("You can get testnet KAIA from: https://faucet.kaia.io");
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
  
  console.log("🔥 Creating contract factory...");
  const CertificateNFT = new ethers.ContractFactory(
    contractArtifact.abi, 
    contractArtifact.bytecode, 
    deployer
  );

  console.log("⏳ Deploying contract...");
  
  try {
    // Deploy contract with gas configuration for KAIA
    const certificate = await CertificateNFT.deploy({
      gasPrice: ethers.parseUnits("25", "gwei"), // Standard gas price for KAIA
      gasLimit: 6000000 // Sufficient gas limit for contract deployment
    });

    console.log("🔄 Waiting for deployment transaction to be mined...");
    await certificate.waitForDeployment();

    const contractAddress = await certificate.getAddress();
    console.log("\n✅ Deployment successful!");
    console.log("🏠 Contract address:", contractAddress);
    console.log("🌐 Network: KAIA Kairos Testnet (Chain ID: 1001)");
    console.log("🔍 View on KaiaScan:", `https://kairos.kaiascan.io/address/${contractAddress}`);
    
    console.log("\n📋 Next steps:");
    console.log("1. Update your .env files with the new contract address:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log("2. Update frontend configuration files");
    console.log("3. Update backend configuration files");
    console.log("4. Update Hardhat config to use KAIA testnet as default");
    
    // Save deployment info to file
    const deploymentInfo = {
      network: "kaiaTestnet",
      chainId: 1001,
      contractAddress: contractAddress,
      deployerAddress: deployer.address,
      deploymentTime: new Date().toISOString(),
      transactionHash: certificate.deploymentTransaction().hash,
      rpcUrl: rpcUrl,
      explorer: `https://kairos.kaiascan.io/address/${contractAddress}`
    };
    
    fs.writeFileSync(
      './deployment-info-kaia-testnet.json', 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("💾 Deployment info saved to: deployment-info-kaia-testnet.json");

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("💡 You need more KAIA in your account for deployment");
      console.log("Get testnet KAIA from: https://faucet.kaia.io");
    } else if (error.message.includes("gas")) {
      console.log("💡 Gas-related error. KAIA testnet may have different gas requirements.");
      console.log("Try adjusting gasPrice or gasLimit in the deployment script.");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Deployment script completed successfully!");
    console.log("🔗 Add KAIA Kairos Testnet to MetaMask:");
    console.log("   Network Name: Kaia Kairos Testnet");
    console.log("   RPC URL: https://public-en-kairos.node.kaia.io");
    console.log("   Chain ID: 1001");
    console.log("   Currency Symbol: KAIA");
    console.log("   Block Explorer: https://kairos.kaiascan.io");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment script failed:", error);
    process.exit(1);
  });