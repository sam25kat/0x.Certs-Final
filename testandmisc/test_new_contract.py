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

def test_new_contract_with_poa_image():
    """Test the newly deployed contract by minting a PoA and checking metadata"""
    
    print(f"Testing new contract at: {CONTRACT_ADDRESS}")
    
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
    
    # Setup account
    account = w3.eth.account.from_key(PRIVATE_KEY)
    
    try:
        print(f"Using account: {account.address}")
        
        # Create a test event
        event_id = 999
        event_name = "Test PoA Event with Image"
        
        print(f"Creating event: {event_name}")
        create_event_tx = contract.functions.createEvent(event_id, event_name).build_transaction({
            'from': account.address,
            'gas': 200000,
            'gasPrice': w3.to_wei('20', 'gwei'),
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed_tx = w3.eth.account.sign_transaction(create_event_tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Event created successfully!")
        
        # Mint a PoA NFT
        print(f"Minting PoA NFT for account: {account.address}")
        mint_tx = contract.functions.mintPoA(account.address, event_id).build_transaction({
            'from': account.address,
            'gas': 1000000,  # Increased gas limit for PoA minting with metadata
            'gasPrice': w3.to_wei('20', 'gwei'),
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed_mint_tx = w3.eth.account.sign_transaction(mint_tx, PRIVATE_KEY)
        mint_tx_hash = w3.eth.send_raw_transaction(signed_mint_tx.rawTransaction)
        mint_receipt = w3.eth.wait_for_transaction_receipt(mint_tx_hash)
        print(f"PoA NFT minted successfully!")
        
        # Get the token ID (should be 0 for first minted token)
        token_id = 0
        
        # Get the token URI
        print(f"Getting metadata for token ID: {token_id}")
        token_uri = contract.functions.tokenURI(token_id).call()
        
        # Decode and check metadata
        if token_uri.startswith("data:application/json;base64,"):
            base64_data = token_uri.replace("data:application/json;base64,", "")
            json_data = base64.b64decode(base64_data).decode('utf-8')
            metadata = json.loads(json_data)
            
            print("\n=== NEW CONTRACT NFT METADATA ===")
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
                print("\nSUCCESS: PoA image is NOW INCLUDED in metadata!")
                print(f"Image URL: {image_url}")
                return True
            else:
                print(f"\nERROR: PoA image STILL NOT found in metadata!")
                print(f"Current image: {image_url}")
                return False
        else:
            print("ERROR: Token URI is not base64 encoded metadata")
            return False
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    print("Testing newly deployed contract with PoA image...")
    success = test_new_contract_with_poa_image()
    if success:
        print("\nSUCCESS: CONTRACT IS WORKING CORRECTLY WITH POA IMAGE!")
    else:
        print("\nERROR: CONTRACT STILL HAS ISSUES")