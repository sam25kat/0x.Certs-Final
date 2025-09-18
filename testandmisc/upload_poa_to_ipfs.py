#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

# Load environment variables from backend
load_dotenv("backend/.env")

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

def upload_poa_to_ipfs():
    """Upload PoA.png to IPFS using backend Pinata credentials"""
    
    print(f"Using Pinata API Key: {PINATA_API_KEY}")
    print(f"Using Pinata Secret: {PINATA_SECRET_API_KEY[:10]}...")
    
    if not PINATA_API_KEY or not PINATA_SECRET_API_KEY:
        print("ERROR: Pinata API keys not found in backend/.env")
        return None
    
    try:
        # Upload PoA.png image
        with open("public/PoA.png", 'rb') as f:
            files = {
                'file': ("PoA.png", f, 'image/png')
            }
            
            headers = {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_API_KEY
            }
            
            print("Uploading PoA.png to IPFS via Pinata...")
            response = requests.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                files=files,
                headers=headers
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                ipfs_hash = result['IpfsHash']
                image_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
                
                print("\nSUCCESS: PoA image uploaded to IPFS!")
                print(f"IPFS Hash: {ipfs_hash}")
                print(f"Image URL: {image_url}")
                
                # Save the details for contract update
                with open("poa_ipfs_details.txt", "w") as f:
                    f.write(f"IPFS_HASH={ipfs_hash}\n")
                    f.write(f"IMAGE_URL={image_url}\n")
                    f.write(f"PINATA_RESPONSE={result}\n")
                
                return {
                    'ipfs_hash': ipfs_hash,
                    'image_url': image_url,
                    'response': result
                }
            else:
                print(f"FAILED to upload: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
    except Exception as e:
        print(f"ERROR uploading PoA image: {str(e)}")
        return None

if __name__ == "__main__":
    print("=== Uploading PoA.png to IPFS ===")
    result = upload_poa_to_ipfs()
    
    if result:
        print(f"\n=== UPLOAD SUCCESSFUL ===")
        print(f"Use this URL in smart contract: {result['image_url']}")
    else:
        print("\n=== UPLOAD FAILED ===")