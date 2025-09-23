#!/usr/bin/env node

import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log('🎯 Creating event 9642 in new contract...');
  
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY not set in .env file");
    process.exit(1);
  }

  const rpcUrl = "https://public-en-kairos.node.kaia.io";
  const contractAddress = '0xf55562677316d7620d5ebee2d9691a7ce3485740';
  
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Contract ABI for createEvent function
  const abi = [
    {
      "inputs": [
        {"internalType": "uint256", "name": "eventId", "type": "uint256"},
        {"internalType": "string", "name": "eventName", "type": "string"}
      ],
      "name": "createEvent",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  
  console.log(`📄 Contract: ${contractAddress}`);
  
  try {
    console.log('🔄 Creating event 9642 with name "bnm,"...');
    const tx = await contract.createEvent(9642, 'bnm,');
    console.log(`📝 Transaction hash: ${tx.hash}`);
    
    console.log('⏳ Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    console.log(`✅ Event created successfully in block: ${receipt.blockNumber}`);
    
    // Verify the event was created
    const eventName = await contract.eventNames(9642);
    console.log(`🔍 Verification - Event 9642 name: "${eventName}"`);
    
  } catch (error) {
    console.error('❌ Error creating event:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('🎉 Event creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });