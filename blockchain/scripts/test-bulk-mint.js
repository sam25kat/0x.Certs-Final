// scripts/test-bulk-mint.js - Fixed for localhost testing
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const RPC = "http://127.0.0.1:8545"; // Force localhost
    const provider = new ethers.JsonRpcProvider(RPC);

    const CONTRACT = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // USE HARDHAT TEST ACCOUNTS WITH ETH BALANCE
    const HARDHAT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Account #0
    const signer = new ethers.Wallet(HARDHAT_PRIVATE_KEY, provider);

    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function hasPoAForEvent(address, uint256) external view returns (bool)",
        "function bulkMintPoA(address[] memory recipients, uint256 eventId, string memory ipfsHash) external",
        "function isPoA(uint256) external view returns (bool)",
        "function tokenToEventId(uint256) external view returns (uint256)",
        "function ownerOf(uint256 tokenId) external view returns (address)",
        "event PoAMinted(address indexed recipient, uint256 tokenId, uint256 eventId)"
    ];

    const contract = new ethers.Contract(CONTRACT, contractABI, signer);

    const eventId = Number(process.env.TEST_EVENT_ID || 5203);
    
    // Use Hardhat test accounts as recipients
    const recipients = [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat Account #0
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  // Hardhat Account #1
    ];
    
    const ipfsHash = "QmTestHash123456789";

    console.log(">> LOCALHOST BULK MINT TEST");
    console.log("Contract:", CONTRACT);
    console.log("Signer:", await signer.getAddress());
    console.log("Signer Balance:", ethers.formatEther(await provider.getBalance(signer.address)), "ETH");
    console.log("Event:", eventId);
    console.log("Recipients:", recipients);
    console.log("");

    // Check event exists
    let eventName = "";
    try {
        eventName = await contract.eventNames(eventId);
    } catch {}
    console.log("Event name:", eventName || "<not found>");
    if (!eventName) {
        console.error("❌ Event does not exist, aborting.");
        return;
    }

    // PoA check for first recipient
    const has = await contract.hasPoAForEvent(recipients[0], eventId);
    console.log("First recipient already has PoA:", has);

    // Simulate
    try {
        console.log("🔎 Simulating with callStatic...");
        await contract.bulkMintPoA.staticCall(recipients, eventId, ipfsHash);
        console.log("✅ Simulation passed.");
    } catch (e) {
        console.error("❌ Simulation failed:", e.reason || e.message);
        return;
    }

    // Send tx
    try {
        console.log("📤 Sending transaction...");
        
        // Get gas estimate
        const gasEstimate = await contract.bulkMintPoA.estimateGas(recipients, eventId, ipfsHash);
        console.log("Gas estimate:", gasEstimate.toString());
        
        const tx = await contract.bulkMintPoA(recipients, eventId, ipfsHash, { 
            gasLimit: gasEstimate * 2n // 200% of estimate for safety
        });
        
        console.log("TX hash:", tx.hash);
        const rcpt = await tx.wait();
        console.log("✅ Confirmed in block", rcpt.blockNumber);
        console.log("Gas used:", rcpt.gasUsed.toString());
        
        // Check for PoAMinted events
        const poaEvents = rcpt.logs.filter(log => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed && parsed.name === 'PoAMinted';
            } catch { 
                return false; 
            }
        });
        
        console.log(`🎉 Successfully minted ${poaEvents.length} PoA NFTs!`);
        
        // Display minted tokens
        poaEvents.forEach((log, index) => {
            const parsed = contract.interface.parseLog(log);
            console.log(`   Token #${parsed.args.tokenId} -> ${parsed.args.recipient}`);
        });
        
    } catch (err) {
        console.error("❌ Transaction failed:", err.reason || err.message);
        
        // Additional debugging
        if (err.message.includes("funds")) {
            console.log("💡 Tip: Make sure you're using Hardhat test accounts with ETH balance");
            console.log("   Current signer balance:", ethers.formatEther(await provider.getBalance(signer.address)));
        }
    }
}

main().catch(console.error);