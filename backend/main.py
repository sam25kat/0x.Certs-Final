import os
import sqlite3
import hashlib
import random
import string
import smtplib
import json
import requests
import base64
import secrets
import threading
import time
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from io import BytesIO

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from web3 import Web3
from PIL import Image, ImageDraw, ImageFont
from bulk_certificate_processor import BulkCertificateProcessor

load_dotenv()

app = FastAPI(title="Hackathon Certificate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DB_PATH = os.getenv("DB_URL", "certificates.db")
RPC_URL = os.getenv("RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")
PINATA_JWT = os.getenv("PINATA_JWT")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_EMAIL = os.getenv("FROM_EMAIL")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_GROUP_LINK = os.getenv("TELEGRAM_GROUP_LINK")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(RPC_URL)) if RPC_URL else None

CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "eventId", "type": "uint256"}, {"internalType": "string", "name": "eventName", "type": "string"}],
        "name": "createEvent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "eventId", "type": "uint256"}],
        "name": "mintPoA",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address[]", "name": "recipients", "type": "address[]"}, {"internalType": "uint256", "name": "eventId", "type": "uint256"}],
        "name": "bulkMintPoA",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "transferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address[]", "name": "recipients", "type": "address[]"}, {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"}],
        "name": "batchTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "eventId", "type": "uint256"}, {"internalType": "string", "name": "ipfsHash", "type": "string"}],
        "name": "mintCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "eventNames",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "recipient", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "eventId", "type": "uint256"}
        ],
        "name": "PoAMinted",
        "type": "event"
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

# Database setup
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY,
            event_code TEXT UNIQUE NOT NULL,
            event_name TEXT NOT NULL,
            event_date DATE,
            sponsors TEXT,
            description TEXT,
            organizer_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            certificate_template_path TEXT,
            FOREIGN KEY (organizer_id) REFERENCES organizers (id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address TEXT NOT NULL,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            team_name TEXT,
            event_id INTEGER,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            poa_status TEXT DEFAULT 'registered',
            poa_token_id INTEGER,
            poa_minted_at TIMESTAMP,
            poa_transferred_at TIMESTAMP,
            certificate_status TEXT DEFAULT 'not_eligible',
            certificate_token_id INTEGER,
            certificate_minted_at TIMESTAMP,
            certificate_transferred_at TIMESTAMP,
            certificate_ipfs_hash TEXT,
            FOREIGN KEY (event_id) REFERENCES events (id)
        )
    """)
    
    # Create table for verified Telegram users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telegram_verified_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            username TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            verification_token TEXT,
            verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Add new columns to existing participants table if they don't exist
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN poa_status TEXT DEFAULT 'registered'")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN poa_token_id INTEGER")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN poa_minted_at TIMESTAMP")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN poa_transferred_at TIMESTAMP")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN certificate_status TEXT DEFAULT 'not_eligible'")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN certificate_token_id INTEGER")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN certificate_minted_at TIMESTAMP")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE participants ADD COLUMN certificate_transferred_at TIMESTAMP")
    except sqlite3.OperationalError:
        pass
    
    # Migrate existing data
    cursor.execute("UPDATE participants SET poa_status = 'transferred' WHERE poa_minted = TRUE")
    cursor.execute("UPDATE participants SET certificate_status = 'transferred' WHERE certificate_minted = TRUE")
    
    conn.commit()
    conn.close()

# Pydantic models
class OrganizerCreate(BaseModel):
    username: str
    password: str

class EventCreate(BaseModel):
    event_name: str
    event_date: str = None
    sponsors: str = None
    description: str = None

class ParticipantRegister(BaseModel):
    wallet_address: str
    email: str
    name: str
    team_name: str
    event_code: str
    telegram_username: str = None

class TelegramVerification(BaseModel):
    telegram_username: str

# Utility functions
def generate_event_code() -> str:
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def upload_to_pinata(file_bytes: bytes, filename: str) -> str:
    """Upload file to Pinata IPFS"""
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
    }
    
    files = {
        "file": (filename, file_bytes, "image/jpeg")
    }
    
    response = requests.post(url, files=files, headers=headers)
    if response.status_code == 200:
        return response.json()["IpfsHash"]
    else:
        raise Exception(f"Failed to upload to Pinata: {response.text}")

def generate_certificate(template_path: str, participant_name: str, event_name: str, team_name: str = "", event_date: str = "", sponsors: str = "") -> bytes:
    """Generate personalized certificate JPEG"""
    try:
        # Open the template image or create default
        if os.path.exists(template_path) and template_path:
            # Use provided template and overlay text
            image = Image.open(template_path)
            image = image.convert('RGB')
            draw = ImageDraw.Draw(image)
            
            try:
                name_font = ImageFont.truetype("arial.ttf", 40)
                text_font = ImageFont.truetype("arial.ttf", 30)
            except:
                name_font = ImageFont.load_default()
                text_font = ImageFont.load_default()
            
            # Add participant name (adjust position as needed)
            draw.text((600, 400), participant_name, font=name_font, fill='blue', anchor='mm')
            
            # Add event name
            draw.text((600, 500), event_name, font=text_font, fill='green', anchor='mm')
            
            # Add team name if provided
            if team_name:
                draw.text((600, 550), f"Team: {team_name}", font=text_font, fill='black', anchor='mm')
            
            # Add event date if provided
            if event_date:
                draw.text((600, 580), f"Event Date: {event_date}", font=text_font, fill='black', anchor='mm')
            
            # Add sponsors if provided
            if sponsors:
                draw.text((600, 610), f"Sponsored by: {sponsors}", font=text_font, fill='gray', anchor='mm')
        else:
            # Create a default certificate if template doesn't exist
            image = Image.new('RGB', (1200, 800), color='white')
            draw = ImageDraw.Draw(image)
            
            # Add border
            draw.rectangle([(50, 50), (1150, 750)], outline='black', width=3)
            draw.rectangle([(70, 70), (1130, 730)], outline='gold', width=2)
            
            # Add default text
            try:
                title_font = ImageFont.truetype("arial.ttf", 60)
                name_font = ImageFont.truetype("arial.ttf", 40)
                text_font = ImageFont.truetype("arial.ttf", 30)
            except:
                title_font = ImageFont.load_default()
                name_font = ImageFont.load_default()
                text_font = ImageFont.load_default()
            
            # Certificate title
            draw.text((600, 150), "CERTIFICATE", font=title_font, fill='black', anchor='mm')
            draw.text((600, 220), "OF PARTICIPATION", font=text_font, fill='black', anchor='mm')
            
            # This is to certify that
            draw.text((600, 300), "This is to certify that", font=text_font, fill='black', anchor='mm')
            
            # Participant name
            draw.text((600, 380), participant_name, font=name_font, fill='blue', anchor='mm')
            
            # Event participation text
            draw.text((600, 450), f"has successfully participated in", font=text_font, fill='black', anchor='mm')
            draw.text((600, 490), event_name, font=name_font, fill='green', anchor='mm')
            
            # Team name if provided
            if team_name:
                draw.text((600, 530), f"as part of team: {team_name}", font=text_font, fill='black', anchor='mm')
            
            # Event date if provided
            if event_date:
                draw.text((600, 560), f"Event Date: {event_date}", font=text_font, fill='black', anchor='mm')
            else:
                current_date = datetime.now().strftime("%B %d, %Y")
                draw.text((600, 560), f"Awarded on {current_date}", font=text_font, fill='black', anchor='mm')
            
            # Sponsors if provided
            if sponsors:
                draw.text((600, 620), f"Sponsored by: {sponsors}", font=text_font, fill='gray', anchor='mm')
        
        # Convert to bytes
        img_buffer = BytesIO()
        image.save(img_buffer, format='JPEG', quality=95)
        return img_buffer.getvalue()
        
    except Exception as e:
        raise Exception(f"Failed to generate certificate: {str(e)}")

def send_email(to_email: str, subject: str, body: str):
    """Send email via SMTP"""
    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        
    except Exception as e:
        raise Exception(f"Failed to send email: {str(e)}")

def mint_poa_nft(wallet_address: str, event_id: int):
    """Mint Proof of Attendance NFT"""
    if not all([w3, PRIVATE_KEY, CONTRACT_ADDRESS]):
        raise Exception("Web3 not configured properly")
    
    try:
        # Convert wallet address to checksum format
        wallet_address = w3.to_checksum_address(wallet_address)
        
        account = w3.eth.account.from_key(PRIVATE_KEY)
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        
        # Get network info
        network = w3.eth.chain_id
        print(f"Network Chain ID: {network}")
        print(f"Account: {account.address}")
        print(f"Contract: {CONTRACT_ADDRESS}")
        print(f"Recipient (checksum): {wallet_address}")
        
        # Build transaction with proper gas estimation
        gas_estimate = contract.functions.mintPoA(wallet_address, event_id).estimate_gas({'from': account.address})
        
        transaction = contract.functions.mintPoA(wallet_address, event_id).build_transaction({
            'chainId': network,
            'gas': gas_estimate + 50000,  # Add buffer
            'gasPrice': w3.to_wei('1', 'gwei'),  # Lower gas price for localhost
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        print(f"Transaction built: {transaction}")
        
        # Sign and send transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Transaction successful: {receipt}")
        
        return tx_hash.hex()
        
    except Exception as e:
        print(f"Error in mint_poa_nft: {str(e)}")
        raise Exception(f"Failed to mint PoA NFT: {str(e)}")

def get_onchain_participants(event_id: int = None):
    """Get participants from blockchain events"""
    if not all([w3, CONTRACT_ADDRESS]):
        raise Exception("Web3 not configured properly")
    
    try:
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        
        # Get PoA minted events using get_logs
        poa_events = contract.events.PoAMinted.get_logs(
            fromBlock=0,
            toBlock='latest'
        )
        
        # Get Certificate minted events using get_logs
        cert_events = contract.events.CertificateMinted.get_logs(
            fromBlock=0,
            toBlock='latest'
        )
        
        print(f"Found {len(poa_events)} PoA events and {len(cert_events)} certificate events")
        
        # Process participants
        participants = {}
        
        # Process PoA events
        for event in poa_events:
            recipient = event['args']['recipient']
            token_id = event['args']['tokenId']
            evt_id = event['args']['eventId']
            
            # Filter by event ID if specified
            if event_id and evt_id != event_id:
                continue
                
            if recipient not in participants:
                participants[recipient] = {
                    'wallet_address': recipient,
                    'event_id': evt_id,
                    'poa_token_id': token_id,
                    'certificate_token_id': None,
                    'certificate_ipfs': None,
                    'poa_minted': True,
                    'certificate_minted': False
                }
        
        # Process Certificate events
        for event in cert_events:
            recipient = event['args']['recipient']
            token_id = event['args']['tokenId']
            evt_id = event['args']['eventId']
            ipfs_hash = event['args']['ipfsHash']
            
            # Filter by event ID if specified
            if event_id and evt_id != event_id:
                continue
                
            if recipient in participants and participants[recipient]['event_id'] == evt_id:
                participants[recipient]['certificate_token_id'] = token_id
                participants[recipient]['certificate_ipfs'] = ipfs_hash
                participants[recipient]['certificate_minted'] = True
        
        return list(participants.values())
        
    except Exception as e:
        print(f"Error getting on-chain participants: {e}")
        return []

def store_verified_telegram_user(user_id: int, username: str, first_name: str = None, last_name: str = None):
    """Store verified Telegram user in database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        
        # Insert or update user
        cursor.execute("""
            INSERT OR REPLACE INTO telegram_verified_users 
            (user_id, username, first_name, last_name, verification_token, verified_at, last_checked)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (user_id, username, first_name, last_name, verification_token))
        
        conn.commit()
        return verification_token
    finally:
        conn.close()

def get_verified_telegram_user(username: str):
    """Get verified user by username"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT user_id, username, first_name, last_name, verification_token, verified_at
            FROM telegram_verified_users 
            WHERE LOWER(username) = LOWER(?) 
            ORDER BY verified_at DESC 
            LIMIT 1
        """, (username,))
        result = cursor.fetchone()
        
        if result:
            return {
                'user_id': result[0],
                'username': result[1],
                'first_name': result[2],
                'last_name': result[3],
                'verification_token': result[4],
                'verified_at': result[5]
            }
        return None
    finally:
        conn.close()

def send_telegram_message(chat_id: int, text: str):
    """Send message to Telegram user"""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': 'HTML'
        }
        
        response = requests.post(url, json=data, timeout=10)
        return response.json()
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")
        return None

def get_participant_details_from_db(wallet_address: str, event_id: int):
    """Get participant name/email from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Convert to lowercase for database lookup (case-insensitive)
        wallet_address_lower = wallet_address.lower()
        cursor.execute(
            "SELECT name, email, team_name, poa_status, poa_minted_at, poa_transferred_at, certificate_status, certificate_minted_at, certificate_transferred_at FROM participants WHERE LOWER(wallet_address) = ? AND event_id = ?",
            (wallet_address_lower, event_id)
        )
        result = cursor.fetchone()
        if result:
            return {
                'name': result[0],
                'email': result[1], 
                'team_name': result[2],
                'poa_status': result[3],
                'poa_minted_at': result[4],
                'poa_transferred_at': result[5],
                'certificate_status': result[6],
                'certificate_minted_at': result[7],
                'certificate_transferred_at': result[8]
            }
        return None
    finally:
        conn.close()

def mint_certificate_nft(wallet_address: str, event_id: int, ipfs_hash: str):
    """Mint Certificate NFT"""
    if not all([w3, PRIVATE_KEY, CONTRACT_ADDRESS]):
        raise Exception("Web3 not configured properly")
    
    try:
        # Convert wallet address to checksum format
        wallet_address = w3.to_checksum_address(wallet_address)
        
        account = w3.eth.account.from_key(PRIVATE_KEY)
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        
        # Get network info
        network = w3.eth.chain_id
        print(f"Minting certificate for (checksum): {wallet_address}")
        
        # Build transaction with proper gas estimation
        gas_estimate = contract.functions.mintCertificate(wallet_address, event_id, ipfs_hash).estimate_gas({'from': account.address})
        
        transaction = contract.functions.mintCertificate(wallet_address, event_id, ipfs_hash).build_transaction({
            'chainId': network,
            'gas': gas_estimate + 50000,  # Add buffer
            'gasPrice': w3.to_wei('1', 'gwei'),  # Lower gas price for localhost
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        # Sign and send transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Extract token ID from transaction logs
        token_id = None
        
        # First try to extract from Transfer event (ERC721 standard)
        for log in receipt.logs:
            try:
                # Look for Transfer event (ERC721 standard)
                # Topic 0: Transfer event signature
                # Topic 1: from address (0x0 for minting)
                # Topic 2: to address (recipient)
                # Topic 3: token ID
                if (len(log.topics) >= 4 and 
                    log.topics[0].hex() == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'):
                    token_id = int(log.topics[3].hex(), 16)
                    print(f"✅ Extracted token ID from Transfer event: {token_id}")
                    break
            except Exception as e:
                print(f"Failed to extract token ID from log: {e}")
                continue
        
        # If Transfer event extraction failed, try CertificateMinted event
        if token_id is None:
            for log in receipt.logs:
                try:
                    # Look for CertificateMinted event signature
                    # This should have the token ID in the data field or topics
                    if log.address.lower() == CONTRACT_ADDRESS.lower():
                        # Try to decode the data field for token ID
                        if len(log.data) >= 64:  # At least 32 bytes for uint256
                            # First 32 bytes might be token ID
                            potential_token_id = int(log.data[:66], 16)  # 0x + 64 chars
                            if potential_token_id > 0 and potential_token_id < 1000000:  # Reasonable range
                                token_id = potential_token_id
                                print(f"✅ Extracted token ID from event data: {token_id}")
                                break
                except Exception as e:
                    print(f"Failed to extract token ID from event data: {e}")
                    continue
        
        print(f"Certificate NFT minted successfully. TX: {receipt.transactionHash.hex()}, Token ID: {token_id}")
        
        return {
            "tx_hash": tx_hash.hex(),
            "token_id": token_id,
            "receipt": receipt
        }
        
    except Exception as e:
        print(f"Error in mint_certificate_nft: {str(e)}")
        raise Exception(f"Failed to mint Certificate NFT: {str(e)}")

# Bot polling function for background thread
def bot_polling_thread():
    """Background thread to continuously poll for Telegram bot updates"""
    if not TELEGRAM_BOT_TOKEN:
        print("No Telegram bot token configured, skipping bot polling")
        return
    
    print("Starting Telegram bot polling thread...")
    offset = 0
    
    while True:
        try:
            url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates'
            params = {
                'offset': offset,
                'timeout': 30  # Long polling for efficiency
            }
            
            response = requests.get(url, params=params, timeout=35)
            result = response.json()
            
            if result.get('ok'):
                updates = result.get('result', [])
                
                for update in updates:
                    offset = update['update_id'] + 1
                    
                    if 'message' in update:
                        message = update['message']
                        text = message.get('text', '').strip().lower()
                        user = message.get('from', {})
                        chat = message.get('chat', {})
                        
                        # Handle /0xday command
                        if text in ['/0xday', '/0xday@certs0xday_bot']:
                            user_id = user.get('id')
                            username = user.get('username', '')
                            first_name = user.get('first_name', '')
                            last_name = user.get('last_name', '')
                            
                            print(f"Processing /0xday command from user {user_id} (@{username})")
                            
                            # Check if user is in the group
                            try:
                                check_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChatMember"
                                check_params = {
                                    'chat_id': TELEGRAM_CHAT_ID,
                                    'user_id': user_id
                                }
                                
                                check_response = requests.get(check_url, params=check_params, timeout=10)
                                check_result = check_response.json()
                                
                                if check_response.status_code == 200 and check_result.get('ok'):
                                    member_status = check_result.get('result', {}).get('status')
                                    
                                    if member_status in ['member', 'administrator', 'creator']:
                                        # User is verified! Store in database
                                        verification_token = store_verified_telegram_user(
                                            user_id, username, first_name, last_name
                                        )
                                        
                                        response_text = "Welcome to the 0x.Day Community"
                                        
                                        send_telegram_message(user_id, response_text)
                                        print(f"Successfully verified and stored user: @{username} (ID: {user_id})")
                                        
                                    elif member_status in ['left', 'kicked']:
                                        response_text = f"Please join our community first: {TELEGRAM_GROUP_LINK}"
                                        
                                        send_telegram_message(user_id, response_text)
                                        print(f"User @{username} not a member (status: {member_status})")
                                        
                                else:
                                    error_desc = check_result.get('description', 'Unknown error')
                                    print(f"Error checking membership for @{username}: {error_desc}")
                                    
                                    response_text = "Verification error. Please try again."
                                    
                                    send_telegram_message(user_id, response_text)
                                    
                            except Exception as e:
                                print(f"Error during membership verification for @{username}: {e}")
                                
                                response_text = "Technical error. Please try again later."
                                
                                send_telegram_message(user_id, response_text)
            
        except requests.exceptions.Timeout:
            print("Bot polling timeout, retrying...")
            time.sleep(5)
        except requests.exceptions.ConnectionError:
            print("Bot polling connection error, retrying in 10 seconds...")
            time.sleep(10)
        except Exception as e:
            print(f"Bot polling error: {e}")
            time.sleep(10)

# API endpoints
@app.on_event("startup")
async def startup_event():
    init_db()
    print("Database initialized")
    
    # Start bot polling in background thread
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        print(f"Telegram config found - Token: {TELEGRAM_BOT_TOKEN[:10]}... Chat ID: {TELEGRAM_CHAT_ID}")
        bot_thread = threading.Thread(target=bot_polling_thread, daemon=True)
        bot_thread.start()
        print("Telegram bot polling thread started successfully!")
    else:
        print("Telegram bot not configured, skipping polling thread")
        print(f"TELEGRAM_BOT_TOKEN: {'Found' if TELEGRAM_BOT_TOKEN else 'Missing'}")
        print(f"TELEGRAM_CHAT_ID: {'Found' if TELEGRAM_CHAT_ID else 'Missing'}")

@app.post("/create_organizer")
async def create_organizer(organizer: OrganizerCreate):
    """Create a new organizer account"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(organizer.password)
        cursor.execute(
            "INSERT INTO organizers (username, password_hash) VALUES (?, ?)",
            (organizer.username, password_hash)
        )
        conn.commit()
        organizer_id = cursor.lastrowid
        
        return {"message": "Organizer created successfully", "organizer_id": organizer_id}
        
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        conn.close()

@app.post("/create_event")
async def create_event(event: EventCreate, organizer_id: int = 1):
    """Create a new event and generate 6-digit code"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Generate unique event code
        while True:
            event_code = generate_event_code()
            cursor.execute("SELECT id FROM events WHERE event_code = ?", (event_code,))
            if not cursor.fetchone():
                break
        
        # Generate event ID
        event_id = random.randint(1000, 9999)
        while True:
            cursor.execute("SELECT id FROM events WHERE id = ?", (event_id,))
            if not cursor.fetchone():
                break
            event_id = random.randint(1000, 9999)
        
        cursor.execute(
            "INSERT INTO events (id, event_code, event_name, event_date, sponsors, description, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event_id, event_code, event.event_name, event.event_date, event.sponsors, event.description, organizer_id)
        )
        conn.commit()
        
        # Create event on blockchain if configured
        if w3 and CONTRACT_ADDRESS:
            try:
                account = w3.eth.account.from_key(PRIVATE_KEY)
                contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
                
                # Get network info
                network = w3.eth.chain_id
                
                # Build transaction with proper gas estimation
                gas_estimate = contract.functions.createEvent(event_id, event.event_name).estimate_gas({'from': account.address})
                
                transaction = contract.functions.createEvent(event_id, event.event_name).build_transaction({
                    'chainId': network,
                    'gas': gas_estimate + 20000,  # Add buffer
                    'gasPrice': w3.to_wei('1', 'gwei'),  # Lower gas price for localhost
                    'nonce': w3.eth.get_transaction_count(account.address),
                })
                
                signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
                tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
                
                # Wait for confirmation
                receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
                print(f"Event created on blockchain: {receipt}")
                
            except Exception as e:
                print(f"Blockchain event creation failed: {e}")
        
        return {
            "event_id": event_id,
            "event_code": event_code,
            "event_name": event.event_name,
            "message": "Event created successfully"
        }
        
    finally:
        conn.close()

@app.post("/register_participant")
async def register_participant(participant: ParticipantRegister):
    """Register a participant and mint PoA NFT"""
    print(f"Registration attempt: {participant.wallet_address} for event code: {participant.event_code}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Validate event code
        cursor.execute(
            "SELECT id, event_name FROM events WHERE event_code = ? AND is_active = TRUE",
            (participant.event_code,)
        )
        event = cursor.fetchone()
        
        if not event:
            print(f"Invalid event code: {participant.event_code}")
            raise HTTPException(status_code=404, detail=f"Invalid event code: {participant.event_code}")
        
        event_id, event_name = event
        print(f"Found event: {event_name} (ID: {event_id})")
        
        # Check if participant already registered
        cursor.execute(
            "SELECT id, poa_minted FROM participants WHERE wallet_address = ? AND event_id = ?",
            (participant.wallet_address, event_id)
        )
        
        existing = cursor.fetchone()
        if existing:
            participant_id, poa_minted = existing
            print(f"ℹ️ User already registered: {participant.wallet_address}")
            return {
                "message": f"Already registered for '{event_name}'. Use frontend to mint your PoA NFT.",
                "participant_id": participant_id,
                "event_name": event_name,
                "event_id": event_id,
                "poa_minted": poa_minted,
                "registration_complete": True
            }
        
        # Register new participant
        print(f"📝 Registering new participant: {participant.name}")
        cursor.execute(
            """INSERT INTO participants 
               (wallet_address, email, name, team_name, event_id, telegram_username, telegram_verified, telegram_verified_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (participant.wallet_address, participant.email, participant.name, participant.team_name, event_id, 
             participant.telegram_username, 1 if participant.telegram_username else 0, 
             datetime.now() if participant.telegram_username else None)
        )
        
        participant_id = cursor.lastrowid
        print(f"Participant registered with ID: {participant_id}")
        
        # Just save participant registration - NFT minting will happen on frontend
        conn.commit()
        
        print(f"Participant registered successfully - ready for NFT minting")
        return {
            "message": "Registration successful - please mint PoA NFT",
            "participant_id": participant_id,
            "event_name": event_name,
            "event_id": event_id,
            "requires_nft_mint": True
        }
            
    finally:
        conn.close()

@app.post("/telegram/webhook")
async def telegram_webhook(update: dict):
    """Handle Telegram bot webhook updates"""
    try:
        # Check if this is a message update
        if 'message' not in update:
            return {"ok": True}
        
        message = update['message']
        
        # Check if message has text and is from a user (not a bot)
        if 'text' not in message or message.get('from', {}).get('is_bot', False):
            return {"ok": True}
        
        text = message['text'].strip()
        user = message['from']
        chat = message['chat']
        
        # Handle /0xday command
        if text.lower() in ['/0xday', '/0xday@certs0xday_bot']:
            user_id = user['id']
            username = user.get('username', '')
            first_name = user.get('first_name', '')
            last_name = user.get('last_name', '')
            
            print(f"Processing /0xday command from user {user_id} (@{username})")
            
            # Handle verification in both private chat and group
            if chat['type'] == 'private' or (chat['type'] in ['group', 'supergroup'] and chat.get('id') == int(TELEGRAM_CHAT_ID)):
                # Verify user is actually in the group
                try:
                    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChatMember"
                    params = {
                        'chat_id': TELEGRAM_CHAT_ID,
                        'user_id': user_id
                    }
                    
                    response = requests.get(url, params=params, timeout=10)
                    result = response.json()
                    
                    if response.status_code == 200 and result.get('ok'):
                        member_status = result.get('result', {}).get('status')
                        
                        if member_status in ['member', 'administrator', 'creator']:
                            # User is verified! Store in database
                            verification_token = store_verified_telegram_user(
                                user_id, username, first_name, last_name
                            )
                            
                            response_text = f"""✅ <b>Verification Successful!</b>
                            
Hello {first_name}! Your Telegram account has been verified for 0x.day events.

📝 <b>Your Details:</b>
• Username: @{username}
• Status: Verified Member

🎯 <b>Next Steps:</b>
1. Visit our event registration page
2. Enter your username: <code>{username}</code>
3. Complete your event registration

🔒 Your verification is valid for all 0x.day events.
💡 You can verify by messaging /0xday in the group or privately to this bot."""
                            
                            send_telegram_message(user_id, response_text)
                            
                        elif member_status in ['left', 'kicked']:
                            response_text = f"""❌ <b>Verification Failed</b>
                            
Sorry {first_name}, you're not currently a member of our community.

🔗 <b>Join our community first:</b>
{TELEGRAM_GROUP_LINK}

After joining, send /0xday again to verify."""
                            
                            send_telegram_message(user_id, response_text)
                            
                    else:
                        error_desc = result.get('description', 'Unknown error')
                        print(f"Error checking membership: {error_desc}")
                        
                        response_text = f"""❌ <b>Verification Error</b>
                        
Sorry {first_name}, there was an issue verifying your membership.

Please try again in a few moments, or contact support if the issue persists."""
                        
                        send_telegram_message(user_id, response_text)
                        
                except Exception as e:
                    print(f"Error during membership verification: {e}")
                    
                    response_text = f"""❌ <b>Technical Error</b>
                    
Sorry {first_name}, there was a technical issue.

Please try again later or contact support."""
                    
                    send_telegram_message(user_id, response_text)
            
            else:
                # Message sent in group - just acknowledge
                response_text = f"Hi {first_name}! Please send me /0xday in a private message to verify your account."
                send_telegram_message(user_id, response_text)
        
        return {"ok": True}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"ok": False, "error": str(e)}

@app.post("/verify-telegram-membership")
async def verify_telegram_membership(verification: TelegramVerification):
    """Verify if a user is a member of the Telegram group using stored verification data"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        raise HTTPException(status_code=500, detail="Telegram configuration is missing")
    
    telegram_username = verification.telegram_username.strip()
    if telegram_username.startswith('@'):
        telegram_username = telegram_username[1:]
    
    if not telegram_username:
        raise HTTPException(status_code=400, detail="Telegram username is required")
    
    print(f"Verifying Telegram user: @{telegram_username}")
    
    try:
        # Step 1: Check if user exists in our verified users database
        verified_user = get_verified_telegram_user(telegram_username)
        
        if not verified_user:
            raise HTTPException(
                status_code=400,
                detail=f"User @{telegram_username} not found in our verified members list. Please join our Telegram community and message /0xday in the group to verify your membership first."
            )
        
        print(f"Found verified user: {verified_user['user_id']}")
        
        # Step 2: Double-check current membership status using stored user_id
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChatMember"
        params = {
            'chat_id': TELEGRAM_CHAT_ID,
            'user_id': verified_user['user_id']
        }
        
        response = requests.get(url, params=params, timeout=15)
        result = response.json()
        
        if response.status_code == 200 and result.get('ok'):
            member_status = result.get('result', {}).get('status')
            
            if member_status in ['member', 'administrator', 'creator']:
                # Update last_checked timestamp
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "UPDATE telegram_verified_users SET last_checked = CURRENT_TIMESTAMP WHERE user_id = ?",
                        (verified_user['user_id'],)
                    )
                    conn.commit()
                finally:
                    conn.close()
                
                print(f"Verification successful for @{telegram_username} (status: {member_status})")
                
                return {
                    "verified": True,
                    "message": "Telegram membership verified successfully",
                    "username": telegram_username,
                    "verified_at": verified_user['verified_at'],
                    "member_status": member_status
                }
                
            elif member_status in ['left', 'kicked']:
                # Remove from verified users since they left
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                try:
                    cursor.execute("DELETE FROM telegram_verified_users WHERE user_id = ?", (verified_user['user_id'],))
                    conn.commit()
                finally:
                    conn.close()
                
                raise HTTPException(
                    status_code=400,
                    detail=f"User @{telegram_username} is no longer a member of our Telegram community. Please rejoin and verify again."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"User @{telegram_username} has status '{member_status}' in our community."
                )
        else:
            error_description = result.get('description', 'Unknown error')
            print(f"API Error checking membership: {error_description}")
            
            if 'user not found' in error_description.lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Telegram user @{telegram_username} not found. Please check if your account still exists."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail="Technical error verifying membership. Please try again later."
                )
                
    except requests.exceptions.Timeout:
        print("Request timed out")
        raise HTTPException(
            status_code=500,
            detail="Request to Telegram API timed out. Please try again."
        )
    except requests.exceptions.ConnectionError:
        print("Connection error")
        raise HTTPException(
            status_code=500,
            detail="Failed to connect to Telegram API. Please check your internet connection."
        )
    except requests.exceptions.RequestException as e:
        print(f"Request exception: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Telegram API: {str(e)}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during verification: {str(e)}"
        )

@app.post("/confirm_poa_mint")
async def confirm_poa_mint(request: dict):
    """Confirm that PoA NFT was minted from frontend"""
    wallet_address = request.get("wallet_address")
    event_id = request.get("event_id")
    tx_hash = request.get("tx_hash")
    
    if not all([wallet_address, event_id, tx_hash]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Update participant record
        cursor.execute(
            "UPDATE participants SET poa_minted = TRUE WHERE wallet_address = ? AND event_id = ?",
            (wallet_address, event_id)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Participant not found")
            
        conn.commit()
        
        print(f"PoA mint confirmed for {wallet_address} - TX: {tx_hash}")
        return {
            "message": "PoA NFT mint confirmed",
            "tx_hash": tx_hash
        }
        
    finally:
        conn.close()

@app.post("/bulk_mint_poa/{event_id}")
async def bulk_mint_poa(event_id: int, request: dict):
    """Bulk mint PoA NFTs for all registered participants of an event"""
    organizer_wallet = request.get("organizer_wallet")
    
    print(f"🎯 BULK MINT DEBUG - Received organizer_wallet: {organizer_wallet}")
    
    if not organizer_wallet:
        raise HTTPException(status_code=400, detail="Organizer wallet address required")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get all registered participants for this event
        cursor.execute(
            "SELECT wallet_address, name FROM participants WHERE event_id = ? AND poa_status = 'registered'",
            (event_id,)
        )
        participants = cursor.fetchall()
        
        if not participants:
            raise HTTPException(status_code=404, detail="No registered participants found")
        
        # Get event name for NFT metadata
        cursor.execute("SELECT event_name FROM events WHERE id = ?", (event_id,))
        event_result = cursor.fetchone()
        if not event_result:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name = event_result[0]
        
        # For bulk mint, mint all NFTs to the organizer first
        # They will be transferred to participants later via batch transfer
        try:
            organizer_checksum = w3.to_checksum_address(organizer_wallet)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid organizer wallet address: {e}")
        
        # Create array of organizer addresses (one for each participant)
        recipient_addresses = [organizer_checksum] * len(participants)
        
        # Return data for frontend to execute bulk mint transaction
        return {
            "message": f"Ready to bulk mint {len(participants)} PoA NFTs",
            "event_id": event_id,
            "event_name": event_name,
            "recipients": recipient_addresses,
            "participant_count": len(participants),
            "organizer_wallet": organizer_wallet
        }
        
    finally:
        conn.close()

@app.post("/confirm_bulk_mint_poa")
async def confirm_bulk_mint_poa(request: dict):
    """Confirm that bulk PoA NFTs were minted"""
    event_id = request.get("event_id")
    tx_hash = request.get("tx_hash")
    token_ids = request.get("token_ids", [])
    
    if not all([event_id, tx_hash]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get all registered participants for this event
        cursor.execute(
            "SELECT id, wallet_address FROM participants WHERE event_id = ? AND poa_status = 'registered' ORDER BY id",
            (event_id,)
        )
        participants = cursor.fetchall()
        
        # Update each participant's status to minted
        for i, (participant_id, wallet_address) in enumerate(participants):
            token_id = token_ids[i] if i < len(token_ids) else None
            
            cursor.execute(
                "UPDATE participants SET poa_status = 'minted', poa_token_id = ?, poa_minted_at = CURRENT_TIMESTAMP WHERE id = ?",
                (token_id, participant_id)
            )
        
        conn.commit()
        
        print(f"Bulk PoA mint confirmed for {len(participants)} participants - TX: {tx_hash}")
        return {
            "message": f"Bulk PoA NFT mint confirmed for {len(participants)} participants",
            "tx_hash": tx_hash,
            "participants_updated": len(participants)
        }
        
    finally:
        conn.close()

@app.post("/batch_transfer_poa/{event_id}")
async def batch_transfer_poa(event_id: int, request: dict):
    """Batch transfer PoA NFTs from organizer to participants"""
    organizer_wallet = request.get("organizer_wallet")
    
    if not organizer_wallet:
        raise HTTPException(status_code=400, detail="Organizer wallet address required")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get all minted but not transferred participants
        cursor.execute(
            "SELECT wallet_address, poa_token_id, name FROM participants WHERE event_id = ? AND poa_status = 'minted' AND poa_token_id IS NOT NULL",
            (event_id,)
        )
        participants = cursor.fetchall()
        
        if not participants:
            # Check if event exists
            cursor.execute("SELECT COUNT(*) FROM events WHERE id = ?", (event_id,))
            event_exists = cursor.fetchone()[0] > 0
            
            if not event_exists:
                raise HTTPException(status_code=404, detail=f"Event ID {event_id} not found")
            
            # Check all participants for this event
            cursor.execute("SELECT wallet_address, poa_status, poa_token_id FROM participants WHERE event_id = ?", (event_id,))
            all_participants = cursor.fetchall()
            
            if not all_participants:
                raise HTTPException(status_code=404, detail=f"No participants found for event {event_id}")
            
            # Analyze why no minted participants
            status_counts = {}
            missing_token_count = 0
            for p in all_participants:
                status = p[1]  # poa_status
                token_id = p[2]  # poa_token_id
                status_counts[status] = status_counts.get(status, 0) + 1
                if status == 'minted' and token_id is None:
                    missing_token_count += 1
            
            error_msg = f"No PoA NFTs ready for transfer. Participant statuses: {status_counts}"
            if missing_token_count > 0:
                error_msg += f". {missing_token_count} participants have 'minted' status but missing token IDs."
            
            raise HTTPException(status_code=404, detail=error_msg)
        
        recipients = []
        token_ids = []
        
        for wallet_address, token_id, name in participants:
            # Convert to checksum format
            try:
                checksum_address = w3.to_checksum_address(wallet_address)
                recipients.append(checksum_address)
                token_ids.append(token_id)
            except Exception as e:
                print(f"Warning: Invalid wallet address {wallet_address}: {e}")
                continue
        
        print(f"🔄 Batch transfer for event {event_id}:")
        print(f"   - Organizer: {organizer_wallet}")
        print(f"   - Recipients: {recipients}")
        print(f"   - Token IDs: {token_ids}")
        
        return {
            "message": f"Ready to transfer {len(participants)} PoA NFTs",
            "event_id": event_id,
            "recipients": recipients,
            "token_ids": token_ids,
            "transfer_count": len(participants),
            "organizer_wallet": organizer_wallet
        }
        
    finally:
        conn.close()

@app.post("/confirm_batch_transfer_poa")
async def confirm_batch_transfer_poa(request: dict):
    """Confirm that PoA NFTs were batch transferred"""
    event_id = request.get("event_id")
    tx_hash = request.get("tx_hash")
    
    if not all([event_id, tx_hash]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Update all minted participants to transferred status
        cursor.execute(
            "UPDATE participants SET poa_status = 'transferred', poa_transferred_at = CURRENT_TIMESTAMP WHERE event_id = ? AND poa_status = 'minted'",
            (event_id,)
        )
        
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"Batch PoA transfer confirmed for {updated_count} participants - TX: {tx_hash}")
        return {
            "message": f"Batch PoA NFT transfer confirmed for {updated_count} participants",
            "tx_hash": tx_hash,
            "participants_updated": updated_count
        }
        
    finally:
        conn.close()

@app.post("/upload_template/{event_id}")
async def upload_template(event_id: int, file: UploadFile = File(...)):
    """Upload certificate template for an event"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create uploads directory if it doesn't exist
    os.makedirs("uploads", exist_ok=True)
    
    # Save template file
    template_path = f"uploads/template_{event_id}.jpg"
    
    try:
        content = await file.read()
        
        # Convert to JPEG if needed
        image = Image.open(BytesIO(content))
        image = image.convert('RGB')
        image.save(template_path, 'JPEG', quality=95)
        
        # Update event record
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE events SET certificate_template_path = ? WHERE id = ?",
            (template_path, event_id)
        )
        conn.commit()
        conn.close()
        
        return {"message": "Template uploaded successfully", "template_path": template_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/generate_certificates/{event_id}")
async def generate_certificates(event_id: int):
    """Generate certificates for all participants of an event"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get event details
        cursor.execute(
            "SELECT event_name, event_date, sponsors, certificate_template_path FROM events WHERE id = ?",
            (event_id,)
        )
        event = cursor.fetchone()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name, event_date, sponsors, template_path = event
        
        # Get all participants for this event
        cursor.execute(
            """SELECT id, wallet_address, email, name, team_name 
               FROM participants 
               WHERE event_id = ? AND poa_minted = TRUE AND certificate_minted = FALSE""",
            (event_id,)
        )
        
        participants = cursor.fetchall()
        
        if not participants:
            return {"message": "No eligible participants found"}
        
        successful_certificates = 0
        failed_certificates = 0
        
        for participant in participants:
            participant_id, wallet_address, email, name, team_name = participant
            
            try:
                # Generate certificate JPEG
                cert_bytes = generate_certificate(
                    template_path or "", name, event_name, team_name or "", 
                    event_date or "", sponsors or ""
                )
                
                # Upload to IPFS
                filename = f"certificate_{name.replace(' ', '_')}_{event_id}.jpg"
                ipfs_hash = upload_to_pinata(cert_bytes, filename)
                
                # Mint certificate NFT
                mint_result = mint_certificate_nft(wallet_address, event_id, ipfs_hash)
                
                # Update participant record with token ID
                cursor.execute(
                    """UPDATE participants 
                       SET certificate_minted = TRUE, certificate_ipfs_hash = ?, 
                           certificate_token_id = ?, certificate_status = 'completed'
                       WHERE id = ?""",
                    (ipfs_hash, mint_result.get('token_id'), participant_id)
                )
                
                successful_certificates += 1
                
            except Exception as e:
                print(f"Failed to generate certificate for {name}: {e}")
                failed_certificates += 1
        
        conn.commit()
        
        return {
            "message": "Certificate generation completed",
            "successful": successful_certificates,
            "failed": failed_certificates
        }
        
    finally:
        conn.close()

@app.post("/send_emails/{event_id}")
async def send_emails(event_id: int):
    """Send certificate emails to all participants"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get event details
        cursor.execute("SELECT event_name FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name = event[0]
        
        # Get participants with certificates
        cursor.execute(
            """SELECT name, email, certificate_ipfs_hash, certificate_token_id, wallet_address
               FROM participants 
               WHERE event_id = ? AND certificate_minted = TRUE""",
            (event_id,)
        )
        
        participants = cursor.fetchall()
        
        if not participants:
            return {"message": "No participants with certificates found"}
        
        successful_emails = 0
        failed_emails = 0
        
        for participant in participants:
            name, email, ipfs_hash, token_id, wallet_address = participant
            
            try:
                # Create email content
                subject = f"🎉 Your {event_name} Certificate NFT is Ready!"
                
                ipfs_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
                
                body = f"""
                <html>
                <body>
                    <h2>Congratulations {name}! 🎉</h2>
                    <p>Your certificate for <strong>{event_name}</strong> has been generated and minted as an NFT.</p>
                    
                    <h3>📜 CERTIFICATE DETAILS:</h3>
                    <ul>
                        <li><strong>Event:</strong> {event_name}</li>
                        <li><strong>Participant:</strong> {name}</li>
                        <li><strong>Certificate Type:</strong> NFT (Non-Fungible Token)</li>
                    </ul>
                    
                    <h3>🔗 NFT DETAILS:</h3>
                    <ul>
                        <li><strong>Contract Address:</strong> {CONTRACT_ADDRESS}</li>
                        <li><strong>Token ID:</strong> {token_id if token_id else 'Processing...'}</li>
                        <li><strong>Your Wallet:</strong> {wallet_address}</li>
                    </ul>
                    
                    <h3>📱 HOW TO ADD TO YOUR WALLET:</h3>
                    
                    <h4>For MetaMask:</h4>
                    <ol>
                        <li>Open MetaMask wallet</li>
                        <li>Go to NFTs tab</li>
                        <li>Click "Import NFT"</li>
                        <li>Enter Contract Address: <code>{CONTRACT_ADDRESS}</code></li>
                        <li>Enter Token ID: <code>{token_id if token_id else 'Contact organizer'}</code></li>
                        <li>Click "Import"</li>
                    </ol>
                    
                    <h4>For other wallets:</h4>
                    <ol>
                        <li>Look for "Add NFT" or "Import Token" option</li>
                        <li>Select "NFT" or "ERC-721" token type</li>
                        <li>Enter the contract address and token ID above</li>
                    </ol>
                    
                    <h3>📎 CERTIFICATE DOWNLOAD:</h3>
                    <p><a href="{ipfs_url}" target="_blank" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Certificate (IPFS)</a></p>
                    
                    <h3>🎯 WHAT'S NEXT:</h3>
                    <ul>
                        <li>Add the NFT to your wallet using the instructions above</li>
                        <li>Share your achievement on social media</li>
                        <li>Keep this certificate as proof of your participation</li>
                    </ul>
                    
                    <p>Thank you for being part of {event_name}! 🚀</p>
                    
                    <hr>
                    <p><small>This is an automated message. Please do not reply to this email.<br>
                    If you need assistance, please contact the event organizers.</small></p>
                </body>
                </html>
                """
                
                send_email(email, subject, body)
                successful_emails += 1
                
            except Exception as e:
                print(f"Failed to send email to {email}: {e}")
                failed_emails += 1
        
        return {
            "message": "Email sending completed",
            "successful": successful_emails,
            "failed": failed_emails
        }
        
    finally:
        conn.close()

@app.get("/events")
async def get_events():
    """Get all events"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """SELECT id, event_code, event_name, event_date, sponsors, description, created_at, is_active 
               FROM events ORDER BY created_at DESC"""
        )
        
        events = []
        for row in cursor.fetchall():
            events.append({
                "id": row[0],
                "event_code": row[1],
                "event_name": row[2],
                "event_date": row[3],
                "sponsors": row[4],
                "description": row[5],
                "created_at": row[6],
                "is_active": row[7]
            })
        
        return {"events": events}
        
    finally:
        conn.close()

@app.get("/participants/{event_id}")
async def get_participants(event_id: int):
    """Get all participants for an event from database with blockchain enrichment"""
    print(f"Getting participants for event ID: {event_id}")
    
    try:
        # Start with all database participants (including those who are just registered)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            """SELECT wallet_address, name, email, team_name, poa_status, poa_token_id, 
                      poa_minted_at, poa_transferred_at, certificate_status, certificate_token_id,
                      certificate_minted_at, certificate_transferred_at, certificate_ipfs_hash
               FROM participants WHERE event_id = ?""",
            (event_id,)
        )
        db_participants = cursor.fetchall()
        conn.close()
        
        print(f"Found {len(db_participants)} participants in database")
        
        # Get blockchain data for enrichment
        try:
            onchain_participants = get_onchain_participants(event_id)
            print(f"Found {len(onchain_participants)} on-chain participants")
            
            # Create a lookup dict for blockchain data
            onchain_lookup = {}
            for p in onchain_participants:
                onchain_lookup[p['wallet_address'].lower()] = p
                
        except Exception as e:
            print(f"Warning: Error getting blockchain data: {e}")
            onchain_lookup = {}
        
        # Build enriched participant list
        enriched_participants = []
        
        for db_participant in db_participants:
            wallet_address = db_participant[0]
            
            # Get blockchain data if available
            blockchain_data = onchain_lookup.get(wallet_address.lower(), {})
            
            enriched_participant = {
                "wallet_address": wallet_address,
                "event_id": event_id,
                "name": db_participant[1] or 'Unknown',
                "email": db_participant[2] or 'Unknown',
                "team_name": db_participant[3],
                "poa_status": db_participant[4] or 'registered',
                "poa_token_id": db_participant[5] or blockchain_data.get('poa_token_id'),
                "poa_minted_at": db_participant[6],
                "poa_transferred_at": db_participant[7],
                "poa_minted": blockchain_data.get('poa_minted', False),
                "certificate_status": db_participant[8] or 'not_eligible',
                "certificate_token_id": db_participant[9] or blockchain_data.get('certificate_token_id'),
                "certificate_minted_at": db_participant[10],
                "certificate_transferred_at": db_participant[11],
                "certificate_minted": blockchain_data.get('certificate_minted', False),
                "certificate_ipfs": db_participant[12] or blockchain_data.get('certificate_ipfs')
            }
            
            enriched_participants.append(enriched_participant)
        
        print(f"Returning {len(enriched_participants)} enriched participants")
        return {"participants": enriched_participants}
        
    except Exception as e:
        print(f"Error getting participants: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching participants: {str(e)}")

@app.get("/participants/onchain/{event_id}")
async def get_onchain_participants_only(event_id: int):
    """Get participants directly from blockchain (raw data)"""
    try:
        participants = get_onchain_participants(event_id)
        return {"participants": participants, "source": "blockchain"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching on-chain participants: {str(e)}")

@app.get("/participants/all")
async def get_all_participants():
    """Get all participants from all events (on-chain data)"""
    try:
        participants = get_onchain_participants()  # No event filter
        
        # Group by event
        by_event = {}
        for participant in participants:
            event_id = participant['event_id']
            if event_id not in by_event:
                by_event[event_id] = []
            
            # Enrich with DB details
            db_details = get_participant_details_from_db(participant['wallet_address'], event_id)
            participant_data = {**participant}
            if db_details:
                participant_data.update(db_details)
            
            by_event[event_id].append(participant_data)
        
        return {"participants_by_event": by_event, "total_participants": len(participants)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching all participants: {str(e)}")

@app.delete("/clear_participant/{wallet_address}")
async def clear_participant(wallet_address: str, event_code: str = None):
    """Clear participant registration for testing purposes"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        if event_code:
            # Clear for specific event
            cursor.execute(
                "SELECT id FROM events WHERE event_code = ?",
                (event_code,)
            )
            event = cursor.fetchone()
            
            if event:
                event_id = event[0]
                cursor.execute(
                    "DELETE FROM participants WHERE wallet_address = ? AND event_id = ?",
                    (wallet_address, event_id)
                )
                deleted = cursor.rowcount
                conn.commit()
                return {"message": f"Cleared {deleted} registrations for wallet {wallet_address} in event {event_code}"}
            else:
                raise HTTPException(status_code=404, detail="Event not found")
        else:
            # Clear all registrations for wallet
            cursor.execute(
                "DELETE FROM participants WHERE wallet_address = ?",
                (wallet_address,)
            )
            deleted = cursor.rowcount
            conn.commit()
            return {"message": f"Cleared {deleted} total registrations for wallet {wallet_address}"}
            
    finally:
        conn.close()

@app.get("/debug/participants")
async def debug_participants():
    """Debug endpoint to see all participants"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """SELECT p.wallet_address, p.name, p.email, e.event_name, e.event_code, p.poa_minted
               FROM participants p 
               JOIN events e ON p.event_id = e.id
               ORDER BY p.registered_at DESC"""
        )
        
        participants = []
        for row in cursor.fetchall():
            participants.append({
                "wallet": row[0],
                "name": row[1], 
                "email": row[2],
                "event": row[3],
                "event_code": row[4],
                "poa_minted": row[5]
            })
        
        return {"participants": participants}
        
    finally:
        conn.close()

@app.get("/config")
async def get_config():
    """Get frontend configuration"""
    return {
        "contract_address": CONTRACT_ADDRESS,
        "rpc_url": RPC_URL if RPC_URL and "localhost" in RPC_URL else "http://127.0.0.1:8545",
        "chain_id": 31337
    }

@app.get("/debug/blockchain")
async def debug_blockchain():
    """Debug blockchain connection and contract"""
    debug_info = {
        "web3_connected": False,
        "contract_configured": False,
        "network_info": None,
        "contract_address": CONTRACT_ADDRESS,
        "block_number": None,
        "error": None
    }
    
    try:
        if w3:
            debug_info["web3_connected"] = w3.isConnected()
            debug_info["block_number"] = w3.eth.block_number
            debug_info["network_info"] = {
                "chain_id": w3.eth.chain_id,
                "is_connected": w3.isConnected()
            }
            
            if CONTRACT_ADDRESS:
                debug_info["contract_configured"] = True
                # Test contract call
                contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
                # Try to get event name for event 1 (will fail if no events, but that's OK)
                try:
                    test_call = contract.functions.eventNames(1).call()
                    debug_info["contract_test"] = "success"
                except:
                    debug_info["contract_test"] = "contract deployed but no events yet"
            else:
                debug_info["error"] = "CONTRACT_ADDRESS not configured"
        else:
            debug_info["error"] = "Web3 not initialized - check RPC_URL"
            
    except Exception as e:
        debug_info["error"] = str(e)
    
    return debug_info

@app.get("/participant_status/{wallet_address}")
async def get_participant_status(wallet_address: str):
    """Get participant status from blockchain for a specific wallet"""
    try:
        if not all([w3, CONTRACT_ADDRESS]):
            return {"error": "Blockchain not configured"}
        
        # Convert wallet address to checksum format
        wallet_address = w3.to_checksum_address(wallet_address)
        print(f"Getting participant status for (checksum): {wallet_address}")
            
        # Get all PoA events for this wallet
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        
        # Get all PoA events for this wallet using getLogs
        poa_events = contract.events.PoAMinted.get_logs(
            fromBlock=0,
            toBlock='latest',
            argument_filters={'recipient': wallet_address}
        )
        
        # Get all Certificate events for this wallet using getLogs  
        cert_events = contract.events.CertificateMinted.get_logs(
            fromBlock=0,
            toBlock='latest',
            argument_filters={'recipient': wallet_address}
        )
        
        # Get database status for all events this wallet is registered for
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """SELECT event_id, poa_status, poa_token_id, poa_minted_at, poa_transferred_at,
                          certificate_status, certificate_token_id, certificate_minted_at, certificate_transferred_at
                   FROM participants WHERE LOWER(wallet_address) = ?""",
                (wallet_address.lower(),)
            )
            db_results = cursor.fetchall()
        finally:
            conn.close()
        
        # Build comprehensive status for each event
        events_status = {}
        
        # Add database status
        for row in db_results:
            event_id = row[0]
            events_status[event_id] = {
                'poa_status': row[1],
                'poa_token_id': row[2],
                'poa_minted_at': row[3],
                'poa_transferred_at': row[4],
                'certificate_status': row[5],
                'certificate_token_id': row[6],
                'certificate_minted_at': row[7],
                'certificate_transferred_at': row[8],
                'poa_minted': False,  # Will be updated from blockchain
                'certificate_minted': False  # Will be updated from blockchain
            }
        
        # Update with blockchain status
        for event in poa_events:
            event_id = event['args']['eventId']
            token_id = event['args']['tokenId']
            if event_id in events_status:
                events_status[event_id]['poa_minted'] = True
        
        for event in cert_events:
            event_id = event['args']['eventId']
            token_id = event['args']['tokenId']
            if event_id in events_status:
                events_status[event_id]['certificate_minted'] = True
        
        return {
            "wallet_address": wallet_address,
            "events": events_status
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/config")
async def get_config():
    """Get frontend configuration"""
    return {
        "contract_address": CONTRACT_ADDRESS,
        "rpc_url": RPC_URL if RPC_URL and "localhost" in RPC_URL else "http://127.0.0.1:8545",
        "chain_id": 31337
    }

@app.post("/bulk_generate_certificates/{event_id}")
async def bulk_generate_certificates(event_id: int):
    """Generate and mint certificates for all PoA holders of an event"""
    try:
        processor = BulkCertificateProcessor()
        result = processor.process_bulk_certificates(event_id)
        
        if result["success"]:
            return {
                "message": "Bulk certificate processing completed successfully",
                "summary": result["summary"],
                "details": result.get("certificate_results", []),
                "email_results": result.get("email_results", [])
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk certificate processing failed: {str(e)}")

@app.post("/test_certificate_generation")
async def test_certificate_generation():
    """Test certificate generation with sample data"""
    try:
        from certificate_generator import CertificateGenerator
        generator = CertificateGenerator()
        
        result = generator.generate_certificate(
            participant_name="Test Participant",
            event_name="Test Event",
            event_date="January 15, 2025",
            participant_email="test@example.com"
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test certificate generation failed: {str(e)}")

@app.get("/certificate_status/{event_id}")
async def get_certificate_status(event_id: int):
    """Get certificate generation status for an event"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get event details
        cursor.execute("SELECT event_name FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get certificate statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_participants,
                COUNT(CASE WHEN poa_status = 'transferred' THEN 1 END) as poa_holders,
                COUNT(CASE WHEN certificate_status = 'completed' THEN 1 END) as certificates_minted,
                COUNT(CASE WHEN certificate_status = 'pending' THEN 1 END) as certificates_pending
            FROM participants 
            WHERE event_id = ?
        """, (event_id,))
        
        stats = cursor.fetchone()
        
        return {
            "event_id": event_id,
            "event_name": event[0],
            "total_participants": stats[0],
            "poa_holders": stats[1],
            "certificates_minted": stats[2],
            "certificates_pending": stats[3],
            "ready_for_bulk_generation": stats[1] > 0 and stats[2] == 0
        }
        
    finally:
        conn.close()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)