#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend/.env")

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

def upload_poa_image_to_ipfs():
    """Upload PoA.png image to IPFS via Pinata"""
    
    if not PINATA_API_KEY or not PINATA_SECRET_API_KEY:
        print("Error: Pinata API keys not found in environment variables")
        print("Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in backend/.env")
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
            
            response = requests.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                files=files,
                headers=headers
            )
            
            if response.status_code == 200:
                ipfs_hash = response.json()['IpfsHash']
                image_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
                
                print(f"SUCCESS: PoA image uploaded successfully!")
                print(f"IPFS Hash: {ipfs_hash}")
                print(f"Image URL: {image_url}")
                
                # Save the hash to a file for easy reference
                with open("poa_ipfs_hash.txt", "w") as f:
                    f.write(f"IPFS_HASH={ipfs_hash}\n")
                    f.write(f"IMAGE_URL={image_url}\n")
                
                return ipfs_hash
            else:
                print(f"FAILED to upload image: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
    except Exception as e:
        print(f"ERROR uploading PoA image: {str(e)}")
        return None

if __name__ == "__main__":
    print("Uploading PoA.png to IPFS...")
    upload_poa_image_to_ipfs()