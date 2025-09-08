import { ethers } from "ethers";

const address = "0xfabb0e2CcF4b7d19fB4D87e01B0eE2F1df62694a";
console.log("Original:", address);

try {
    const checksumAddress = ethers.getAddress(address.toLowerCase());
    console.log("Checksum:", checksumAddress);
} catch (error) {
    console.error("Error:", error.message);
    // Try with lowercase first
    try {
        const checksumAddress = ethers.getAddress(address.toLowerCase());
        console.log("Checksum (from lowercase):", checksumAddress);
    } catch (e) {
        console.error("Still error:", e.message);
    }
}