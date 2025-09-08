import os
import sqlite3
import hashlib
import random
import string
import smtplib
import json
import requests
import base64
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
        print(f"Certificate NFT minted successfully: {receipt}")
        
        return tx_hash.hex()
        
    except Exception as e:
        print(f"Error in mint_certificate_nft: {str(e)}")
        raise Exception(f"Failed to mint Certificate NFT: {str(e)}")

# API endpoints
@app.on_event("startup")
async def startup_event():
    init_db()

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
               (wallet_address, email, name, team_name, event_id) 
               VALUES (?, ?, ?, ?, ?)""",
            (participant.wallet_address, participant.email, participant.name, participant.team_name, event_id)
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
                tx_hash = mint_certificate_nft(wallet_address, event_id, ipfs_hash)
                
                # Update participant record
                cursor.execute(
                    """UPDATE participants 
                       SET certificate_minted = TRUE, certificate_ipfs_hash = ? 
                       WHERE id = ?""",
                    (ipfs_hash, participant_id)
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
            """SELECT name, email, certificate_ipfs_hash 
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
            name, email, ipfs_hash = participant
            
            try:
                # Create email content
                subject = f"Your {event_name} Certificate is Ready!"
                
                ipfs_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
                
                body = f"""
                <html>
                <body>
                    <h2>Congratulations {name}!</h2>
                    <p>Your certificate for <strong>{event_name}</strong> has been generated and minted as an NFT.</p>
                    
                    <h3>Download Your Certificate:</h3>
                    <p><a href="{ipfs_url}" target="_blank">Download Certificate (IPFS)</a></p>
                    
                    <h3>Your Certificate NFT:</h3>
                    <p>Your certificate has also been minted as an NFT to the same wallet address you used for registration.</p>
                    <p>You can view it on OpenSea or any NFT marketplace that supports Sepolia testnet.</p>
                    
                    <p>Thank you for participating in {event_name}!</p>
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