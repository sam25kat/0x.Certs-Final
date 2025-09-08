from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))

# Check logs from the certificate minting transaction
tx_hash = '0x5d3457aa86da344cbcfc581370a68dfc9d380325d8fb4dfd62c20cf1c4e89af9'

try:
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    print(f'Transaction logs count: {len(receipt.logs)}')
    
    for i, log in enumerate(receipt.logs):
        print(f'\n--- Log {i} ---')
        print(f'Address: {log.address}')
        print(f'Topics count: {len(log.topics)}')
        
        for j, topic in enumerate(log.topics):
            topic_hex = topic.hex()
            print(f'Topic {j}: {topic_hex}')
            
            # Try to parse topic as different data types
            try:
                if j >= 2:  # Token ID is usually in topic 2 or 3
                    token_id = int(topic_hex, 16)
                    print(f'  -> As token ID: {token_id}')
                    
                    # Check if this is a reasonable token ID (not too large)
                    if token_id < 10000000:  # Reasonable range
                        print(f'  -> VALID token ID: {token_id}')
            except:
                pass
                
            # Try to parse as address (last 20 bytes)
            if len(topic_hex) == 66:  # 32 bytes = 64 hex chars + 0x prefix
                try:
                    address = '0x' + topic_hex[-40:]  # Last 20 bytes
                    print(f'  -> As address: {address}')
                except:
                    pass
        
        # Check data field
        if log.data != '0x':
            print(f'Data: {log.data}')
            
except Exception as e:
    print(f'Error: {e}')