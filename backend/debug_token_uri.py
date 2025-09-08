from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))

# Contract ABI for tokenURI function
contract_abi = [
    {
        'inputs': [{'internalType': 'uint256', 'name': 'tokenId', 'type': 'uint256'}],
        'name': 'tokenURI',
        'outputs': [{'internalType': 'string', 'name': '', 'type': 'string'}],
        'stateMutability': 'view',
        'type': 'function'
    }
]

contract_address = os.getenv('CONTRACT_ADDRESS')
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

token_id = 26  # From the screenshot

try:
    token_uri = contract.functions.tokenURI(token_id).call()
    print(f'Token ID {token_id} URI: {token_uri}')
    
    # Check if it's just the IPFS hash or full URL
    if token_uri.startswith('Qm'):
        print('Token URI is just the IPFS hash - this might be the issue!')
        print(f'Expected format should be: https://gateway.pinata.cloud/ipfs/{token_uri}')
    elif token_uri.startswith('https://'):
        print('Token URI is a full URL - should work')
    else:
        print(f'Unexpected URI format: {token_uri}')
        
except Exception as e:
    print(f'Error getting token URI: {e}')