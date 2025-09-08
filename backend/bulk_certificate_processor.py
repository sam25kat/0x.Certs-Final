import sqlite3
import json
from web3 import Web3
from certificate_generator import CertificateGenerator
from email_service import EmailService
import os
from dotenv import load_dotenv
import time

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
            }
        ]
        
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=self.contract_abi
        )

    def get_poa_holders_for_event(self, event_id):
        """Get all participants who have PoA tokens for a specific event"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT p.id, p.name, p.email, p.wallet_address, p.team_name, p.poa_token_id
            FROM participants p
            WHERE p.event_id = ? AND p.poa_status = 'transferred' AND p.poa_token_id IS NOT NULL
        """, (event_id,))
        
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
        
        cursor.execute("SELECT event_name, event_date FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        conn.close()
        
        if event:
            return {"name": event[0], "date": event[1]}
        return None

    def mint_certificate_nft(self, wallet_address, event_id, ipfs_hash):
        """Mint a certificate NFT"""
        try:
            # Get account from private key
            account = self.w3.eth.account.from_key(self.private_key)
            
            # Build transaction
            nonce = self.w3.eth.get_transaction_count(account.address)
            
            transaction = self.contract.functions.mintCertificate(
                wallet_address,
                event_id,
                ipfs_hash
            ).build_transaction({
                'chainId': 31337,  # Local hardhat network
                'gas': 2000000,
                'gasPrice': self.w3.to_wei('20', 'gwei'),
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
            for log in tx_receipt.logs:
                try:
                    # Look for CertificateMinted event
                    if len(log.topics) >= 4:
                        token_id = int(log.topics[2].hex(), 16)
                        break
                except:
                    continue
            
            return {
                "success": True,
                "tx_hash": tx_hash.hex(),
                "token_id": token_id or 0,
                "gas_used": tx_receipt.gasUsed
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

    def process_bulk_certificates(self, event_id):
        """Main function to process all certificates for an event"""
        try:
            print(f"Starting bulk certificate processing for event {event_id}")
            
            # Get event details
            event_details = self.get_event_details(event_id)
            if not event_details:
                return {"success": False, "error": "Event not found"}
            
            # Get PoA holders
            participants = self.get_poa_holders_for_event(event_id)
            if not participants:
                return {"success": False, "error": "No PoA holders found for this event"}
            
            print(f"Found {len(participants)} participants with PoA tokens")
            
            results = []
            email_data = []
            
            for i, participant in enumerate(participants, 1):
                print(f"Processing participant {i}/{len(participants)}: {participant['name']}")
                
                # Generate certificate
                cert_result = self.cert_generator.generate_certificate(
                    participant_name=participant['name'],
                    event_name=event_details['name'],
                    event_date=event_details['date'],
                    participant_email=participant['email'],
                    team_name=participant['team_name']
                )
                
                if not cert_result['success']:
                    results.append({
                        "participant": participant['name'],
                        "step": "certificate_generation",
                        "success": False,
                        "error": cert_result['error']
                    })
                    continue
                
                # Upload to IPFS
                ipfs_result = self.cert_generator.upload_to_ipfs(
                    cert_result['file_path'],
                    {
                        "participant_name": participant['name'],
                        "event_name": event_details['name'],
                        "event_date": event_details['date'],
                        "team_name": participant['team_name']
                    }
                )
                
                if not ipfs_result['success']:
                    results.append({
                        "participant": participant['name'],
                        "step": "ipfs_upload",
                        "success": False,
                        "error": ipfs_result['error']
                    })
                    continue
                
                # Mint NFT
                mint_result = self.mint_certificate_nft(
                    participant['wallet_address'],
                    event_id,
                    ipfs_result['image_hash']
                )
                
                if not mint_result['success']:
                    results.append({
                        "participant": participant['name'],
                        "step": "nft_minting",
                        "success": False,
                        "error": mint_result['error']
                    })
                    continue
                
                # Update database
                self.update_certificate_status(
                    participant['id'],
                    mint_result['token_id'],
                    mint_result['tx_hash'],
                    cert_result['file_path'],
                    ipfs_result
                )
                
                # Prepare email data
                email_data.append({
                    "name": participant['name'],
                    "email": participant['email'],
                    "certificate_path": cert_result['file_path'],
                    "token_id": mint_result['token_id']
                })
                
                results.append({
                    "participant": participant['name'],
                    "success": True,
                    "token_id": mint_result['token_id'],
                    "tx_hash": mint_result['tx_hash'],
                    "certificate_path": cert_result['file_path'],
                    "ipfs_url": ipfs_result['image_url']
                })
                
                # Small delay to avoid overwhelming the network
                time.sleep(2)
            
            # Send bulk emails
            print("Sending certificates via email...")
            email_results = self.email_service.send_bulk_certificate_emails(
                email_data,
                event_details['name'],
                self.contract_address
            )
            
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
    
    # Test with event_id = 8005 (adjust as needed)
    result = processor.process_bulk_certificates(8005)
    print("Bulk processing result:", json.dumps(result, indent=2))