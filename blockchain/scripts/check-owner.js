import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
    
    const contractABI = [
        "function owner() external view returns (address)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    try {
        const owner = await contract.owner();
        console.log("Contract owner:", owner);
        
        // Also show the deployer address for comparison
        console.log("Deployer address:", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);