import { ethers } from "ethers";

async function main() {
  // For localhost testing, we'll use Hardhat's built-in provider
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat test account
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Read the compiled contract
  const fs = await import("fs");
  const contractArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/CertificateNFT.sol/CertificateNFT.json", "utf8"));
  
  const CertificateNFT = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, deployer);
  const certificate = await CertificateNFT.deploy();

  console.log("CertificateNFT deployed to:", await certificate.getAddress());
  console.log("Save this address to your .env file as CONTRACT_ADDRESS");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });