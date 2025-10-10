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

  if (!process.env.KAIA_TESTNET_RPC_URL && !process.env.BASE_SEPOLIA_RPC_URL) {
    console.log("ℹ️  Using default Kaia Kairos RPC URL: https://public-en-kairos.node.kaia.io");
  }

  // Support both env variable names for backwards compatibility
  const rpcUrl = process.env.KAIA_TESTNET_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://public-en-kairos.node.kaia.io";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Get actual network info
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  // Determine network name based on chain ID
  let networkName = "Unknown Network";
  let explorerUrl = "";

  if (chainId === 1001) {
    networkName = "Kaia Kairos Testnet";
    explorerUrl = `https://kairos.kaiascan.io/address/`;
  } else if (chainId === 84532) {
    networkName = "Base Sepolia Testnet";
    explorerUrl = `https://sepolia.basescan.org/address/`;
  } else if (chainId === 8217) {
    networkName = "Kaia Mainnet";
    explorerUrl = `https://kaiascan.io/address/`;
  }

  console.log(`🚀 Deploying CertificateNFT to ${networkName}...`);
  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Chain ID:", chainId);
  
  try {
    const balance = await provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.error("❌ Error: Account has no tokens for deployment");
      if (chainId === 1001) {
        console.log("Please add some KAIA to your account on Kaia Kairos testnet");
        console.log("You can get testnet KAIA from: https://faucet.kaia.io");
      } else if (chainId === 84532) {
        console.log("Please add some ETH to your account on Base Sepolia testnet");
        console.log("You can get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
      }
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
    // Get current gas price and set reasonable limits
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("30", "gwei");

    console.log("⛽ Gas settings:");
    console.log("   Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("   Estimated cost: ~0.1 KAIA");

    // Deploy contract with explicit gas settings to prevent overestimation
    const certificate = await CertificateNFT.deploy({
      gasPrice: gasPrice,  // Use current network gas price
      gasLimit: 5000000    // Set reasonable gas limit (5M units, more than enough)
    });

    console.log("🔄 Waiting for deployment transaction to be mined...");
    await certificate.waitForDeployment();

    const contractAddress = await certificate.getAddress();
    console.log("\n✅ Deployment successful!");
    console.log("🏠 Contract address:", contractAddress);
    console.log("🌐 Network:", networkName, `(Chain ID: ${chainId})`);
    if (explorerUrl) {
      console.log("🔍 View on Explorer:", `${explorerUrl}${contractAddress}`);
    }
    
    console.log("\n📋 Next steps:");
    console.log("1. Update your .env files with the new contract address:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log("2. Update frontend configuration files");
    console.log("3. Update backend configuration files");
    
    // Save deployment info to file
    const deploymentInfo = {
      network: networkName,
      chainId: chainId,
      contractAddress: contractAddress,
      deployerAddress: deployer.address,
      deploymentTime: new Date().toISOString(),
      transactionHash: certificate.deploymentTransaction().hash,
      explorerUrl: explorerUrl ? `${explorerUrl}${contractAddress}` : null
    };

    const filename = chainId === 1001
      ? './deployment-info-kaia-kairos.json'
      : chainId === 84532
        ? './deployment-info-base-sepolia.json'
        : './deployment-info-latest.json';

    fs.writeFileSync(
      filename,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("💾 Deployment info saved to:", filename);

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("💡 You need more tokens in your account for deployment");
      if (chainId === 1001) {
        console.log("Get testnet KAIA from: https://faucet.kaia.io");
      } else if (chainId === 84532) {
        console.log("Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
      }
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