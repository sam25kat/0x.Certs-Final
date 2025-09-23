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
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

def test_current_contract():
    """Test the current deployed contract to see PoA metadata"""
    
    print(f"RPC URL: {RPC_URL}")
    print(f"Contract Address: {CONTRACT_ADDRESS}")
    
    # Connect to local Hardhat network
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    if not w3.is_connected():
        print("ERROR: Not connected to blockchain network")
        return
    
    print("SUCCESS: Connected to blockchain")
    
    # Load contract ABI
    with open("blockchain/artifacts/contracts/CertificateNFT.sol/CertificateNFT.json", "r") as f:
        contract_artifact = json.load(f)
    
    contract_abi = contract_artifact["abi"]
    
    # Create contract instance
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)
    
    try:
        # Get total supply or latest token
        try:
            # Try to get tokenURI for token ID 0 (first minted token)
            token_uri = contract.functions.tokenURI(0).call()
            print(f"\nToken URI for token 0: {token_uri[:100]}...")
            
            # Check if it's base64 encoded metadata
            if token_uri.startswith("data:application/json;base64,"):
                base64_data = token_uri.replace("data:application/json;base64,", "")
                json_data = base64.b64decode(base64_data).decode('utf-8')
                metadata = json.loads(json_data)
                
                print("\n=== Current NFT Metadata ===")
                print("Name:", metadata.get("name", "N/A"))
                print("Description:", metadata.get("description", "N/A"))
                print("Image:", metadata.get("image", "ERROR: NO IMAGE FOUND"))
                
                if "attributes" in metadata:
                    print("Attributes:")
                    for attr in metadata["attributes"]:
                        print(f"  - {attr.get('trait_type')}: {attr.get('value')}")
                
                # Check if our PoA image is present
                image_url = metadata.get("image", "")
                if "Qmf3aMx3nyWHpw25EgEHZjM42yTWfH8wJLbHhwZuAQbWr5" in image_url:
                    print("\nSUCCESS: PoA image is present in metadata!")
                else:
                    print(f"\nERROR: PoA image NOT found in metadata!")
                    print(f"Current image: {image_url}")
                    
            else:
                print("ERROR: Token URI is not base64 encoded metadata")
                
        except Exception as e:
            print(f"ERROR: No token found or error reading token: {e}")
            print("This might mean no PoA tokens have been minted yet")
    
    except Exception as e:
        print(f"ERROR: Error connecting to contract: {e}")

if __name__ == "__main__":
    print("Testing current deployed contract...")
    test_current_contract()