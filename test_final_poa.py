#!/usr/bin/env python3
import json
import requests
from web3 import Web3
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv("backend/.env")

RPC_URL = os.getenv("RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

def test_final_poa():
    """Test the final PoA implementation using external IPFS JSON"""
    
    print("=== TESTING FINAL PoA NFT (EXTERNAL IPFS JSON) ===")
    print(f"Contract Address: {CONTRACT_ADDRESS}")
    
    # Connect to blockchain
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    if not w3.is_connected():
        print("ERROR: Not connected to blockchain")
        return False
    
    # Load contract ABI
    with open("blockchain/artifacts/contracts/CertificateNFT.sol/CertificateNFT.json", "r") as f:
        contract_artifact = json.load(f)
    
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_artifact["abi"])
    
    try:
        # Get token URI for token 0
        token_uri = contract.functions.tokenURI(0).call()
        
        print(f"\nToken URI (should be direct IPFS URL):")
        print(f"{token_uri}")
        
        # This should now be a direct IPFS URL, not base64
        if token_uri.startswith("https://gateway.pinata.cloud/ipfs/"):
            print("\nSUCCESS: Token URI is direct IPFS URL (like POC certificates)")
            
            # Fetch the JSON metadata from IPFS
            print(f"\nFetching metadata from IPFS...")
            response = requests.get(token_uri)
            
            if response.status_code == 200:
                metadata = response.json()
                
                print(f"\n=== PoA NFT METADATA (FROM EXTERNAL IPFS JSON) ===")
                print(json.dumps(metadata, indent=2))
                
                print(f"\n=== VERIFICATION ===")
                print(f"Name: {metadata.get('name')}")
                print(f"Description: {metadata.get('description')}")
                print(f"Image: {metadata.get('image')}")
                print(f"External URL: {metadata.get('external_url')}")
                
                # Test image accessibility
                image_url = metadata.get('image')
                if image_url:
                    try:
                        img_response = requests.head(image_url, timeout=10)
                        print(f"\nImage accessibility: {img_response.status_code} {'OK' if img_response.status_code == 200 else 'FAILED'}")
                        print(f"Image Content-Type: {img_response.headers.get('Content-Type', 'Unknown')}")
                    except Exception as e:
                        print(f"Image test failed: {e}")
                
                print(f"\n=== FOR METAMASK IMPORT ===")
                print(f"Contract Address: {CONTRACT_ADDRESS}")
                print(f"Token ID: 0")
                print(f"Expected: PoA image should now display!")
                
                return True
            else:
                print(f"FAILED to fetch metadata: {response.status_code}")
                return False
        else:
            print(f"ERROR: Token URI is not direct IPFS URL")
            print(f"Got: {token_uri}")
            return False
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    success = test_final_poa()
    
    print(f"\n{'='*60}")
    if success:
        print("SUCCESS: PoA NFTs now use external IPFS JSON (like POC certificates)")
        print("The image should display properly in MetaMask!")
    else:
        print("FAILED: Still issues with PoA NFT implementation")
    print(f"{'='*60}")