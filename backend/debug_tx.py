from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))

# Get the transaction details
tx_hash = '0x5d3457aa86da344cbcfc581370a68dfc9d380325d8fb4dfd62c20cf1c4e89af9'
try:
    tx = w3.eth.get_transaction(tx_hash)
    print(f'Transaction from: {tx.get("from")}')
    print(f'Transaction to: {tx.get("to")}')
    print('Transaction input (first 200 chars):')
    print(tx.get('input').hex()[:200])
    
    # Try to decode the transaction input to see the recipient parameter
    input_data = tx.get('input').hex()
    print(f'\nFunction selector: {input_data[:10]}')
    
    # The recipient address should be in the first 32-byte parameter
    if len(input_data) >= 74:  # 10 + 64 chars
        recipient_param = input_data[10:74]  # 64 hex chars = 32 bytes
        recipient_address = '0x' + recipient_param[-40:]  # Last 40 hex chars = 20 bytes = address
        print(f'Recipient parameter: 0x{recipient_param}')
        print(f'Extracted recipient: {recipient_address}')
        
        # Check who actually owns the token
        contract_abi = [
            {
                'inputs': [{'internalType': 'uint256', 'name': 'tokenId', 'type': 'uint256'}],
                'name': 'ownerOf',
                'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
                'stateMutability': 'view',
                'type': 'function'
            }
        ]
        
        contract_address = os.getenv('CONTRACT_ADDRESS')
        contract = w3.eth.contract(address=contract_address, abi=contract_abi)
        
        # Get token ID from receipt logs
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        for log in receipt.logs:
            if len(log.topics) >= 4:
                token_id = int(log.topics[2].hex(), 16)
                try:
                    owner = contract.functions.ownerOf(token_id).call()
                    print(f'\nToken ID: {token_id}')
                    print(f'Actual owner: {owner}')
                    print(f'Expected recipient: {recipient_address}')
                    print(f'Match: {owner.lower() == recipient_address.lower()}')
                except Exception as e:
                    print(f'Error checking token owner: {e}')
                break
        
except Exception as e:
    print(f'Error: {e}')