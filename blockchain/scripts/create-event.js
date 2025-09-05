import { ethers } from "ethers";
import fs from 'fs';

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat test account
    const signer = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    
    // Load ABI
    const contractABI = [
        "function createEvent(uint256 eventId, string memory eventName) external",
        "function eventNames(uint256) external view returns (string memory)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    console.log("Creating test event...");
    
    const eventId = 1001;
    const eventName = "Test Hackathon 2024";
    
    const tx = await contract.createEvent(eventId, eventName);
    await tx.wait();
    
    console.log(`✅ Event created! Event ID: ${eventId}, Name: ${eventName}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});