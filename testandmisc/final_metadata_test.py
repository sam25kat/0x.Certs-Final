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

def test_final_metadata():
    """Test the final contract and show complete metadata for MetaMask import"""
    
    print("=== FINAL PoA NFT METADATA TEST ===")
    print(f"Contract Address: {CONTRACT_ADDRESS}")
    print(f"RPC URL: {RPC_URL}")
    
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
        # Get token URI for latest minted token
        token_uri = contract.functions.tokenURI(0).call()
        
        print("\n=== TOKEN URI ===")
        print(f"Token URI: {token_uri}")
        
        # Decode metadata
        if token_uri.startswith("data:application/json;base64,"):
            base64_data = token_uri.replace("data:application/json;base64,", "")
            json_data = base64.b64decode(base64_data).decode('utf-8')
            metadata = json.loads(json_data)
            
            print("\n=== DECODED METADATA ===")
            print(json.dumps(metadata, indent=2))
            
            print("\n=== METADATA FIELDS ===")
            print(f"Name: {metadata.get('name')}")
            print(f"Description: {metadata.get('description')}")
            print(f"Image URL: {metadata.get('image')}")
            print(f"External URL: {metadata.get('external_url', 'Not set')}")
            
            if 'attributes' in metadata:
                print("\nAttributes:")
                for attr in metadata['attributes']:
                    print(f"  - {attr.get('trait_type')}: {attr.get('value')}")
            
            print("\n=== FOR METAMASK IMPORT ===")
            print(f"Contract Address: {CONTRACT_ADDRESS}")
            print(f"Token ID: 0")
            print(f"Token Standard: ERC721")
            print(f"Network: Local Hardhat (Chain ID: 31337)")
            
            # Verify image accessibility
            import requests
            try:
                response = requests.head(metadata['image'], timeout=10)
                print(f"\nImage accessibility check: {response.status_code} - {'OK' if response.status_code == 200 else 'FAILED'}")
                print(f"Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
                print(f"Content-Length: {response.headers.get('Content-Length', 'Unknown')} bytes")
            except Exception as e:
                print(f"Image accessibility check FAILED: {e}")
            
            return True
        else:
            print("ERROR: Token URI is not base64 encoded")
            return False
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    success = test_final_metadata()
    
    if success:
        print("\n" + "="*60)
        print("✅ READY FOR METAMASK IMPORT!")
        print("="*60)
        print("1. Open MetaMask")
        print("2. Go to NFTs tab")
        print("3. Click 'Import NFT'")
        print(f"4. Enter Contract Address: {os.getenv('CONTRACT_ADDRESS')}")
        print("5. Enter Token ID: 0")
        print("6. The PoA image should now display!")
        print("="*60)
    else:
        print("\n❌ There are still issues to resolve")