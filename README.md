# 🏆 Hackathon Certificate DApp - COMPLETE POC

A comprehensive Web3 decentralized application for hackathon/workshop event participation and certificate NFT minting. Participants register via MetaMask, receive Proof of Attendance (PoA) NFTs, and get personalized certificate NFTs via email after the event.

## ✨ **CURRENT STATUS: FULLY WORKING POC**

✅ **Participant Registration** - Connect wallet, mint PoA NFT  
✅ **Certificate Generation** - PIL image generation with RetroPixel font  
✅ **NFT Minting** - ERC721 tokens with proper wallet display  
✅ **IPFS Integration** - Pinata storage with correct metadata URLs  
✅ **Email Distribution** - SMTP delivery with certificate attachments  
✅ **Dashboard System** - Organizer management interface  

## 🚀 Features

### **For Participants:**
- **MetaMask Integration**: Connect wallet and sign transactions
- **Event Registration**: Enter 6-digit event code to join events
- **PoA NFT Minting**: Proof of attendance tokens minted to wallet
- **Certificate Reception**: Receive personalized certificate NFTs via email
- **Wallet Display**: NFTs show proper names and images in MetaMask

### **For Organizers:**
- **Event Management**: Create events with auto-generated codes
- **Participant Tracking**: Real-time dashboard with blockchain verification
- **Certificate Generation**: Bulk certificate creation with custom templates
- **Email Distribution**: Automated SMTP delivery to all participants
- **Template Customization**: Upload custom certificate backgrounds

### **Technical Features:**
- **Smart Contracts**: ERC721 with proper metadata support
- **IPFS Storage**: Decentralized storage via Pinata with full HTTPS URLs
- **Certificate Design**: PIL text overlay with pixel fonts and proper alignment
- **Database Integration**: SQLite for participant management
- **Email System**: HTML emails with IPFS links and NFT details

## 📁 Project Structure

```
0x.Certs/
├── blockchain/                 # Hardhat + Solidity
│   ├── contracts/
│   │   └── CertificateNFT.sol  # ERC721 contract with HTTPS metadata URLs
│   ├── scripts/deploy.js       # Deployment script
│   └── hardhat.config.js       # Local network config
├── backend/                    # Python FastAPI
│   ├── main.py                # API endpoints & blockchain integration
│   ├── certificate_generator.py # PIL certificate generation
│   ├── bulk_certificate_processor.py # Batch certificate processing
│   ├── email_service.py       # SMTP email delivery
│   └── fonts/                 # RetroPixel and other pixel fonts
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── HackerDashboard.tsx    # Participant interface
│   │   ├── OrganizerDashboard.tsx # Event management
│   │   └── wagmi.ts              # Web3 configuration
│   └── public/
├── certificate_template/       # Certificate templates
└── backend/certificates/      # Generated certificates
```

## ⚡ Quick Start (3 Terminals Required)

### **Prerequisites:**
- Node.js v16+
- Python 3.8+
- MetaMask browser extension
- Git

### **Terminal 1: Start Hardhat Node**
```bash
cd blockchain
npm install
npx hardhat node
```
**Keep running** - Look for: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

### **Terminal 2: Deploy Smart Contract**
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
**Copy the contract address!** Output shows:
```
CertificateNFT deployed to: 0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7
Save this address to your .env file as CONTRACT_ADDRESS
```

### **Terminal 3: Start Backend**
```bash
cd backend
pip install -r requirements.txt

# Create .env file with contract address:
echo "CONTRACT_ADDRESS=0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7" > .env
echo "RPC_URL=http://127.0.0.1:8545/" >> .env
echo "PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" >> .env

# Start server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### **Start Frontend**
```bash
cd frontend
npm install
npm start
```

**Update Contract Address in Frontend:**
Edit `frontend/src/wagmi.ts` line 41:
```typescript
export const CONTRACT_ADDRESS = '0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7' as const;
```

## 🎯 Testing the Complete Flow

### **1. Create an Event (Organizer)**
1. Open `http://localhost:3000`
2. Go to "Organizer Dashboard"
3. Enter event name: "Test Hackathon"
4. Click "Create Event"
5. Note the **Event ID** and **6-digit Event Code**

### **2. Participant Registration**
1. Switch to "Participant Dashboard"
2. Click "Connect Wallet" → MetaMask popup
3. Add Hardhat Localhost network if needed:
   - Network Name: `Hardhat Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
4. Fill registration form with event code from step 1
5. Click "Register & Mint PoA NFT"
6. **MetaMask popup appears** → Sign transaction
7. ✅ Success! PoA NFT minted to your wallet

### **3. Certificate Generation**
1. Back to Organizer Dashboard
2. Upload certificate template (optional - uses default if not provided)
3. Enter Event ID from step 1
4. Click "Generate Certificates"
5. Check console logs for certificate generation progress
6. Certificates saved in `backend/certificates/`

### **4. NFT Display Test**
1. Open MetaMask → NFTs tab
2. Import NFT manually or refresh
3. Should see NFT with proper name: "Event Name - Participation Certificate"
4. Image should display the certificate

## 🔧 Contract Address Update Locations

When deploying a new contract, update the address in **BOTH** locations:

### **1. Backend Configuration**
```bash
# File: backend/.env
CONTRACT_ADDRESS=0xYOUR_NEW_CONTRACT_ADDRESS
```

### **2. Frontend Configuration**  
```typescript
// File: frontend/src/wagmi.ts (line 41)
export const CONTRACT_ADDRESS = '0xYOUR_NEW_CONTRACT_ADDRESS' as const;
```

## 🛠️ API Endpoints

### **Health & Config**
- `GET /health` - API status
- `GET /config` - Contract configuration

### **Event Management**
- `POST /create_event` - Create new event
- `GET /events` - List all events
- `GET /participants/{event_id}` - Get event participants

### **Participant Flow**
- `POST /register_participant` - Register participant
- `POST /confirm_poa_mint` - Confirm PoA NFT minting

### **Certificate System**
- `POST /upload_template/{event_id}` - Upload certificate template
- `POST /generate_certificates/{event_id}` - Generate all certificates
- `POST /bulk_generate_certificates/{event_id}` - **Main production endpoint** - Complete certificate processing
- `GET /certificate_status/{event_id}` - Check certificate generation status
- `POST /test_certificate_generation` - Test certificate generation functionality
- `POST /send_emails/{event_id}` - Send certificate emails

## 📧 Email Configuration (Optional)

For email functionality, add to `backend/.env`:
```env
# Gmail SMTP (example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com

# IPFS (for certificate storage)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt_token
```

## 🔍 Debugging & Troubleshooting

### **Check System Health:**
```bash
# Backend health
curl http://localhost:8000/health

# Contract configuration
curl http://localhost:8000/config

# Blockchain connection
curl http://localhost:8000/debug/blockchain
```

### **Common Issues:**

#### **"Internal JSON-RPC error"**
- ❌ Hardhat node not running
- **Fix:** `cd blockchain && npx hardhat node`

#### **"Contract not found"**
- ❌ Contract not deployed or wrong address
- **Fix:** Redeploy and update both backend/.env and frontend/src/wagmi.ts

#### **"MetaMask popup not appearing"**
- ❌ Wrong network or MetaMask locked
- **Fix:** Add Hardhat Localhost network (Chain ID: 31337)

#### **"NFT has no name/image"**
- ❌ Using old contract with ipfs:// URLs
- ✅ Fixed with HTTPS metadata URLs in latest contract

#### **"Certificate generation fails"**  
- ❌ Missing certificate template
- **Fix:** Upload template via organizer dashboard or use default

## 📊 Smart Contract Details

### **CertificateNFT.sol Features:**
- **ERC721 + URIStorage**: Standard NFT with metadata
- **Event Management**: On-chain event creation
- **Dual NFT Types**: PoA and Certificate tokens
- **HTTPS Metadata**: Full URLs for wallet compatibility
- **Batch Operations**: Bulk minting capabilities

### **Key Functions:**
```solidity
createEvent(eventId, eventName)     // Create event
mintPoA(recipient, eventId)         // Mint PoA token  
mintCertificate(recipient, eventId, ipfsHash) // Mint certificate
updateMetadata(tokenId, ipfsHash)   // Update token URI
```

## 🎨 Certificate Generation System - COMPLETE IMPLEMENTATION

The certificate system is **fully implemented and production-ready** with end-to-end automation for bulk certificate processing.

### **System Architecture:**

#### **1. Certificate Generator (`certificate_generator.py`)**
- **PDF Template Processing**: Uses PyMuPDF to convert PDF templates to high-quality images
- **Dynamic Text Overlay**: Adds participant name, event name, team, and date to specific positions
- **Font System**: RetroPixel font for compact, pixel-style text with proper alignment
- **Date Formatting**: Converts YYYY-MM-DD to "DD Mon YYYY" format
- **IPFS Integration**: Uploads certificates to Pinata with complete NFT metadata
- **Output Format**: High-quality JPEG certificates for email attachments

#### **2. Email Service (`email_service.py`)**
- **Professional Email Templates**: Rich HTML emails with certificate attachments
- **MetaMask Instructions**: Step-by-step wallet import guide for participants
- **Certificate Attachments**: JPEG certificates included as downloadable attachments
- **Bulk Processing**: Efficiently handles multiple participants with individualized content
- **SMTP Integration**: Full Gmail/SendGrid SMTP configuration support

#### **3. Bulk Certificate Processor (`bulk_certificate_processor.py`)**
- **PoA Validation**: Only generates certificates for participants with transferred PoA tokens
- **Database Integration**: Updates participant records with certificate status tracking
- **NFT Minting**: Mints certificates as NFTs with proper IPFS metadata URLs
- **Error Handling**: Robust error handling with detailed progress reporting
- **Complete Automation**: End-to-end processing from PoA verification to email delivery

#### **4. API Endpoints (Production Ready)**
- `POST /bulk_generate_certificates/{event_id}` - Process all certificates for an event
- `POST /generate_certificates/{event_id}` - Alternative certificate generation endpoint
- `GET /certificate_status/{event_id}` - Check certificate generation progress
- `POST /test_certificate_generation` - Test certificate generation functionality

### **Complete Workflow:**

#### **For Organizers:**
1. **Upload Template**: Custom PDF template in `certificate_template/` directory
2. **Bulk Generation**: Click "Generate Certificates" in organizer dashboard
3. **Automatic Processing**: System processes all PoA holders for the event:
   - Generates personalized certificates from PDF template
   - Uploads certificates and metadata to IPFS
   - Mints certificate NFTs with proper metadata URLs
   - Sends professional emails with certificate attachments
4. **Status Monitoring**: Track progress via certificate status endpoint

#### **For Participants:**
1. **Automatic Processing**: Certificates generated for all PoA token holders
2. **Email Notification**: Receive professional email with:
   - Congratulations message and event details
   - Downloadable certificate JPEG attachment
   - NFT contract address and token ID for wallet import
   - Step-by-step MetaMask wallet setup instructions
   - Social sharing encouragement
3. **NFT Import**: Add certificate NFT to MetaMask using provided details

### **Certificate Features:**
- ✅ **PDF Template Processing**: Converts custom PDF designs to certificates
- ✅ **White text overlay**: Proper contrast on certificate blanks
- ✅ **Precise text positioning**: Perfect alignment with template design
- ✅ **RetroPixel font**: Modern, compact pixel-style typography
- ✅ **Abbreviated dates**: Professional format (15 Jan 2025)
- ✅ **High-quality JPEG**: Optimized for email and display
- ✅ **IPFS storage**: Permanent, decentralized certificate storage
- ✅ **NFT metadata**: Complete JSON with proper image URLs for wallet display
- ✅ **Email attachments**: Certificates included as downloadable files
- ✅ **Bulk processing**: Handles unlimited participants efficiently

### **Email System Features:**
- 🎉 **Professional templates** with event branding
- 📜 **Certificate details** (event name, participant name, date)
- 🔗 **NFT import details** (contract address, token ID)
- 📱 **MetaMask setup guide** with step-by-step instructions
- 📎 **Certificate attachment** as downloadable JPEG
- 🎯 **Social sharing** encouragement for participants

### **Production Status:**
- ✅ **Fully implemented** and tested with real data
- ✅ **Database integration** with participant status tracking
- ✅ **Frontend UI** with generation and status buttons
- ✅ **Error handling** with comprehensive logging
- ✅ **IPFS integration** tested with Pinata
- ✅ **Email delivery** tested with SMTP
- ✅ **Ready for unlimited participants**

## 📱 Frontend Architecture

### **React + TypeScript Stack:**
- **Wagmi**: Web3 React hooks
- **MetaMask Integration**: Wallet connection and transaction signing
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Live blockchain data fetching
- **Error Handling**: User-friendly error messages

### **Dashboard Features:**
- **Participant View**: Registration, wallet connection, event joining
- **Organizer View**: Event creation, participant management, certificate generation
- **Real-time Status**: Live updates from blockchain and backend
- **Transaction Tracking**: Shows transaction hashes and confirmation status

## 🔒 Security Features

- **MetaMask Integration**: User signs own transactions
- **Event Validation**: Verify event codes and existence
- **Duplicate Prevention**: One PoA per participant per event
- **Secure Private Keys**: Backend uses environment variables
- **Input Validation**: Sanitized user inputs
- **CORS Configuration**: Controlled API access

## 🚀 Deployment (Production)

### **Environment Setup:**
```bash
# 1. Get API Keys
# - Infura (for Sepolia RPC)
# - Pinata (for IPFS)
# - SendGrid (for emails)

# 2. Deploy Contract to Sepolia
cd blockchain
npx hardhat run scripts/deploy.js --network sepolia

# 3. Update Environment Files
# backend/.env
RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS

# 4. Deploy Backend (Railway/Vercel/VPS)
# 5. Deploy Frontend (Vercel/Netlify)
```

## 🔄 Current Optimizations (TBD)

### **Direct PoA Minting** 
Currently PoA tokens are minted to organizer wallet then transferred to participants. This could be optimized to mint directly to participant wallets using the `bulkMintPoA` function, eliminating the transfer step and reducing gas costs.

**Implementation Plan:**
- Modify backend to use participant addresses directly in `bulkMintPoA` (similar to how PoC certificate minting is currently done)
- Update frontend to handle direct minting transactions
- Test gas cost savings and transaction reliability

### **Sponsor Logo Integration**
Add sponsor image upload functionality during event creation, with automatic overlay on certificate bottom section for branding purposes.

**Implementation Plan:**
- Add sponsor image upload field in event creation form
- Store sponsor images in database/IPFS with event metadata
- Modify certificate generator to overlay sponsor logos at bottom of certificates
- Support multiple sponsor logos with proper positioning and sizing
- Add sponsor logo management in organizer dashboard

## 🧪 Testing Commands

### **End-to-End Test:**
```bash
# 1. Create event
curl -X POST http://localhost:8000/create_event \
  -H "Content-Type: application/json" \
  -d '{"event_name": "Test Hackathon"}'

# 2. Register participant  
curl -X POST http://localhost:8000/register_participant \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "email": "test@example.com", 
    "name": "Test User",
    "team_name": "Team Alpha",
    "event_code": "123456"
  }'

# 3. Generate certificates (bulk processing)
curl -X POST http://localhost:8000/bulk_generate_certificates/1

# 4. Check certificate status
curl http://localhost:8000/certificate_status/1

# 5. Test certificate generation
curl -X POST http://localhost:8000/test_certificate_generation
```

## 🎉 Success Indicators

### **Development Environment:**
✅ Hardhat node running on port 8545  
✅ Backend running on port 8000  
✅ Frontend running on port 3000  
✅ MetaMask connected to Hardhat Localhost  
✅ Contract deployed and addresses updated  

### **User Flow:**
✅ MetaMask popup appears for transactions  
✅ PoA NFT minted to participant wallet  
✅ Organizer dashboard shows real blockchain data  
✅ Certificate generation creates proper NFT metadata  
✅ Email delivery works (with SMTP configuration)  
✅ NFTs display with names and images in wallets  

### **Certificate System:**
✅ Bulk certificate processing for all PoA holders  
✅ PDF template conversion to personalized certificates  
✅ Professional email delivery with certificate attachments  
✅ IPFS storage with permanent certificate URLs  
✅ NFT minting with proper wallet display metadata  
✅ Complete automation from generation to delivery  
✅ Status tracking and progress monitoring  

## 📞 Support

### **For Development Issues:**
1. Check the debugging section above
2. Verify all 3 terminals are running
3. Check contract addresses are updated in both locations
4. Test individual components with curl commands

### **For Smart Contract Issues:**
1. Redeploy contract: `npx hardhat run scripts/deploy.js --network localhost`
2. Update addresses in backend/.env and frontend/src/wagmi.ts
3. Restart backend server
4. Refresh frontend

---

## 🏆 **COMPLETE WORKING POC STATUS**

This is a **fully functional proof of concept** demonstrating:

- ✅ **Web3 Integration** - MetaMask wallet connection and transaction signing
- ✅ **Smart Contract System** - ERC721 NFTs with proper metadata display  
- ✅ **Certificate Generation** - PIL-based image processing with custom fonts
- ✅ **IPFS Integration** - Decentralized storage with proper wallet compatibility
- ✅ **Email System** - SMTP delivery with certificate attachments
- ✅ **Frontend/Backend** - React TypeScript + Python FastAPI architecture
- ✅ **Database Management** - SQLite with participant tracking
- ✅ **Real-time Dashboard** - Live blockchain data verification

**Ready for hackathon deployment and participant onboarding!** 🚀

---

**Built with ❤️ for the Web3 community**