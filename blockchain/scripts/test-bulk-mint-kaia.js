// test-bulk-mint-kaia.js - FIXED VERSION
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function testBulkMintKaia() {
    const rpcUrl = "https://public-en-kairos.node.kaia.io";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // USE THE CORRECT KAIA CONTRACT ADDRESS
    const contractAddress = "0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7";
    const privateKey = process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey, provider);

    const contractABI = [
        "function eventNames(uint256) external view returns (string memory)",
        "function hasPoAForEvent(address, uint256) external view returns (bool)",
        "function bulkMintPoA(address[] memory recipients, uint256 eventId, string memory ipfsHash) external",
        "function balanceOf(address owner) external view returns (uint256)",
        "function owner() external view returns (address)",
        "event PoAMinted(address indexed recipient, uint256 tokenId, uint256 eventId)"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    console.log("🧪 KAIA TESTNET BULK MINT TEST");
    console.log("=============================");
    console.log("Contract:", contractAddress);
    console.log("Network: KAIA Kairos Testnet");
    console.log("Signer:", signer.address);
    
    // Check balance
    const balance = await provider.getBalance(signer.address);
    console.log("Balance:", ethers.formatEther(balance), "KAIA");
    console.log("");

    // Test contract connection first
    try {
        const owner = await contract.owner();
        console.log("📋 Contract owner:", owner);
        console.log("🔍 Network connected:", await provider.getNetwork().then(n => n.chainId.toString()));
    } catch (error) {
        console.error("❌ Contract connection failed:", error.message);
        console.log("💡 Check contract address and network connection");
        return;
    }

    const eventId = 5203; // "certtest"
    const recipients = [
        signer.address, // Your wallet
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" // Test address
    ];
    const ipfsHash = "QmKaiaTestHash123";

    try {
        // Check event exists - with better error handling
        let eventName = "";
        try {
            eventName = await contract.eventNames(eventId);
        } catch (error) {
            console.log(`⚠️ Cannot read event ${eventId} (might not exist):`, error.message);
        }
        
        console.log(`Event ${eventId}: "${eventName || 'NOT FOUND'}"`);
        
        if (!eventName || eventName.length === 0) {
            console.log("❌ Event does not exist. Create events first with repair-events-kaia.js");
            
            // Let's create a test event for demonstration
            console.log("\n🔧 Creating test event for demonstration...");
            const testEventId = 99999;
            const testEventName = "KAIA Bulk Mint Test";
            
            try {
                const createTx = await contract.createEvent(testEventId, testEventName, {
                    gasLimit: 200000,
                    gasPrice: ethers.parseUnits("25", "gwei")
                });
                
                await createTx.wait();
                console.log(`✅ Test event ${testEventId} created: "${testEventName}"`);
                
                // Update eventId for testing
                const updatedEventId = testEventId;
                
                // Now test bulk minting with the new event
                console.log(`\n🧪 Testing bulk mint with event ${updatedEventId}...`);
                
                // Simulate transaction
                console.log("🔍 Simulating bulk mint...");
                try {
                    await contract.bulkMintPoA.staticCall(recipients, updatedEventId, ipfsHash);
                    console.log("✅ Simulation successful");
                } catch (simError) {
                    console.error("❌ Simulation failed:", simError.message);
                    return;
                }

                // Estimate gas
                const gasEstimate = await contract.bulkMintPoA.estimateGas(recipients, updatedEventId, ipfsHash);
                console.log("Gas estimate:", gasEstimate.toString());

                // Execute transaction
                console.log("\n📤 Sending bulk mint transaction...");
                const tx = await contract.bulkMintPoA(recipients, updatedEventId, ipfsHash, {
                    gasLimit: gasEstimate * 2n, // 200% of estimate
                    gasPrice: ethers.parseUnits("25", "gwei")
                });

                console.log("TX hash:", tx.hash);
                console.log("KaiaScan:", `https://kairos.kaiascan.io/tx/${tx.hash}`);

                // Wait for confirmation
                console.log("⏳ Waiting for confirmation...");
                const receipt = await tx.wait();

                console.log("✅ Transaction confirmed!");
                console.log("Block:", receipt.blockNumber);
                console.log("Gas used:", receipt.gasUsed.toString());

                // Check for PoAMinted events
                const poaEvents = receipt.logs.filter(log => {
                    try {
                        const parsed = contract.interface.parseLog(log);
                        return parsed && parsed.name === 'PoAMinted';
                    } catch { return false; }
                });

                console.log(`\n🎉 Successfully minted ${poaEvents.length} PoA NFTs!`);
                poaEvents.forEach((log, index) => {
                    const parsed = contract.interface.parseLog(log);
                    console.log(`  Token #${parsed.args.tokenId} → ${parsed.args.recipient}`);
                });

                // Verify final state
                console.log("\n📊 Final verification:");
                for (let i = 0; i < recipients.length; i++) {
                    const hasPoA = await contract.hasPoAForEvent(recipients[i], updatedEventId);
                    const balance = await contract.balanceOf(recipients[i]);
                    console.log(`${recipients[i]}: PoA=${hasPoA}, Balance=${balance}`);
                }
                
            } catch (createError) {
                console.error("❌ Failed to create test event:", createError.message);
                return;
            }
            
            return;
        }

        // Continue with original flow if event exists...
        // Check current PoA status
        for (let i = 0; i < recipients.length; i++) {
            const hasPoA = await contract.hasPoAForEvent(recipients[i], eventId);
            const balance = await contract.balanceOf(recipients[i]);
            console.log(`Recipient ${i + 1}: ${recipients[i]}`);
            console.log(`  Has PoA: ${hasPoA}, NFT Balance: ${balance}`);
        }

        // Rest of the bulk mint logic...
        console.log("\n🔍 Simulating bulk mint...");
        await contract.bulkMintPoA.staticCall(recipients, eventId, ipfsHash);
        console.log("✅ Simulation successful");

        const gasEstimate = await contract.bulkMintPoA.estimateGas(recipients, eventId, ipfsHash);
        const tx = await contract.bulkMintPoA(recipients, eventId, ipfsHash, {
            gasLimit: gasEstimate * 2n,
            gasPrice: ethers.parseUnits("25", "gwei")
        });

        const receipt = await tx.wait();
        console.log("✅ Bulk mint successful!");
        console.log("TX:", tx.hash);

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Need more KAIA tokens. Get from: https://faucet.kaia.io");
        } else if (error.message.includes("could not decode")) {
            console.log("💡 Contract call failed. Check contract address and network.");
        }
    }
}

testBulkMintKaia().catch(console.error);