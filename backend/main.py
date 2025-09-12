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
import asyncio
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from io import BytesIO
from contextlib import asynccontextmanager

import aiosqlite

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from web3 import Web3
from PIL import Image, ImageDraw, ImageFont
from bulk_certificate_processor import BulkCertificateProcessor
from database import db_manager

load_dotenv()

# Global database pool
db_pool = None
email_queue = asyncio.Queue()

# Helper function to convert SQL queries for PostgreSQL
def convert_sql_for_postgres(sql_query, params=None):
    """Convert SQLite SQL syntax to PostgreSQL"""
    if not db_manager.is_postgres:
        return sql_query, params
    
    # Convert ? placeholders to $1, $2, etc.
    param_count = 1
    converted_sql = ""
    i = 0
    while i < len(sql_query):
        if sql_query[i] == '?':
            converted_sql += f"${param_count}"
            param_count += 1
        else:
            converted_sql += sql_query[i]
        i += 1
    
    # Convert SQLite specific syntax to PostgreSQL
    converted_sql = converted_sql.replace("TRUE", "true").replace("FALSE", "false")
    converted_sql = converted_sql.replace("AUTOINCREMENT", "")
    
    return converted_sql, params

# Simplified database connection - no pooling to avoid threading issues
class DatabasePool:
    def __init__(self, db_path: str, max_connections: int = 10):
        self.db_path = db_path
        self.max_connections = max_connections
    
    async def get_connection(self):
        # Create fresh connection each time to avoid threading issues
        return await aiosqlite.connect(self.db_path)
    
    async def close_pool(self):
        pass  # No pool to close

# Async email worker with worker ID
async def email_worker(worker_id: int):
    print(f"Email worker {worker_id} started")
    while True:
        try:
            email_task = await email_queue.get()
            if email_task is None:
                print(f"Email worker {worker_id} shutting down")
                email_queue.task_done()
                break
            
            # Process email task
            to_email = email_task.get('to_email')
            subject = email_task.get('subject')
            body = email_task.get('body')
            
            if all([to_email, subject, body]):
                print(f"Worker {worker_id} processing email to {to_email}")
                # Run email sending in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, send_email_sync, to_email, subject, body)
                print(f"Worker {worker_id} completed email to {to_email}")
            
            email_queue.task_done()
        except Exception as e:
            print(f"Email worker {worker_id} error: {e}")
            continue

def send_email_sync(to_email: str, subject: str, body: str):
    """Synchronous email sending for thread pool"""
    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False

app = FastAPI(
    title="Hackathon Certificate API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

def generate_poa_metadata(event_name, participant_name):
    """Generate PoA NFT metadata with event name and participant name from database"""
    return {
        "name": f"{event_name} - Proof of Attendance",
        "description": f"Official Proof of Attendance NFT for {event_name} event issued to {participant_name} by 0x.day",
        "image": "https://gateway.pinata.cloud/ipfs/Qmf3vzYCg8wszTevWdqyLJLCHZaYDPpDgMkcHFqihRgKL6",
        "external_url": "https://0x.day",
        "issuer": "0x.day",
        "attributes": [
            {"trait_type": "Type", "value": "Proof of Attendance"},
            {"trait_type": "Event", "value": event_name},
            {"trait_type": "Participant", "value": participant_name},
            {"trait_type": "Organization", "value": "0x.day"},
            {"trait_type": "Purpose", "value": "Event Attendance Verification"}
        ]
    }

def upload_poa_metadata_to_ipfs(metadata):
    """Upload PoA metadata to IPFS via Pinata"""
    try:
        response = requests.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            headers={
                'Content-Type': 'application/json',
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_API_KEY
            },
            json={
                'pinataContent': metadata,
                'pinataMetadata': {
                    'name': f"poa_metadata_{metadata['attributes'][1]['value'].replace(' ', '_')}"
                }
            }
        )
        
        if response.status_code == 200:
            metadata_hash = response.json()['IpfsHash']
            return {
                "success": True,
                "metadata_hash": metadata_hash,
                "metadata_url": f"https://gateway.pinata.cloud/ipfs/{metadata_hash}"
            }
        else:
            print(f"Failed to upload PoA metadata to IPFS: {response.text}")
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"Error uploading PoA metadata to IPFS: {str(e)}")
        return {"success": False, "error": str(e)}

def update_poa_token_metadata(token_id, metadata_hash):
    """Update PoA token metadata using the smart contract updateMetadata function"""
    if not all([w3, PRIVATE_KEY, CONTRACT_ADDRESS]):
        raise Exception("Web3 not configured properly")
    
    try:
        account = w3.eth.account.from_key(PRIVATE_KEY)
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        
        # Build transaction to update metadata
        gas_estimate = contract.functions.updateMetadata(token_id, metadata_hash).estimate_gas({'from': account.address})
        
        transaction = contract.functions.updateMetadata(token_id, metadata_hash).build_transaction({
            'chainId': w3.eth.chain_id,
            'gas': gas_estimate + 50000,
            'gasPrice': w3.to_wei('1', 'gwei'),
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        print(f"Updated metadata for token {token_id}: {tx_hash.hex()}")
        return {"success": True, "tx_hash": tx_hash.hex()}
        
    except Exception as e:
        print(f"Error updating PoA token metadata: {str(e)}")
        return {"success": False, "error": str(e)}

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
        "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "eventId", "type": "uint256"}, {"internalType": "string", "name": "ipfsHash", "type": "string"}],
        "name": "mintPoA",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address[]", "name": "recipients", "type": "address[]"}, {"internalType": "uint256", "name": "eventId", "type": "uint256"}, {"internalType": "string", "name": "ipfsHash", "type": "string"}],
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
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}, {"internalType": "string", "name": "ipfsHash", "type": "string"}],
        "name": "updateMetadata",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Database setup
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizer_emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            is_root BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            is_active BOOLEAN DEFAULT TRUE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizer_otp_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            session_token TEXT,
            verified_at TIMESTAMP,
            FOREIGN KEY (email) REFERENCES organizer_emails (email)
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
    
    # Initialize root organizer emails
    root_emails = [
        "sameer@0x.day",
        "saijadhav@0x.day", 
        "naresh@0x.day"
    ]
    
    for email in root_emails:
        cursor.execute("""
            INSERT OR IGNORE INTO organizer_emails (email, is_root, is_active) 
            VALUES (?, TRUE, TRUE)
        """, (email,))
    
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
    certificate_template: str = None  # Template filename

class ParticipantRegister(BaseModel):
    wallet_address: str
    email: str
    name: str
    team_name: str
    event_code: str
    telegram_username: str = None

class TelegramVerification(BaseModel):
    telegram_username: str

class OrganizerLoginRequest(BaseModel):
    email: str

class OrganizerVerifyOTP(BaseModel):
    email: str
    otp_code: str

class OrganizerAddEmail(BaseModel):
    email: str

class OrganizerRemoveEmail(BaseModel):
    email: str

class EventStatusUpdate(BaseModel):
    is_active: bool

# Utility functions
def generate_event_code() -> str:
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_otp() -> str:
    """Generate a 6-digit OTP code"""
    return ''.join(random.choices(string.digits, k=6))

def generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)

async def is_organizer_email(email: str) -> bool:
    """Check if email is in organizer list"""
    try:
        if db_manager.is_postgres:
            # PostgreSQL uses 'organizers' table
            sql_query = "SELECT email FROM organizers WHERE email = ?"
        else:
            # SQLite uses 'organizer_emails' table
            sql_query = "SELECT email FROM organizer_emails WHERE email = ? AND is_active = TRUE"
        
        converted_sql, params = convert_sql_for_postgres(sql_query, [email])
        result = await db_manager.execute_query(converted_sql, params, fetch=True)
        return len(result) > 0 if result else False
    except Exception as e:
        print(f"Error checking organizer email: {e}")
        return False

def is_root_email(email: str) -> bool:
    """Check if email is a root organizer email"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id FROM organizer_emails WHERE email = ? AND is_root = TRUE AND is_active = TRUE",
            (email,)
        )
        return cursor.fetchone() is not None
    finally:
        conn.close()

def send_otp_email(email: str, otp_code: str):
    """Send OTP code via email"""
    subject = "0x.Day Organizer Login - OTP Code"
    body = f"""
    <html>
    <body>
        <h2>🔐 Organizer Login Verification</h2>
        <p>Your OTP code for organizer dashboard access:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; border-radius: 5px;">
            {otp_code}
        </div>
        
        <p><strong>This code expires in 10 minutes.</strong></p>
        <p>If you didn't request this code, please ignore this email.</p>
        
        <hr>
        <p><small>0x.Day Certificate Platform - Organizer Access</small></p>
    </body>
    </html>
    """
    send_email(email, subject, body)

async def verify_session_token(token: str) -> Optional[str]:
    """Verify session token and return email if valid"""
    try:
        if db_manager.is_postgres:
            sql_query = """
                SELECT organizer_email FROM organizer_sessions 
                WHERE session_token = $1 AND is_active = 1 
                AND expires_at > CURRENT_TIMESTAMP
            """
            result = await db_manager.execute_query(sql_query, [token], fetch=True)
        else:
            sql_query = """
                SELECT organizer_email FROM organizer_sessions 
                WHERE session_token = ? AND is_active = 1 
                AND datetime('now') < datetime(expires_at)
            """
            result = await db_manager.execute_query(sql_query, [token], fetch=True)
        
        if result and len(result) > 0:
            return result[0]['organizer_email'] if isinstance(result[0], dict) else result[0][1]
        return None
    except Exception as e:
        print(f"Error verifying session token: {e}")
        return None

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
    """Queue email for async processing"""
    email_task = {
        'to_email': to_email,
        'subject': subject,
        'body': body
    }
    asyncio.create_task(email_queue.put(email_task))
    print(f"Email queued for: {to_email}")

def send_email_sync_old(to_email: str, subject: str, body: str):
    """Send email via SMTP - old sync version kept for compatibility"""
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
    """Get participants from blockchain events - DISABLED for performance"""
    # Since we're now using mintCertificateByOwner and trusting the database,
    # we skip the expensive block scanning and return empty list
    print("Skipping on-chain participant fetching - using database-only approach")
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
                    print(f"[SUCCESS] Extracted token ID from Transfer event: {token_id}")
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
                                print(f"[SUCCESS] Extracted token ID from event data: {token_id}")
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
    global db_pool
    
    # Initialize database connection pool
    db_pool = DatabasePool(DB_PATH, max_connections=20)
    
    # Initialize database schema (sync) - disabled for new migration system
    # init_db()
    
    # Initialize new database system and ensure IOTOPIA event
    try:
        from database import init_database_tables, ensure_iotopia_event, migrate_participants_table
        await init_database_tables()
        await migrate_participants_table()
        await ensure_iotopia_event()
        print("Database initialized with persistent PostgreSQL support")
    except Exception as e:
        print(f"Database initialization error: {e}")
        print("Database initialized with connection pool")
    
    # Start 25 concurrent email workers
    email_workers = []
    for worker_id in range(1, 26):  # Workers 1-25
        worker_task = asyncio.create_task(email_worker(worker_id))
        email_workers.append(worker_task)
    print("25 email workers started for concurrent processing")
    
    # Start bot polling in background thread
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        print(f"Telegram config found - Token: {TELEGRAM_BOT_TOKEN[:10]}... Chat ID: {TELEGRAM_CHAT_ID}")
        bot_thread = threading.Thread(target=bot_polling_thread, daemon=True)
        bot_thread.start()
        print("Telegram bot polling thread started successfully!")
    else:
        print("Telegram bot not configured, skipping polling thread")

@app.on_event("shutdown")
async def shutdown_event():
    global db_pool
    if db_pool:
        await db_pool.close_pool()
    # Stop all 25 email workers
    print("Shutting down email workers...")
    for i in range(25):
        await email_queue.put(None)
    print("Email workers shutdown initiated")

@app.post("/organizer/login")
async def organizer_login(request: OrganizerLoginRequest):
    """Send OTP to organizer email for login"""
    email = request.email.lower().strip()
    
    # Check if email is authorized organizer
    if not await is_organizer_email(email):
        raise HTTPException(
            status_code=403, 
            detail="Email not authorized for organizer access"
        )
    
    # Generate OTP and session
    otp_code = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=10)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Clear any previous unused OTPs for this email
        cursor.execute(
            "UPDATE organizer_otp_sessions SET is_used = TRUE WHERE email = ? AND is_used = FALSE",
            (email,)
        )
        
        # Create new OTP session
        cursor.execute("""
            INSERT INTO organizer_otp_sessions (email, otp_code, expires_at)
            VALUES (?, ?, ?)
        """, (email, otp_code, expires_at))
        
        conn.commit()
        
        # Send OTP email
        try:
            send_otp_email(email, otp_code)
            return {"message": "OTP sent to your email", "expires_in_minutes": 10}
        except Exception as e:
            # Clean up the OTP session if email fails
            cursor.execute("DELETE FROM organizer_otp_sessions WHERE email = ? AND otp_code = ?", (email, otp_code))
            conn.commit()
            raise HTTPException(status_code=500, detail=f"Failed to send OTP email: {str(e)}")
        
    finally:
        conn.close()

@app.post("/organizer/verify-otp")
async def verify_otp(request: OrganizerVerifyOTP):
    """Verify OTP and create session"""
    email = request.email.lower().strip()
    otp_code = request.otp_code.strip()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Find valid OTP session
        cursor.execute("""
            SELECT id FROM organizer_otp_sessions
            WHERE email = ? AND otp_code = ? AND is_used = FALSE
            AND datetime('now') < datetime(expires_at)
        """, (email, otp_code))
        
        session = cursor.fetchone()
        
        if not session:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
        
        session_id = session[0]
        
        # Generate session token
        session_token = generate_session_token()
        
        # Mark OTP as used and save session token
        cursor.execute("""
            UPDATE organizer_otp_sessions 
            SET is_used = TRUE, session_token = ?, verified_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (session_token, session_id))
        
        conn.commit()
        
        # Check if this is a root organizer
        is_root = is_root_email(email)
        
        return {
            "message": "Login successful",
            "session_token": session_token,
            "email": email,
            "is_root": is_root
        }
        
    finally:
        conn.close()

@app.post("/organizer/add-email")
async def add_organizer_email(request: OrganizerAddEmail, session_token: str = None):
    """Add new organizer email (requires valid session)"""
    if not session_token:
        raise HTTPException(status_code=401, detail="Session token required")
    
    # Verify session
    organizer_email = await verify_session_token(session_token)
    if not organizer_email:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    new_email = request.email.lower().strip()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if email already exists
        cursor.execute("SELECT id FROM organizer_emails WHERE email = ?", (new_email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Add new email
        cursor.execute("""
            INSERT INTO organizer_emails (email, is_root, created_by)
            VALUES (?, FALSE, (SELECT id FROM organizer_emails WHERE email = ?))
        """, (new_email, organizer_email))
        
        conn.commit()
        
        return {"message": f"Email {new_email} added successfully"}
        
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        conn.close()

@app.post("/organizer/remove-email")
async def remove_organizer_email(request: OrganizerRemoveEmail, session_token: str = None):
    """Remove organizer email (requires valid session, cannot remove root emails)"""
    if not session_token:
        raise HTTPException(status_code=401, detail="Session token required")
    
    # Verify session
    organizer_email = await verify_session_token(session_token)
    if not organizer_email:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    email_to_remove = request.email.lower().strip()
    
    # Check if trying to remove a root email
    if is_root_email(email_to_remove):
        raise HTTPException(status_code=403, detail="Cannot remove root organizer email")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Remove email
        cursor.execute(
            "UPDATE organizer_emails SET is_active = FALSE WHERE email = ? AND is_root = FALSE",
            (email_to_remove,)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Email not found or is protected")
        
        conn.commit()
        
        return {"message": f"Email {email_to_remove} removed successfully"}
        
    finally:
        conn.close()

@app.get("/organizer/emails")
async def get_organizer_emails(session_token: str = None):
    """Get list of all organizer emails (requires valid session)"""
    if not session_token:
        raise HTTPException(status_code=401, detail="Session token required")
    
    # Verify session
    organizer_email = await verify_session_token(session_token)
    if not organizer_email:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT email, is_root, created_at, is_active
            FROM organizer_emails
            WHERE is_active = TRUE
            ORDER BY is_root DESC, created_at ASC
        """)
        
        emails = []
        for row in cursor.fetchall():
            emails.append({
                "email": row[0],
                "is_root": bool(row[1]),
                "created_at": row[2],
                "is_active": bool(row[3])
            })
        
        return {"emails": emails}
        
    finally:
        conn.close()

@app.post("/create_event")
async def create_event(event: EventCreate, organizer_id: int = 1):
    """Create a new event and generate 6-digit code"""
    
    try:
        # Generate unique event code
        while True:
            event_code = generate_event_code()
            check_sql, check_params = convert_sql_for_postgres(
                "SELECT id FROM events WHERE event_code = ?",
                [event_code]
            )
            existing = await db_manager.execute_query(check_sql, check_params, fetch=True)
            if not existing:
                break
        
        # Generate event ID
        event_id = random.randint(1000, 9999)
        while True:
            id_check_sql, id_check_params = convert_sql_for_postgres(
                "SELECT id FROM events WHERE id = ?",
                [event_id]
            )
            existing_id = await db_manager.execute_query(id_check_sql, id_check_params, fetch=True)
            if not existing_id:
                break
            event_id = random.randint(1000, 9999)
        
        # Convert date string to proper date object for PostgreSQL
        if isinstance(event.event_date, str):
            try:
                # Parse date string (supports YYYY-MM-DD format)
                event_date = datetime.strptime(event.event_date, '%Y-%m-%d').date()
            except ValueError:
                # If parsing fails, try datetime format
                try:
                    event_date = datetime.fromisoformat(event.event_date).date()
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        else:
            event_date = event.event_date
        
        # Insert event into database with proper datetime handling
        created_at = datetime.now() if db_manager.is_postgres else datetime.now().isoformat()
        insert_sql, insert_params = convert_sql_for_postgres(
            "INSERT INTO events (id, event_code, event_name, event_date, sponsors, description, created_at, is_active, certificate_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [event_id, event_code, event.event_name, event_date, event.sponsors, event.description, created_at, 1, event.certificate_template or 'default']
        )
        await db_manager.execute_query(insert_sql, insert_params)
        
        print(f"Event created in database: {event.event_name} with code {event_code}")
        
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
                    'gas': gas_estimate + 20000,  # Smaller buffer
                    'gasPrice': w3.to_wei('0.1', 'gwei'),  # Much lower gas price for Base Sepolia
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
        
    except Exception as e:
        print(f"Error creating event: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")

@app.post("/register_participant")
async def register_participant(participant: ParticipantRegister):
    """Register a participant and mint PoA NFT"""
    print(f"Registration attempt: {participant.wallet_address} for event code: {participant.event_code}")
    
    try:
        # Validate event code
        event_sql, event_params = convert_sql_for_postgres(
            "SELECT id, event_name FROM events WHERE event_code = ? AND is_active = ?",
            [participant.event_code, 1 if not db_manager.is_postgres else True]
        )
        event_result = await db_manager.execute_query(event_sql, event_params, fetch=True)
        
        if not event_result:
            print(f"Invalid event code: {participant.event_code}")
            raise HTTPException(status_code=404, detail=f"Invalid event code: {participant.event_code}")
        
        event = event_result[0]
        event_id, event_name = event[0], event[1]
        print(f"Found event: {event_name} (ID: {event_id})")
        
        # Check if this wallet address is already used for this event
        existing_sql, existing_params = convert_sql_for_postgres(
            "SELECT wallet_address, name, email, poa_status, certificate_status FROM participants WHERE wallet_address = ? AND event_id = ?",
            [participant.wallet_address, event_id]
        )
        existing_result = await db_manager.execute_query(existing_sql, existing_params, fetch=True)
        
        if existing_result:
            existing = existing_result[0]
            existing_name, existing_email = existing[1], existing[2]
            poa_status, certificate_status = existing[3], existing[4]
            
            # Check if it's the same person (same name and email) trying to register again
            if existing_name.lower() == participant.name.lower() and existing_email.lower() == participant.email.lower():
                print(f"[ERROR] Same user already registered: {participant.wallet_address}")
                
                # Provide specific error message based on their completion status
                if certificate_status == 'minted':
                    error_msg = f"You have already completed the full process for '{event_name}' including receiving your certificate NFT. Each participant can only register once per event."
                elif poa_status == 'minted':
                    error_msg = f"You have already registered and received your PoA NFT for '{event_name}'. Each participant can only register once per event."
                else:
                    error_msg = f"Already registered for '{event_name}' with this wallet address. Each participant can only register once per event."
                
                raise HTTPException(status_code=400, detail=error_msg)
            else:
                # Different person trying to use the same wallet address
                print(f"[ERROR] Wallet address already in use: {participant.wallet_address} by {existing_name} ({existing_email})")
                raise HTTPException(
                    status_code=400, 
                    detail={
                        "error": "WALLET_ADDRESS_IN_USE",
                        "message": f"This wallet address is already registered for this event by another participant: {existing_name} ({existing_email}). Each participant must use a unique wallet address.",
                        "existing_participant": {
                            "name": existing_name,
                            "email": existing_email
                        }
                    }
                )
        
        # Register new participant 
        print(f"[INFO] Registering new participant: {participant.name}")
        try:
            register_sql, register_params = convert_sql_for_postgres(
                """INSERT INTO participants 
                   (wallet_address, event_id, name, email, team_name, telegram_username, registration_date, poa_status, certificate_status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [participant.wallet_address, event_id, participant.name, participant.email, participant.team_name, 
                 participant.telegram_username, datetime.now() if db_manager.is_postgres else datetime.now().isoformat(), 'not_minted', 'not_generated']
            )
            
            result = await db_manager.execute_query(register_sql, register_params)
            print(f"Participant registered successfully")
        except Exception as e:
            if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
                # Check if already registered for this specific event
                check_sql, check_params = convert_sql_for_postgres(
                    "SELECT name FROM participants WHERE wallet_address = ? AND event_id = ?",
                    [participant.wallet_address, event_id]
                )
                existing = await db_manager.execute_query(check_sql, check_params, fetch=True)
                if existing:
                    existing_name = existing[0]['name'] if isinstance(existing[0], dict) else existing[0][0]
                    return {
                        "message": f"Wallet already registered for this event as '{existing_name}'",
                        "event_name": event_name,
                        "event_id": event_id,
                        "already_registered": True
                    }
            # Re-raise other errors
            print(f"Registration error: {e}")
            raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
        
        return {
            "message": "Registration successful - please mint PoA NFT",
            "participant_id": "registered",
            "event_name": event_name,
            "event_id": event_id,
            "requires_nft_mint": True
        }
        
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

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
    
    try:
        # Update participant record with PoA mint confirmation
        update_sql, update_params = convert_sql_for_postgres(
            "UPDATE participants SET poa_status = ?, poa_minted_at = ? WHERE wallet_address = ? AND event_id = ?",
            ['minted', datetime.now() if db_manager.is_postgres else datetime.now().isoformat(), wallet_address, event_id]
        )
        
        result = await db_manager.execute_query(update_sql, update_params)
        
        # Check if participant was found and updated
        check_sql, check_params = convert_sql_for_postgres(
            "SELECT wallet_address FROM participants WHERE wallet_address = ? AND event_id = ?",
            [wallet_address, event_id]
        )
        participant = await db_manager.execute_query(check_sql, check_params, fetch=True)
        
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        print(f"PoA mint confirmed for {wallet_address} - TX: {tx_hash}")
        return {
            "message": "PoA NFT mint confirmed",
            "tx_hash": tx_hash
        }
        
    except Exception as e:
        print(f"Error confirming PoA mint: {e}")
        raise HTTPException(status_code=500, detail=f"Error confirming PoA mint: {str(e)}")

@app.post("/generate_poa_metadata/{event_id}")
async def generate_poa_metadata_endpoint(event_id: int):
    """Generate PoA metadata with event name from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get event name from database
        cursor.execute("SELECT event_name FROM events WHERE id = ?", (event_id,))
        event_result = cursor.fetchone()
        
        if not event_result:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name = event_result[0]
        
        # Generate PoA metadata with event name
        poa_metadata = generate_poa_metadata(event_name)
        
        # Upload metadata to IPFS
        ipfs_result = upload_poa_metadata_to_ipfs(poa_metadata)
        
        if not ipfs_result["success"]:
            raise HTTPException(status_code=500, detail=f"Failed to upload PoA metadata: {ipfs_result['error']}")
        
        return {
            "success": True,
            "event_name": event_name,
            "metadata_hash": ipfs_result["metadata_hash"],
            "metadata_url": ipfs_result["metadata_url"],
            "metadata": poa_metadata
        }
        
    finally:
        conn.close()

@app.post("/bulk_mint_poa/{event_id}")
async def bulk_mint_poa(event_id: int, request: dict):
    """Bulk mint PoA NFTs for selected or all registered participants of an event"""
    organizer_wallet = request.get("organizer_wallet")
    participant_ids = request.get("participant_ids", [])  # Optional list of specific participant IDs
    
    print(f"[DEBUG] BULK MINT DEBUG - Received organizer_wallet: {organizer_wallet}")
    print(f"[DEBUG] BULK MINT DEBUG - Received participant_ids: {participant_ids}")
    
    if not organizer_wallet:
        raise HTTPException(status_code=400, detail="Organizer wallet address required")
    
    try:
        # Get participants based on selection
        if participant_ids:
            # Get specific selected participants
            placeholders = ','.join('?' for _ in participant_ids)
            participants_sql = f"SELECT wallet_address, name FROM participants WHERE event_id = ? AND id IN ({placeholders}) AND poa_status = 'not_minted'"
            participants_params = [event_id] + participant_ids
            print(f"[DEBUG] BULK MINT DEBUG - Querying selected participants: {participant_ids}")
        else:
            # Get all registered participants for this event (fallback)
            participants_sql = "SELECT wallet_address, name FROM participants WHERE event_id = ? AND poa_status = 'not_minted'"
            participants_params = [event_id]
            print(f"[DEBUG] BULK MINT DEBUG - Querying all participants for event {event_id}")
        
        converted_participants_sql, converted_params = convert_sql_for_postgres(participants_sql, participants_params)
        participants_result = await db_manager.execute_query(converted_participants_sql, converted_params, fetch=True)
        
        if not participants_result:
            raise HTTPException(status_code=404, detail="No registered participants found")
        
        # Convert result format
        participants = [(p['wallet_address'] if isinstance(p, dict) else p[0], 
                        p['name'] if isinstance(p, dict) else p[1]) for p in participants_result]
        
        # Get event name for NFT metadata
        event_sql = "SELECT event_name FROM events WHERE id = ?"
        converted_event_sql, event_params = convert_sql_for_postgres(event_sql, [event_id])
        event_result = await db_manager.execute_query(converted_event_sql, event_params, fetch=True)
        
        if not event_result:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name = event_result[0]['event_name'] if isinstance(event_result[0], dict) else event_result[0][0]
        
        # For bulk mint, mint all NFTs to the organizer first
        # They will be transferred to participants later via batch transfer
        try:
            organizer_checksum = w3.to_checksum_address(organizer_wallet)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid organizer wallet address: {e}")
        
        # Create array of organizer addresses (one for each participant)
        recipient_addresses = [organizer_checksum] * len(participants)
        
        # Generate PoA metadata for the event
        print(f"[INFO] Generating PoA metadata for event: {event_name}")
        poa_metadata = generate_poa_metadata(event_name, "Event Participants")
        
        # Upload metadata to IPFS
        print(f"[INFO] Uploading metadata to IPFS...")
        upload_result = upload_poa_metadata_to_ipfs(poa_metadata)
        
        if not upload_result["success"]:
            raise HTTPException(status_code=500, detail=f"Failed to upload metadata to IPFS: {upload_result['error']}")
        
        ipfs_hash = upload_result["metadata_hash"]
        print(f"[INFO] Metadata uploaded successfully. IPFS hash: {ipfs_hash}")
        
        # Return data for frontend to execute bulk mint transaction
        return {
            "message": f"Ready to bulk mint {len(participants)} PoA NFTs",
            "event_id": event_id,
            "event_name": event_name,
            "recipients": recipient_addresses,
            "participant_count": len(participants),
            "organizer_wallet": organizer_wallet,
            "ipfs_hash": ipfs_hash,
            "metadata_url": f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
        }
        
    except Exception as e:
        print(f"Error in bulk_mint_poa: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk mint preparation failed: {str(e)}")

@app.post("/confirm_bulk_mint_poa")
async def confirm_bulk_mint_poa(request: dict):
    """Confirm that bulk PoA NFTs were minted"""
    event_id = request.get("event_id")
    tx_hash = request.get("tx_hash")
    token_ids = request.get("token_ids", [])
    participant_ids = request.get("participant_ids", [])  # Accept specific participant IDs
    
    if not all([event_id, tx_hash]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    try:
        # Get participants based on selection
        if participant_ids:
            # Get specific selected participants that were minted
            placeholders = ','.join('?' for _ in participant_ids)
            participants_sql = f"SELECT id, wallet_address FROM participants WHERE event_id = ? AND id IN ({placeholders}) AND poa_status = 'registered' ORDER BY id"
            participants_params = [event_id] + participant_ids
        else:
            # Fallback to all registered participants for this event
            participants_sql = "SELECT id, wallet_address FROM participants WHERE event_id = ? AND poa_status = 'registered' ORDER BY id"
            participants_params = [event_id]
        
        converted_participants_sql, converted_params = convert_sql_for_postgres(participants_sql, participants_params)
        participants_result = await db_manager.execute_query(converted_participants_sql, converted_params, fetch=True)
        
        # Convert result format
        participants = [(p['id'] if isinstance(p, dict) else p[0], 
                        p['wallet_address'] if isinstance(p, dict) else p[1]) for p in participants_result]
        
        # Update each participant's status to minted
        for i, (participant_id, wallet_address) in enumerate(participants):
            token_id = token_ids[i] if i < len(token_ids) else None
            
            update_sql = "UPDATE participants SET poa_status = 'minted', poa_token_id = ?, poa_minted_at = CURRENT_TIMESTAMP WHERE id = ?"
            converted_update_sql, update_params = convert_sql_for_postgres(update_sql, [token_id, participant_id])
            await db_manager.execute_query(converted_update_sql, update_params)
        
        print(f"Bulk PoA mint confirmed for {len(participants)} participants - TX: {tx_hash}")
        return {
            "message": f"Bulk PoA NFT mint confirmed for {len(participants)} participants",
            "tx_hash": tx_hash,
            "participants_updated": len(participants)
        }
        
    except Exception as e:
        print(f"Error in confirm_bulk_mint_poa: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk mint confirmation failed: {str(e)}")

@app.post("/update_poa_metadata/{event_id}")
async def update_poa_metadata_endpoint(event_id: int, request: dict):
    """Update PoA token metadata with event name for all minted tokens"""
    token_ids = request.get("token_ids", [])
    
    if not token_ids:
        raise HTTPException(status_code=400, detail="Token IDs required")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get event name from database
        cursor.execute("SELECT event_name FROM events WHERE id = ?", (event_id,))
        event_result = cursor.fetchone()
        
        if not event_result:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name = event_result[0]
        
        # Generate and upload PoA metadata with event name
        poa_metadata = generate_poa_metadata(event_name)
        ipfs_result = upload_poa_metadata_to_ipfs(poa_metadata)
        
        if not ipfs_result["success"]:
            raise HTTPException(status_code=500, detail=f"Failed to upload PoA metadata: {ipfs_result['error']}")
        
        metadata_hash = ipfs_result["metadata_hash"]
        
        # Update metadata for each token
        successful_updates = []
        failed_updates = []
        
        for token_id in token_ids:
            try:
                result = update_poa_token_metadata(token_id, metadata_hash)
                if result["success"]:
                    successful_updates.append(token_id)
                else:
                    failed_updates.append({"token_id": token_id, "error": result["error"]})
            except Exception as e:
                failed_updates.append({"token_id": token_id, "error": str(e)})
        
        return {
            "success": True,
            "event_name": event_name,
            "metadata_hash": metadata_hash,
            "successful_updates": successful_updates,
            "failed_updates": failed_updates,
            "total_tokens": len(token_ids),
            "successful_count": len(successful_updates),
            "failed_count": len(failed_updates)
        }
        
    finally:
        conn.close()

@app.post("/batch_transfer_poa/{event_id}")
async def batch_transfer_poa(event_id: int, request: dict):
    """Batch transfer PoA NFTs from organizer to selected or all participants"""
    organizer_wallet = request.get("organizer_wallet")
    participant_ids = request.get("participant_ids", [])  # Optional list of specific participant IDs
    
    print(f"[DEBUG] BATCH TRANSFER DEBUG - Received organizer_wallet: {organizer_wallet}")
    print(f"[DEBUG] BATCH TRANSFER DEBUG - Received participant_ids: {participant_ids}")
    
    if not organizer_wallet:
        raise HTTPException(status_code=400, detail="Organizer wallet address required")
    
    try:
        # Get participants based on selection
        if participant_ids:
            # Get specific selected participants with minted NFTs
            placeholders = ','.join('?' for _ in participant_ids)
            participants_sql = f"SELECT wallet_address, poa_token_id, name FROM participants WHERE event_id = ? AND id IN ({placeholders}) AND poa_status = 'minted' AND poa_token_id IS NOT NULL"
            participants_params = [event_id] + participant_ids
            print(f"[DEBUG] BATCH TRANSFER DEBUG - Querying selected participants: {participant_ids}")
        else:
            # Get all minted but not transferred participants (fallback)
            participants_sql = "SELECT wallet_address, poa_token_id, name FROM participants WHERE event_id = ? AND poa_status = 'minted' AND poa_token_id IS NOT NULL"
            participants_params = [event_id]
            print(f"[DEBUG] BATCH TRANSFER DEBUG - Querying all minted participants for event {event_id}")
        
        converted_participants_sql, converted_params = convert_sql_for_postgres(participants_sql, participants_params)
        participants_result = await db_manager.execute_query(converted_participants_sql, converted_params, fetch=True)
        
        # Convert result format
        participants = [(p['wallet_address'] if isinstance(p, dict) else p[0], 
                        p['poa_token_id'] if isinstance(p, dict) else p[1],
                        p['name'] if isinstance(p, dict) else p[2]) for p in participants_result]
        
        if not participants:
            # Check if event exists
            event_check_sql = "SELECT COUNT(*) FROM events WHERE id = ?"
            converted_event_check_sql, event_check_params = convert_sql_for_postgres(event_check_sql, [event_id])
            event_check_result = await db_manager.execute_query(converted_event_check_sql, event_check_params, fetch=True)
            event_exists = (event_check_result[0]['count'] if isinstance(event_check_result[0], dict) else event_check_result[0][0]) > 0
            
            if not event_exists:
                raise HTTPException(status_code=404, detail=f"Event ID {event_id} not found")
            
            # Check all participants for this event
            all_participants_sql = "SELECT wallet_address, poa_status, poa_token_id FROM participants WHERE event_id = ?"
            converted_all_participants_sql, all_participants_params = convert_sql_for_postgres(all_participants_sql, [event_id])
            all_participants_result = await db_manager.execute_query(converted_all_participants_sql, all_participants_params, fetch=True)
            all_participants = [(p['wallet_address'] if isinstance(p, dict) else p[0],
                                p['poa_status'] if isinstance(p, dict) else p[1],
                                p['poa_token_id'] if isinstance(p, dict) else p[2]) for p in all_participants_result]
            
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
        
        print(f"[INFO] Batch transfer for event {event_id}:")
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
        
    except Exception as e:
        print(f"Error in batch_transfer_poa: {e}")
        raise HTTPException(status_code=500, detail=f"Batch transfer preparation failed: {str(e)}")

@app.post("/confirm_batch_transfer_poa")
async def confirm_batch_transfer_poa(request: dict):
    """Confirm that PoA NFTs were batch transferred"""
    event_id = request.get("event_id")
    tx_hash = request.get("tx_hash")
    participant_ids = request.get("participant_ids", [])  # Accept specific participant IDs
    
    if not all([event_id, tx_hash]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    try:
        # Update participants based on selection
        if participant_ids:
            # Update specific selected participants to transferred status
            placeholders = ','.join('?' for _ in participant_ids)
            update_sql = f"UPDATE participants SET poa_status = 'transferred', poa_transferred_at = CURRENT_TIMESTAMP WHERE event_id = ? AND id IN ({placeholders}) AND poa_status = 'minted'"
            update_params = [event_id] + participant_ids
        else:
            # Fallback to update all minted participants to transferred status
            update_sql = "UPDATE participants SET poa_status = 'transferred', poa_transferred_at = CURRENT_TIMESTAMP WHERE event_id = ? AND poa_status = 'minted'"
            update_params = [event_id]
        
        converted_update_sql, converted_params = convert_sql_for_postgres(update_sql, update_params)
        result = await db_manager.execute_query(converted_update_sql, converted_params)
        updated_count = len(participant_ids) if participant_ids else 0  # PostgreSQL doesn't return rowcount easily
        
        print(f"Batch PoA transfer confirmed for {updated_count} participants - TX: {tx_hash}")
        return {
            "message": f"Batch PoA NFT transfer confirmed for {updated_count} participants",
            "tx_hash": tx_hash,
            "participants_updated": updated_count
        }
        
    except Exception as e:
        print(f"Error in confirm_batch_transfer_poa: {e}")
        raise HTTPException(status_code=500, detail=f"Batch transfer confirmation failed: {str(e)}")

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
    try:
        # Get event details
        event_sql = "SELECT event_name, event_date, sponsors, certificate_template FROM events WHERE id = ?"
        converted_event_sql, event_params = convert_sql_for_postgres(event_sql, [event_id])
        event_result = await db_manager.execute_query(converted_event_sql, event_params, fetch=True)
        
        if not event_result:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event = event_result[0]
        if isinstance(event, dict):
            event_name = event['event_name']
            event_date = event['event_date'] 
            sponsors = event['sponsors']
            template_path = event.get('certificate_template', 'default')
        else:
            event_name, event_date, sponsors, template_path = event[0], event[1], event[2], event[3]
        
        # Get all participants for this event who have PoA transferred but no certificate
        participants_sql = """SELECT wallet_address, email, name, team_name 
                             FROM participants 
                             WHERE event_id = ? AND poa_status = 'transferred' AND certificate_status = 'not_generated'"""
        converted_participants_sql, participants_params = convert_sql_for_postgres(participants_sql, [event_id])
        participants_result = await db_manager.execute_query(converted_participants_sql, participants_params, fetch=True)
        
        if not participants_result:
            return {"message": "No eligible participants found"}
        
        successful_certificates = 0
        failed_certificates = 0
        
        for participant in participants_result:
            if isinstance(participant, dict):
                wallet_address = participant['wallet_address']
                email = participant['email']
                name = participant['name']
                team_name = participant.get('team_name', '')
            else:
                wallet_address, email, name, team_name = participant[0], participant[1], participant[2], participant[3] or ''
            
            try:
                # Generate certificate JPEG
                cert_bytes = generate_certificate(
                    template_path or "", name, event_name, team_name or "", 
                    str(event_date) or "", sponsors or ""
                )
                
                # Upload to IPFS
                filename = f"certificate_{name.replace(' ', '_')}_{event_id}.jpg"
                ipfs_hash = upload_to_pinata(cert_bytes, filename)
                
                # Mint certificate NFT
                mint_result = mint_certificate_nft(wallet_address, event_id, ipfs_hash)
                
                # Update participant record with certificate info
                update_sql = """UPDATE participants 
                               SET certificate_status = 'generated', certificate_ipfs = ?, 
                                   certificate_token_id = ?, certificate_minted_at = CURRENT_TIMESTAMP
                               WHERE wallet_address = ? AND event_id = ?"""
                converted_update_sql, update_params = convert_sql_for_postgres(
                    update_sql, 
                    [ipfs_hash, mint_result.get('token_id'), wallet_address, event_id]
                )
                await db_manager.execute_query(converted_update_sql, update_params)
                
                successful_certificates += 1
                
            except Exception as e:
                print(f"Failed to generate certificate for {name}: {e}")
                failed_certificates += 1
        
        return {
            "message": "Certificate generation completed",
            "successful": successful_certificates,
            "failed": failed_certificates
        }
        
    except Exception as e:
        print(f"Error in generate_certificates: {e}")
        raise HTTPException(status_code=500, detail=f"Certificate generation failed: {str(e)}")

@app.post("/send_emails/{event_id}")
async def send_emails(event_id: int):
    """Send certificate emails to all participants"""
    try:
        # Get event details
        event_sql = "SELECT event_name FROM events WHERE id = ?"
        converted_event_sql, event_params = convert_sql_for_postgres(event_sql, [event_id])
        event_result = await db_manager.execute_query(converted_event_sql, event_params, fetch=True)
        
        if not event_result:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name = event_result[0]['event_name'] if isinstance(event_result[0], dict) else event_result[0][0]
        
        # Get participants with certificates (updated for new PostgreSQL schema)
        participants_sql = """SELECT name, email, certificate_ipfs, certificate_token_id, wallet_address, poa_token_id
                             FROM participants 
                             WHERE event_id = ? AND certificate_status = 'generated' AND certificate_token_id IS NOT NULL"""
        converted_participants_sql, participants_params = convert_sql_for_postgres(participants_sql, [event_id])
        participants_result = await db_manager.execute_query(converted_participants_sql, participants_params, fetch=True)
        
        # Convert result format
        participants = [(p['name'] if isinstance(p, dict) else p[0],
                        p['email'] if isinstance(p, dict) else p[1],
                        p['certificate_ipfs'] if isinstance(p, dict) else p[2],
                        p['certificate_token_id'] if isinstance(p, dict) else p[3],
                        p['wallet_address'] if isinstance(p, dict) else p[4],
                        p['poa_token_id'] if isinstance(p, dict) else p[5]) for p in participants_result]
        
        if not participants:
            return {"message": "No participants with certificates found"}
        
        successful_emails = 0
        failed_emails = 0
        
        for participant in participants:
            name, email, ipfs_hash, token_id, wallet_address, poa_token_id = participant
            
            try:
                # Create email content
                subject = f"🎉 Your {event_name} Certificate NFT is Ready!"
                
                ipfs_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
                
                body = f"""
                <html>
                <body>
                    <h2>Congratulations {name}! 🎉</h2>
                    <p>Your certificate for <strong>{event_name}</strong> has been generated and minted as an NFT.</p>
                    
                    <h3>🏆 PROOF OF ATTENDANCE (PoA) NFT:</h3>
                    <ul>
                        <li><strong>You also received a PoA NFT for attending this event!</strong></li>
                        <li><strong>PoA Contract Address:</strong> {CONTRACT_ADDRESS}</li>
                        <li><strong>PoA Token ID:</strong> {poa_token_id}</li>
                        <li><strong>Note:</strong> Your PoA NFT was minted when you registered/attended the event.</li>
                    </ul>
                    
                    <h3>📜 CERTIFICATE DETAILS:</h3>
                    <ul>
                        <li><strong>Event:</strong> {event_name}</li>
                        <li><strong>Participant:</strong> {name}</li>
                        <li><strong>Certificate Type:</strong> NFT (Non-Fungible Token)</li>
                    </ul>
                    
                    <h3>🔗 CERTIFICATE NFT DETAILS:</h3>
                    <ul>
                        <li><strong>Contract Address:</strong> {CONTRACT_ADDRESS}</li>
                        <li><strong>Certificate Token ID:</strong> {token_id if token_id else 'Processing...'}</li>
                        <li><strong>Your Wallet:</strong> {wallet_address}</li>
                    </ul>
                    
                    <h3>📱 HOW TO ADD TO YOUR WALLET:</h3>
                    
                    <h4>🟠 Import PoA NFT (MetaMask):</h4>
                    <ol>
                        <li>Open MetaMask wallet</li>
                        <li>Go to NFTs tab</li>
                        <li>Click "Import NFT"</li>
                        <li>Enter Contract Address: <code>{CONTRACT_ADDRESS}</code></li>
                        <li>Enter PoA Token ID: <code>{poa_token_id}</code></li>
                        <li>Click "Import" - Your PoA logo should appear!</li>
                    </ol>
                    
                    <h4>🟢 Import Certificate NFT (MetaMask):</h4>
                    <ol>
                        <li>In the same NFTs tab, click "Import NFT" again</li>
                        <li>Enter Contract Address: <code>{CONTRACT_ADDRESS}</code></li>
                        <li>Enter Certificate Token ID: <code>{token_id if token_id else 'Contact organizer'}</code></li>
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
                        <li><strong>Import your PoA NFT</strong> using the instructions above</li>
                        <li><strong>Add the Certificate NFT</strong> to your wallet using the instructions above</li>
                        <li>Share your achievements on social media</li>
                        <li>Keep these NFTs as proof of your participation and achievement</li>
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
        
    except Exception as e:
        print(f"Error in send_emails: {e}")
        raise HTTPException(status_code=500, detail=f"Email sending failed: {str(e)}")

@app.get("/events")
async def get_events():
    """Get all events"""
    try:
        events_sql, events_params = convert_sql_for_postgres(
            """SELECT id, event_code, event_name, event_date, sponsors, description, created_at, is_active 
               FROM events ORDER BY created_at DESC""",
            []
        )
        
        db_events = await db_manager.execute_query(events_sql, events_params, fetch=True)
        
        events = []
        if db_events:
            for row in db_events:
                # Handle both PostgreSQL Record and SQLite tuple formats
                if hasattr(row, '__getitem__'):
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
                else:
                    # Handle PostgreSQL Record object
                    events.append({
                        "id": getattr(row, 'id', row[0]),
                        "event_code": getattr(row, 'event_code', row[1]),
                        "event_name": getattr(row, 'event_name', row[2]),
                        "event_date": getattr(row, 'event_date', row[3]),
                        "sponsors": getattr(row, 'sponsors', row[4]),
                        "description": getattr(row, 'description', row[5]),
                        "created_at": getattr(row, 'created_at', row[6]),
                        "is_active": getattr(row, 'is_active', row[7])
                    })
        
        return {"events": events}
        
    except Exception as e:
        print(f"Error getting events: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)}")

@app.get("/participants/{event_id}")
async def get_participants(event_id: int):
    """Get all participants for an event from database with blockchain enrichment"""
    print(f"Getting participants for event ID: {event_id}")
    
    try:
        # Get all database participants using new db_manager
        participants_sql, participants_params = convert_sql_for_postgres(
            """SELECT wallet_address, name, email, team_name, poa_status, poa_token_id, 
                      poa_minted_at, poa_transferred_at, certificate_status, certificate_token_id,
                      certificate_minted_at, certificate_transferred_at, certificate_ipfs
               FROM participants WHERE event_id = ?""",
            [event_id]
        )
        db_participants = await db_manager.execute_query(participants_sql, participants_params, fetch=True)
        
        print(f"Found {len(db_participants) if db_participants else 0} participants in database")
        
        # Build participant list directly from database (no blockchain enrichment needed)
        participants = []
        
        if db_participants:
            for i, db_participant in enumerate(db_participants):
                # Handle both PostgreSQL Record and SQLite tuple formats
                if hasattr(db_participant, '__getitem__'):
                    wallet_address = db_participant[0]
                    name = db_participant[1]
                    email = db_participant[2]
                    team_name = db_participant[3]
                    poa_status = db_participant[4]
                    poa_token_id = db_participant[5]
                    poa_minted_at = db_participant[6]
                    poa_transferred_at = db_participant[7]
                    certificate_status = db_participant[8]
                    certificate_token_id = db_participant[9]
                    certificate_minted_at = db_participant[10]
                    certificate_transferred_at = db_participant[11]
                    certificate_ipfs = db_participant[12] if len(db_participant) > 12 else None
                else:
                    # Handle Record object from PostgreSQL
                    wallet_address = getattr(db_participant, 'wallet_address', db_participant[0])
                    name = getattr(db_participant, 'name', db_participant[1])
                    email = getattr(db_participant, 'email', db_participant[2])
                    team_name = getattr(db_participant, 'team_name', db_participant[3])
                    poa_status = getattr(db_participant, 'poa_status', db_participant[4])
                    poa_token_id = getattr(db_participant, 'poa_token_id', db_participant[5])
                    poa_minted_at = getattr(db_participant, 'poa_minted_at', db_participant[6])
                    poa_transferred_at = getattr(db_participant, 'poa_transferred_at', db_participant[7])
                    certificate_status = getattr(db_participant, 'certificate_status', db_participant[8])
                    certificate_token_id = getattr(db_participant, 'certificate_token_id', db_participant[9])
                    certificate_minted_at = getattr(db_participant, 'certificate_minted_at', db_participant[10])
                    certificate_transferred_at = getattr(db_participant, 'certificate_transferred_at', db_participant[11])
                    certificate_ipfs = getattr(db_participant, 'certificate_ipfs', None)
                
                participant = {
                    "id": i + 1,  # Use index as ID since we don't have participant ID
                    "wallet_address": wallet_address,
                    "event_id": event_id,
                    "name": name or 'Unknown',
                    "email": email or 'Unknown',
                    "team_name": team_name,
                    "poa_status": poa_status or 'not_minted',
                    "poa_token_id": poa_token_id,
                    "poa_minted_at": poa_minted_at,
                    "poa_transferred_at": poa_transferred_at,
                    "poa_minted": poa_token_id is not None,  # True if token ID exists
                    "certificate_status": certificate_status or 'not_generated',
                    "certificate_token_id": certificate_token_id,
                    "certificate_minted_at": certificate_minted_at,
                    "certificate_transferred_at": certificate_transferred_at,
                    "certificate_minted": certificate_token_id is not None,  # True if token ID exists
                    "certificate_ipfs": certificate_ipfs
                }
                
                participants.append(participant)
        
        print(f"Returning {len(participants)} participants from database")
        return {"participants": participants}
        
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

@app.get("/participant_status_db/{wallet_address}")
async def get_participant_status_from_db(wallet_address: str):
    """Get participant status directly from database for a specific wallet"""
    try:
        # Get all participant records for this wallet with event information using PostgreSQL JOIN
        status_sql, status_params = convert_sql_for_postgres("""
            SELECT 
                p.wallet_address, p.event_id, p.name, p.email, p.team_name, p.telegram_username,
                p.registration_date, p.poa_status, p.poa_token_id, p.poa_minted_at, p.poa_transferred_at,
                p.certificate_status, p.certificate_token_id, p.certificate_minted_at, 
                p.certificate_transferred_at, p.certificate_ipfs,
                e.event_name, e.event_date, e.event_code
            FROM participants p
            JOIN events e ON p.event_id = e.id
            WHERE LOWER(p.wallet_address) = LOWER(?)
            ORDER BY p.registration_date DESC
        """, [wallet_address])
        
        participants = await db_manager.execute_query(status_sql, status_params, fetch=True)
        
        if not participants:
            return {
                "wallet_address": wallet_address,
                "events": {}
            }
        
        # Group by event_id and structure the response
        events_status = {}
        
        for participant in participants:
            # Handle both PostgreSQL Record and SQLite tuple formats
            if hasattr(participant, '__getitem__'):
                event_id = participant[1]
                events_status[str(event_id)] = {
                    "event_name": participant[16],
                    "event_date": participant[17], 
                    "event_code": participant[18],
                    "participant_name": participant[2],
                    "participant_email": participant[3],
                    "team_name": participant[4],
                    "registered_at": participant[6],
                    "poa_status": participant[7],
                    "poa_token_id": participant[8],
                    "poa_minted_at": participant[9],
                    "poa_transferred_at": participant[10],
                    "certificate_status": participant[11],
                    "certificate_token_id": participant[12],
                    "certificate_minted_at": participant[13],
                    "certificate_transferred_at": participant[14],
                    "telegram_username": participant[5],
                    "telegram_verified": participant[5] is not None
                }
            else:
                # Handle PostgreSQL Record object
                event_id = getattr(participant, 'event_id', participant[1])
                events_status[str(event_id)] = {
                    "event_name": getattr(participant, 'event_name', participant[16]),
                    "event_date": getattr(participant, 'event_date', participant[17]),
                    "event_code": getattr(participant, 'event_code', participant[18]),
                    "participant_name": getattr(participant, 'name', participant[2]),
                    "participant_email": getattr(participant, 'email', participant[3]),
                    "team_name": getattr(participant, 'team_name', participant[4]),
                    "registered_at": getattr(participant, 'registration_date', participant[6]),
                    "poa_status": getattr(participant, 'poa_status', participant[7]),
                    "poa_token_id": getattr(participant, 'poa_token_id', participant[8]),
                    "poa_minted_at": getattr(participant, 'poa_minted_at', participant[9]),
                    "poa_transferred_at": getattr(participant, 'poa_transferred_at', participant[10]),
                    "certificate_status": getattr(participant, 'certificate_status', participant[11]),
                    "certificate_token_id": getattr(participant, 'certificate_token_id', participant[12]),
                    "certificate_minted_at": getattr(participant, 'certificate_minted_at', participant[13]),
                    "certificate_transferred_at": getattr(participant, 'certificate_transferred_at', participant[14]),
                    "telegram_username": getattr(participant, 'telegram_username', participant[5]),
                    "telegram_verified": getattr(participant, 'telegram_username', participant[5]) is not None
                }
        
        return {
            "wallet_address": wallet_address,
            "events": events_status
        }
        
    except Exception as e:
        print(f"Error getting participant status: {e}")
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
async def bulk_generate_certificates(event_id: int, request: dict = None):
    """Generate and mint certificates for selected or all PoA holders of an event"""
    participant_ids = []
    if request:
        participant_ids = request.get("participant_ids", [])
    
    print(f"[DEBUG] BULK CERTIFICATES DEBUG - Event ID: {event_id}")
    print(f"[DEBUG] BULK CERTIFICATES DEBUG - Participant IDs: {participant_ids}")
    
    try:
        processor = BulkCertificateProcessor()
        result = await processor.process_bulk_certificates(event_id, participant_ids=participant_ids)
        
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

@app.put("/toggle_event_status/{event_id}")
async def toggle_event_status(event_id: int, request: EventStatusUpdate, session_token: str = None):
    """Toggle event active status (requires valid organizer session)"""
    if not session_token:
        raise HTTPException(status_code=401, detail="Session token required")
    
    # Verify session
    organizer_email = await verify_session_token(session_token)
    if not organizer_email:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if event exists
        cursor.execute("SELECT event_name, is_active FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_name, current_status = event
        
        # Update event status
        cursor.execute(
            "UPDATE events SET is_active = ? WHERE id = ?",
            (request.is_active, event_id)
        )
        
        conn.commit()
        
        return {
            "message": f"Event '{event_name}' status updated successfully",
            "event_id": event_id,
            "event_name": event_name,
            "previous_status": bool(current_status),
            "new_status": request.is_active,
            "updated_by": organizer_email
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update event status: {str(e)}")
    finally:
        conn.close()

# Template Management Endpoints
@app.get("/templates")
async def get_templates():
    """Get all available certificate templates"""
    try:
        template_dir = "../certificate_template"
        if not os.path.exists(template_dir):
            os.makedirs(template_dir, exist_ok=True)
            return {"templates": []}
        
        templates = []
        for filename in os.listdir(template_dir):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(template_dir, filename)
                file_size = os.path.getsize(file_path)
                templates.append({
                    "filename": filename,
                    "display_name": filename.replace('.pdf', '').replace('_', ' ').title(),
                    "file_size": file_size,
                    "created_at": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
                })
        
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")

@app.post("/templates/upload")
async def upload_template(file: UploadFile = File(...), session_token: str = None):
    """Upload a new certificate template"""
    
    # Verify organizer session
    organizer_email = verify_organizer_session(session_token)
    if not organizer_email:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File size too large. Maximum 10MB allowed")
    
    try:
        template_dir = "../certificate_template"
        os.makedirs(template_dir, exist_ok=True)
        
        # Generate safe filename
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
        if not safe_filename.lower().endswith('.pdf'):
            safe_filename += '.pdf'
        
        file_path = os.path.join(template_dir, safe_filename)
        
        # Check if file already exists
        if os.path.exists(file_path):
            # Add timestamp to make it unique
            name, ext = os.path.splitext(safe_filename)
            timestamp = int(datetime.now().timestamp())
            safe_filename = f"{name}_{timestamp}{ext}"
            file_path = os.path.join(template_dir, safe_filename)
        
        # Save the file
        with open(file_path, "wb") as f:
            f.write(content)
        
        return {
            "message": "Template uploaded successfully",
            "filename": safe_filename,
            "file_size": len(content),
            "uploaded_by": organizer_email
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload template: {str(e)}")

@app.delete("/templates/{filename}")
async def delete_template(filename: str, session_token: str = None):
    """Delete a certificate template"""
    
    # Verify organizer session
    organizer_email = verify_organizer_session(session_token)
    if not organizer_email:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        template_dir = "../certificate_template"
        file_path = os.path.join(template_dir, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Template not found")
        
        if not filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Check if template is being used by any events
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) FROM events 
            WHERE certificate_template_path = ? AND is_active = TRUE
        """, (filename,))
        
        events_using_template = cursor.fetchone()[0]
        conn.close()
        
        if events_using_template > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete template. It is being used by {events_using_template} active event(s)"
            )
        
        os.remove(file_path)
        
        return {
            "message": "Template deleted successfully",
            "filename": filename,
            "deleted_by": organizer_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)