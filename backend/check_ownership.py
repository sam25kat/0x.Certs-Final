from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))

# Contract ABI for ERC721 functions
contract_abi = [
    {
        'inputs': [{'internalType': 'address', 'name': 'owner', 'type': 'address'}],
        'name': 'balanceOf',
        'outputs': [{'internalType': 'uint256', 'name': '', 'type': 'uint256'}],
        'stateMutability': 'view',
        'type': 'function'
    },
    {
        'inputs': [{'internalType': 'uint256', 'name': 'tokenId', 'type': 'uint256'}],
        'name': 'ownerOf',
        'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
        'stateMutability': 'view',
        'type': 'function'
    },
    {
        'inputs': [],
        'name': 'totalSupply',
        'outputs': [{'internalType': 'uint256', 'name': '', 'type': 'uint256'}],
        'stateMutability': 'view',
        'type': 'function'
    }
]

contract_address = os.getenv('CONTRACT_ADDRESS')
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

participant_wallet = '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a'
organizer_wallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

try:
    # Check balance of participant
    participant_balance = contract.functions.balanceOf(participant_wallet).call()
    print(f'Participant ({participant_wallet}) balance: {participant_balance}')
    
    # Check balance of organizer 
    organizer_balance = contract.functions.balanceOf(organizer_wallet).call()
    print(f'Organizer ({organizer_wallet}) balance: {organizer_balance}')
    
    # Try to get total supply
    try:
        total_supply = contract.functions.totalSupply().call()
        print(f'Total supply: {total_supply}')
        
        # Check ownership of a few tokens
        for token_id in range(min(10, total_supply)):
            try:
                owner = contract.functions.ownerOf(token_id).call()
                print(f'Token {token_id} owned by: {owner}')
            except Exception as e:
                print(f'Token {token_id}: {e}')
                
    except Exception as e:
        print(f'Total supply not available: {e}')
        
        # Try checking specific token IDs from database
        token_ids_to_check = [0, 1, 2, 3, 4, 999, 14]
        for token_id in token_ids_to_check:
            try:
                owner = contract.functions.ownerOf(token_id).call()
                print(f'Token {token_id} owned by: {owner}')
            except Exception as e:
                print(f'Token {token_id}: Error - {str(e)[:50]}...')
        
except Exception as e:
    print(f'Error checking balances: {e}')