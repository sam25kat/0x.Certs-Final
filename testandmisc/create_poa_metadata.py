#!/usr/bin/env python3
import json
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend/.env")

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

def create_and_upload_poa_metadata():
    """Create PoA metadata JSON and upload to IPFS (like POC certificates do)"""
    
    # Create the PoA metadata JSON (similar to certificate metadata)
    poa_metadata = {
        "name": "Proof of Attendance (PoA)",
        "description": "Official Proof of Attendance NFT for events organized by 0x.day",
        "image": "https://gateway.pinata.cloud/ipfs/Qmf3vzYCg8wszTevWdqyLJLCHZaYDPpDgMkcHFqihRgKL6",
        "external_url": "https://0x.day",
        "attributes": [
            {
                "trait_type": "Type",
                "value": "PoA"
            },
            {
                "trait_type": "Issuer",
                "value": "0x.day"
            }
        ]
    }
    
    print("PoA Metadata to upload:")
    print(json.dumps(poa_metadata, indent=2))
    
    try:
        # Upload metadata JSON to IPFS (same way as certificates)
        headers = {
            'Content-Type': 'application/json',
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_API_KEY
        }
        
        data = {
            'pinataContent': poa_metadata,
            'pinataMetadata': {
                'name': 'PoA_Base_Metadata.json'
            }
        }
        
        print("\nUploading PoA metadata to IPFS...")
        response = requests.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            headers=headers,
            json=data
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            metadata_hash = result['IpfsHash']
            metadata_url = f"https://gateway.pinata.cloud/ipfs/{metadata_hash}"
            
            print(f"\nSUCCESS: PoA metadata uploaded!")
            print(f"IPFS Hash: {metadata_hash}")
            print(f"Metadata URL: {metadata_url}")
            
            # Save for contract update
            with open("poa_metadata_hash.txt", "w") as f:
                f.write(f"METADATA_HASH={metadata_hash}\n")
                f.write(f"METADATA_URL={metadata_url}\n")
                f.write(f"FULL_RESPONSE={result}\n")
            
            return {
                'hash': metadata_hash,
                'url': metadata_url,
                'response': result
            }
        else:
            print(f"FAILED: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"ERROR: {e}")
        return None

if __name__ == "__main__":
    print("=== Creating PoA Metadata File (Like POC Certificates) ===")
    result = create_and_upload_poa_metadata()
    
    if result:
        print(f"\n=== SUCCESS ===")
        print(f"Use this IPFS hash in contract: {result['hash']}")
        print(f"Test metadata URL: {result['url']}")
    else:
        print("\n=== FAILED ===")
        print("Could not upload PoA metadata")