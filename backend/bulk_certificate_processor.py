import sqlite3
import json
from web3 import Web3
from certificate_generator import CertificateGenerator
from email_service import EmailService
import os
from dotenv import load_dotenv
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

load_dotenv()

class BulkCertificateProcessor:
    def __init__(self):
        self.db_path = os.getenv("DB_URL", "certificates.db")
        self.rpc_url = os.getenv("RPC_URL")
        self.private_key = os.getenv("PRIVATE_KEY")
        self.contract_address = os.getenv("CONTRACT_ADDRESS")
        
        # Initialize services
        self.cert_generator = CertificateGenerator()
        self.email_service = EmailService()
        
        # Initialize Web3
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Contract ABI (matches actual deployed contract)
        self.contract_abi = [
            {
                "inputs": [
                    {"internalType": "address", "name": "recipient", "type": "address"},
                    {"internalType": "uint256", "name": "eventId", "type": "uint256"},
                    {"internalType": "string", "name": "ipfsHash", "type": "string"}
                ],
                "name": "mintCertificate",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "address", "name": "recipient", "type": "address"},
                    {"internalType": "uint256", "name": "eventId", "type": "uint256"},
                    {"internalType": "string", "name": "ipfsHash", "type": "string"}
                ],
                "name": "mintCertificateByOwner",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "owner",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "internalType": "address", "name": "recipient", "type": "address"},
                    {"indexed": False, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
                    {"indexed": False, "internalType": "uint256", "name": "eventId", "type": "uint256"},
                    {"indexed": False, "internalType": "string", "name": "ipfsHash", "type": "string"}
                ],
                "name": "CertificateMinted",
                "type": "event"
            }
        ]
        
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=self.contract_abi
        )

    def get_poa_holders_for_event(self, event_id, participant_ids=None):
        """Get participants who have PoA tokens for a specific event, optionally filtered by participant IDs"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if participant_ids:
            # Get specific selected participants with PoA tokens
            placeholders = ','.join('?' for _ in participant_ids)
            query = f"""
                SELECT DISTINCT p.id, p.name, p.email, p.wallet_address, p.team_name, p.poa_token_id
                FROM participants p
                WHERE p.event_id = ? AND p.id IN ({placeholders}) AND p.poa_status = 'transferred' AND p.poa_token_id IS NOT NULL AND p.poa_token_id > 0
            """
            cursor.execute(query, [event_id] + participant_ids)
            print(f"[DEBUG] CERTIFICATES - Querying selected participants: {participant_ids}")
        else:
            # Get all participants with PoA tokens (fallback)
            cursor.execute("""
                SELECT DISTINCT p.id, p.name, p.email, p.wallet_address, p.team_name, p.poa_token_id
                FROM participants p
                WHERE p.event_id = ? AND p.poa_status = 'transferred' AND p.poa_token_id IS NOT NULL AND p.poa_token_id > 0
            """, (event_id,))
            print(f"[DEBUG] CERTIFICATES - Querying all participants for event {event_id}")
        
        participants = cursor.fetchall()
        conn.close()
        
        return [
            {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "wallet_address": row[3],
                "team_name": row[4] or "",
                "poa_token_id": row[5]
            }
            for row in participants
        ]

    def get_event_details(self, event_id):
        """Get event details for certificate generation"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT event_name, event_date, certificate_template_path FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        conn.close()
        
        if event:
            return {"name": event[0], "date": event[1], "template": event[2]}
        return None

    def mint_certificate_nft(self, wallet_address, event_id, ipfs_hash):
        """Mint a certificate NFT"""
        try:
            # Get account from private key
            account = self.w3.eth.account.from_key(self.private_key)
            
            print(f"Minting certificate for {wallet_address}, event {event_id}, IPFS: {ipfs_hash}")
            print(f"Contract: {self.contract_address}")
            print(f"From: {account.address}")
            
            # Check account balance
            balance = self.w3.eth.get_balance(account.address)
            print(f"Account balance: {self.w3.from_wei(balance, 'ether')} ETH")
            
            # Get transaction details and estimate gas
            nonce = self.w3.eth.get_transaction_count(account.address)
            print(f"Nonce: {nonce}")
            
            # Use mintCertificateByOwner function only (as requested by user)
            print("Using mintCertificateByOwner function")
            
            # Try to estimate gas first to catch potential revert
            try:
                gas_estimate = self.contract.functions.mintCertificateByOwner(
                    wallet_address,
                    event_id,
                    ipfs_hash
                ).estimate_gas({'from': account.address})
                print(f"Gas estimate: {gas_estimate}")
            except Exception as gas_error:
                print(f"Gas estimation failed for mintCertificateByOwner: {gas_error}")
                print(f"Account address: {account.address}")
                
                # Check contract owner
                try:
                    contract_owner = self.contract.functions.owner().call()
                    print(f"Contract owner: {contract_owner}")
                    print(f"Is account owner? {account.address.lower() == contract_owner.lower()}")
                except Exception as owner_error:
                    print(f"Could not check contract owner: {owner_error}")
                
                # Check if this is an owner permission issue
                if "revert" in str(gas_error).lower() or "execution reverted" in str(gas_error).lower():
                    print("This might be an owner permission issue or contract requirement not met")
                
                return {
                    "success": False,
                    "error": f"mintCertificateByOwner failed: {str(gas_error)}"
                }
            
            transaction = self.contract.functions.mintCertificateByOwner(
                wallet_address,
                event_id,
                ipfs_hash
            ).build_transaction({
                'chainId': 84532,  # Base Sepolia testnet
                'gas': int(gas_estimate * 1.1),  # Only 10% buffer instead of 2x
                'gasPrice': int(self.w3.eth.gas_price * 1.1),  # Use network gas price + 10%
                'nonce': nonce,
            })
            
            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, private_key=self.private_key)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for confirmation
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            # Extract token ID from transaction logs
            token_id = None
            
            # First try to extract from Transfer event (ERC721 standard)
            for log in tx_receipt.logs:
                try:
                    # Look for Transfer event (ERC721 standard)
                    # Topic 0: Transfer event signature
                    # Topic 1: from address (0x0 for minting)
                    # Topic 2: to address (recipient)
                    # Topic 3: token ID
                    if (len(log.topics) >= 4 and 
                        log.topics[0].hex() == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'):
                        token_id = int(log.topics[3].hex(), 16)
                        print(f"Extracted token ID from Transfer event: {token_id}")
                        break
                except Exception as e:
                    print(f"Failed to extract token ID from log: {e}")
                    continue
            
            # If Transfer event extraction failed, try CertificateMinted event using proper ABI decoding
            if token_id is None:
                try:
                    # Process logs to find CertificateMinted event
                    certificate_logs = self.contract.events.CertificateMinted().process_receipt(tx_receipt)
                    if certificate_logs:
                        # Get the first CertificateMinted event
                        cert_event = certificate_logs[0]
                        token_id = cert_event['args']['tokenId']
                        print(f"Extracted token ID from CertificateMinted event: {token_id}")
                except Exception as e:
                    print(f"Failed to decode CertificateMinted event: {e}")
                    
                    # Fallback: manual parsing of event data
                    for log in tx_receipt.logs:
                        try:
                            if log.address.lower() == self.contract_address.lower():
                                # CertificateMinted event signature: keccak256("CertificateMinted(address,uint256,uint256,string)")
                                cert_minted_signature = '0x2a8d8eae6c0c9a7a0baeb37df4a4f3a5f18c9f0ab5b07f4e7a8b5a5e0d5a1b2c'
                                if len(log.topics) > 0:
                                    # Try to decode the data field for token ID (first 32 bytes after recipient)
                                    if len(log.data) >= 64:  # At least 64 bytes for tokenId + eventId
                                        potential_token_id = int(log.data[2:66], 16)  # Skip 0x, take first 32 bytes
                                        if potential_token_id > 0 and potential_token_id < 10000000:  # Reasonable range
                                            token_id = potential_token_id
                                            print(f"Extracted token ID from manual parsing: {token_id}")
                                            break
                        except Exception as parse_error:
                            print(f"Failed to manually parse event data: {parse_error}")
                            continue
            
            # If transaction succeeded, consider it successful regardless of token ID extraction
            if tx_receipt.status == 1:
                print(f"Certificate NFT minted successfully! Hash: {tx_hash.hex()}")
                
                # Use extracted token ID or generate placeholder if extraction failed
                final_token_id = token_id if token_id is not None else f"minted_{int(time.time())}"
                note = "Certificate minted successfully"
                if token_id is None:
                    note += " - using placeholder token ID"
                else:
                    note += f" - token ID: {token_id}"
                
                return {
                    "success": True,
                    "tx_hash": tx_hash.hex(),
                    "token_id": final_token_id,
                    "gas_used": tx_receipt.gasUsed,
                    "note": note
                }
            else:
                return {
                    "success": False,
                    "error": f"Transaction failed with status {tx_receipt.status}"
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def update_certificate_status(self, participant_id, token_id, tx_hash, certificate_path, ipfs_data):
        """Update participant certificate status in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE participants 
            SET certificate_status = 'completed',
                certificate_token_id = ?,
                certificate_tx_hash = ?,
                certificate_path = ?,
                certificate_ipfs_hash = ?,
                certificate_metadata_uri = ?
            WHERE id = ?
        """, (
            str(token_id),  # Convert to string for large numbers
            tx_hash,
            certificate_path,
            ipfs_data.get('image_hash'),
            ipfs_data.get('metadata_url'),
            participant_id
        ))
        
        conn.commit()
        conn.close()
    
    async def process_single_participant(self, participant, event_details, event_id):
        """Process a single participant certificate in parallel"""
        try:
            print(f"Processing participant: {participant['name']}")
            
            # Generate certificate
            cert_result = await asyncio.to_thread(
                self.cert_generator.generate_certificate,
                participant_name=participant['name'],
                event_name=event_details['name'],
                event_date=event_details['date'],
                participant_email=participant['email'],
                team_name=participant['team_name'],
                template_filename=event_details.get('template')
            )
            
            if not cert_result['success']:
                return {
                    "participant": participant['name'],
                    "step": "certificate_generation",
                    "success": False,
                    "error": cert_result['error']
                }
            
            # Upload to IPFS
            ipfs_result = await asyncio.to_thread(
                self.cert_generator.upload_to_ipfs,
                cert_result['file_path'],
                {
                    "participant_name": participant['name'],
                    "event_name": event_details['name'],
                    "event_date": event_details['date'],
                    "team_name": participant['team_name']
                }
            )
            
            if not ipfs_result['success']:
                return {
                    "participant": participant['name'],
                    "step": "ipfs_upload",
                    "success": False,
                    "error": ipfs_result['error']
                }
            
            # Mint NFT
            mint_result = await asyncio.to_thread(
                self.mint_certificate_nft,
                participant['wallet_address'],
                event_id,
                ipfs_result['metadata_hash']
            )
            
            if not mint_result['success']:
                return {
                    "participant": participant['name'],
                    "step": "nft_minting",
                    "success": False,
                    "error": mint_result['error']
                }
            
            # Update database
            await asyncio.to_thread(
                self.update_certificate_status,
                participant['id'],
                mint_result['token_id'],
                mint_result['tx_hash'],
                cert_result['file_path'],
                ipfs_result
            )
            
            return {
                "participant": participant['name'],
                "success": True,
                "token_id": mint_result['token_id'],
                "tx_hash": mint_result['tx_hash'],
                "certificate_path": cert_result['file_path'],
                "ipfs_url": ipfs_result['image_url'],
                "email_data": {
                    "name": participant['name'],
                    "email": participant['email'],
                    "certificate_path": cert_result['file_path'],
                    "token_id": mint_result['token_id'],
                    "poa_token_id": participant['poa_token_id']
                }
            }
            
        except Exception as e:
            return {
                "participant": participant['name'],
                "step": "processing",
                "success": False,
                "error": str(e)
            }

    async def process_bulk_certificates(self, event_id, participant_ids=None):
        """Main function to process certificates for selected or all participants of an event"""
        # Call the async implementation directly
        return await self._process_bulk_certificates_async(event_id, participant_ids)
    
    async def _process_bulk_certificates_async(self, event_id, participant_ids=None):
        """Async implementation of bulk certificate processing"""
        try:
            print(f"Starting bulk certificate processing for event {event_id}")
            print(f"Participant IDs filter: {participant_ids}")
            
            # Get event details
            event_details = self.get_event_details(event_id)
            if not event_details:
                return {"success": False, "error": "Event not found"}
            
            # Get PoA holders (filtered by participant_ids if provided)
            participants = self.get_poa_holders_for_event(event_id, participant_ids=participant_ids)
            if not participants:
                error_msg = "No PoA holders found for selected participants" if participant_ids else "No PoA holders found for this event"
                return {"success": False, "error": error_msg}
            
            print(f"Found {len(participants)} participants with PoA tokens")
            
            results = []
            email_data = []
            
            # Process participants in parallel with controlled concurrency
            print(f"Processing {len(participants)} participants in parallel...")
            
            # Use semaphore to limit concurrent operations (prevent RPC overload)
            semaphore = asyncio.Semaphore(5)  # Max 5 concurrent operations
            
            async def process_with_semaphore(participant):
                async with semaphore:
                    return await self.process_single_participant(participant, event_details, event_id)
            
            # Create tasks for parallel processing
            tasks = [process_with_semaphore(participant) for participant in participants]
            
            # Execute all tasks in parallel
            parallel_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Separate results and email data
            for result in parallel_results:
                if isinstance(result, Exception):
                    results.append({
                        "participant": "Unknown",
                        "step": "processing",
                        "success": False,
                        "error": str(result)
                    })
                    continue
                    
                if result['success']:
                    results.append({
                        "participant": result['participant'],
                        "success": True,
                        "token_id": result['token_id'],
                        "tx_hash": result['tx_hash'],
                        "certificate_path": result['certificate_path'],
                        "ipfs_url": result['ipfs_url']
                    })
                    email_data.append(result['email_data'])
                else:
                    results.append({
                        "participant": result['participant'],
                        "step": result['step'],
                        "success": False,
                        "error": result['error']
                    })
            
            print(f"Parallel processing completed. {len([r for r in results if r['success']])} successful, {len([r for r in results if not r['success']])} failed")
            
            # Send bulk emails only if there's new data
            if email_data:
                print("Sending certificates via email...")
                email_results = await asyncio.to_thread(
                    self.email_service.send_bulk_certificate_emails,
                    email_data,
                    event_details['name'],
                    self.contract_address
                )
            else:
                print("No new certificates to email.")
                email_results = []
            
            successful_certs = len([r for r in results if r.get('success', False)])
            successful_emails = len([r for r in email_results if r['result']['success']])
            
            return {
                "success": True,
                "summary": {
                    "total_participants": len(participants),
                    "successful_certificates": successful_certs,
                    "successful_emails": successful_emails,
                    "failed_operations": len(participants) - successful_certs
                },
                "certificate_results": results,
                "email_results": email_results
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Test function
if __name__ == "__main__":
    processor = BulkCertificateProcessor()
    
    # Test with event_id = 9642 (adjust as needed)
    result = processor.process_bulk_certificates(9642)
    print("Bulk processing result:", json.dumps(result, indent=2))