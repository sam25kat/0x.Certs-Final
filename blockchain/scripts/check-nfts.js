// scripts/check-nfts.js
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(RPC);
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7";

    const contractABI = [
        "event PoAMinted(address indexed recipient, uint256 tokenId, uint256 eventId)",
        "event CertificateMinted(address indexed recipient, uint256 tokenId, uint256 eventId, string ipfsHash)",
        "function eventNames(uint256) external view returns (string memory)",
        "function ownerOf(uint256 tokenId) external view returns (address)",
        "function tokenURI(uint256 tokenId) external view returns (string memory)",
        "function isPoA(uint256) external view returns (bool)"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    console.log("Checking NFT mints on contract:", contractAddress);
    console.log("===============================================");

    try {
        // Get all PoA minting events
        console.log("Fetching PoA minting events...");
        const poaEvents = await contract.queryFilter(contract.filters.PoAMinted(), 0, "latest");
        console.log(`Found ${poaEvents.length} PoA minting events`);

        if (poaEvents.length > 0) {
            console.log("\nPoA NFT Details:");
            console.log("================");
            for (const event of poaEvents) {
                const { recipient, tokenId, eventId } = event.args;
                let eventName = "";
                try {
                    eventName = await contract.eventNames(eventId);
                } catch {
                    eventName = "(unknown)";
                }

                console.log(`Token #${tokenId}`);
                console.log(`  Recipient: ${recipient}`);
                console.log(`  Event: ${eventId} (${eventName})`);
                console.log(`  Block: ${event.blockNumber}`);
                console.log(`  TX: ${event.transactionHash}`);
                console.log("");
            }
        }

        // Get all Certificate minting events
        console.log("Fetching Certificate minting events...");
        const certEvents = await contract.queryFilter(contract.filters.CertificateMinted(), 0, "latest");
        console.log(`Found ${certEvents.length} Certificate minting events`);

        if (certEvents.length > 0) {
            console.log("\nCertificate NFT Details:");
            console.log("========================");
            for (const event of certEvents) {
                const { recipient, tokenId, eventId, ipfsHash } = event.args;
                let eventName = "";
                try {
                    eventName = await contract.eventNames(eventId);
                } catch {
                    eventName = "(unknown)";
                }

                console.log(`Token #${tokenId}`);
                console.log(`  Recipient: ${recipient}`);
                console.log(`  Event: ${eventId} (${eventName})`);
                console.log(`  IPFS Hash: ${ipfsHash}`);
                console.log(`  Block: ${event.blockNumber}`);
                console.log(`  TX: ${event.transactionHash}`);
                console.log("");
            }
        }

        // Summary by event
        console.log("Summary by Event:");
        console.log("=================");
        const eventStats = {};
        
        poaEvents.forEach(event => {
            const eventId = event.args.eventId.toString();
            if (!eventStats[eventId]) {
                eventStats[eventId] = { poa: 0, certificates: 0, name: "" };
            }
            eventStats[eventId].poa++;
        });

        certEvents.forEach(event => {
            const eventId = event.args.eventId.toString();
            if (!eventStats[eventId]) {
                eventStats[eventId] = { poa: 0, certificates: 0, name: "" };
            }
            eventStats[eventId].certificates++;
        });

        // Get event names
        for (const eventId in eventStats) {
            try {
                eventStats[eventId].name = await contract.eventNames(eventId);
            } catch {
                eventStats[eventId].name = "(unknown)";
            }
        }

        for (const [eventId, stats] of Object.entries(eventStats)) {
            console.log(`Event ${eventId} (${stats.name}):`);
            console.log(`  PoA NFTs: ${stats.poa}`);
            console.log(`  Certificates: ${stats.certificates}`);
            console.log("");
        }

        // Overall summary
        console.log("Overall Summary:");
        console.log("================");
        console.log(`Total PoA NFTs: ${poaEvents.length}`);
        console.log(`Total Certificates: ${certEvents.length}`);
        console.log(`Total Events with NFTs: ${Object.keys(eventStats).length}`);

    } catch (error) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);