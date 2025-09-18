#!/usr/bin/env python3
import json
import base64
from web3 import Web3
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv("backend/.env")

RPC_URL = os.getenv("RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

def check_metadata_format():
    """Check the exact metadata format from the contract"""
    
    print(f"Contract Address: {CONTRACT_ADDRESS}")
    
    # Connect to blockchain
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    if not w3.is_connected():
        print("ERROR: Not connected to blockchain")
        return
    
    # Load contract ABI
    with open("blockchain/artifacts/contracts/CertificateNFT.sol/CertificateNFT.json", "r") as f:
        contract_artifact = json.load(f)
    
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_artifact["abi"])
    
    try:
        # Get token URI for token 0
        token_uri = contract.functions.tokenURI(0).call()
        
        print("Raw Token URI:")
        print(token_uri[:100] + "..." if len(token_uri) > 100 else token_uri)
        
        # Decode if base64
        if token_uri.startswith("data:application/json;base64,"):
            base64_data = token_uri.replace("data:application/json;base64,", "")
            json_data = base64.b64decode(base64_data).decode('utf-8')
            
            print("\nDecoded JSON:")
            print(json_data)
            
            metadata = json.loads(json_data)
            print("\nParsed Metadata:")
            print(json.dumps(metadata, indent=2))
            
            # Check image field specifically
            print(f"\nImage field: '{metadata.get('image', 'NOT_FOUND')}'")
            print(f"Image field length: {len(metadata.get('image', ''))}")
            
            # Test the image URL directly
            import requests
            if 'image' in metadata:
                try:
                    print(f"\nTesting image URL accessibility...")
                    response = requests.head(metadata['image'], timeout=10)
                    print(f"Image URL response: {response.status_code}")
                    print(f"Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
                except Exception as e:
                    print(f"ERROR accessing image URL: {e}")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    print("=== Checking NFT Metadata Format ===")
    check_metadata_format()