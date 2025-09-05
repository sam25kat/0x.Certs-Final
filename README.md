# 🏆 Hackathon Certificate DApp

A comprehensive decentralized application for hackathon/workshop event participation and certificate NFT minting. Participants connect their wallets, register for events, mint Proof of Attendance (PoA) NFTs, and receive personalized certificate NFTs via email after the event.

## 🚀 Features

- **Participant Registration**: Connect wallet (MetaMask), enter event code, mint PoA NFT
- **Event Management**: Organizers create events with 6-digit codes
- **Certificate Generation**: Personalized JPEG certificates with PIL text overlay
- **NFT Minting**: ERC721 soulbound NFTs for both PoA and certificates
- **IPFS Storage**: Certificates stored on IPFS via Pinata
- **Email Distribution**: SMTP email delivery with certificate links
- **SQLite Database**: Lightweight database for MVP

## 📁 Project Structure

```
0x.Certs/
├── blockchain/          # Hardhat + Solidity contracts
│   ├── contracts/
│   │   └── CertificateNFT.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── hardhat.config.js
│   └── package.json
├── backend/            # Python FastAPI backend
│   ├── main.py        # Single main file with all functionality
│   └── requirements.txt
├── frontend/           # HTML/JS frontend
│   └── public/
│       └── index.html  # Complete DApp interface
└── .env.example       # Environment configuration template
```

## 🔧 Setup Instructions

### Prerequisites

- Node.js (v16+)
- Python (3.8+)
- MetaMask browser extension
- Infura account (for Sepolia RPC)
- Pinata account (for IPFS)
- SendGrid account (for SMTP)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd 0x.Certs

# Install blockchain dependencies
cd blockchain
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt

# Install frontend dependencies (optional, uses CDN)
cd ../frontend
npm install
```

### 2. Environment Configuration

Copy the example environment files and fill in your credentials:

```bash
# Root level
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Blockchain
cp blockchain/.env.example blockchain/.env
```

#### Required Environment Variables:

**Blockchain Configuration:**
```env
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
PRIVATE_KEY=your_deployer_private_key_here
```

**Pinata IPFS Configuration:**
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_api_key
PINATA_JWT=your_pinata_jwt_token
```

**SMTP Email Configuration:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
FROM_EMAIL=no-reply@events.0x.day
```

### 3. Deploy Smart Contract

```bash
cd blockchain

# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Copy the deployed contract address to your .env files as CONTRACT_ADDRESS
```

### 4. Start Backend Server

```bash
cd backend
python main.py
```

The backend will start on `http://localhost:8000`

### 5. Start Frontend

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## 🎯 Usage Flow

### For Participants:

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Enter Event Code**: Get the 6-digit code from event organizer
3. **Fill Registration**: Enter name, email, team name (optional)
4. **Register**: Submit form to register and mint PoA NFT
5. **Receive Certificate**: After event, receive email with certificate NFT

### For Organizers:

1. **Create Event**: Use organizer tools to create event and get event code
2. **Share Code**: Distribute 6-digit code to participants
3. **Upload Template**: (Optional) Upload custom certificate template
4. **Generate Certificates**: After event, generate and email certificates

## 🔗 API Endpoints

### Participant Endpoints:
- `POST /register_participant` - Register and mint PoA NFT
- `GET /events` - List all events
- `GET /participants/{event_id}` - Get event participants

### Organizer Endpoints:
- `POST /create_organizer` - Create organizer account
- `POST /create_event` - Create new event
- `POST /upload_template/{event_id}` - Upload certificate template
- `POST /generate_certificates/{event_id}` - Generate certificates
- `POST /send_emails/{event_id}` - Send certificate emails

### Health Check:
- `GET /health` - API health status

## 🏗️ Smart Contract Details

### CertificateNFT.sol Features:
- **ERC721 + URIStorage**: Standard NFT with metadata support
- **Soulbound**: Non-transferable NFTs (except minting/burning)
- **Event Management**: Create events on-chain
- **Dual NFT Types**: PoA and Certificate NFTs
- **Metadata Updates**: Update IPFS URIs for certificates

### Key Functions:
- `createEvent(eventId, eventName)` - Create event
- `mintPoA(recipient, eventId)` - Mint Proof of Attendance
- `mintCertificate(recipient, eventId, ipfsHash)` - Mint certificate
- `updateMetadata(tokenId, ipfsHash)` - Update token URI

## 🗄️ Database Schema

### Tables:
- **organizers**: Admin accounts management
- **events**: Event details and codes
- **participants**: Registration and NFT status

## 🎨 Certificate Generation

The system uses Python PIL to:
1. Load base template (JPEG)
2. Overlay participant name, event name, team, date
3. Save as high-quality JPEG
4. Upload to IPFS via Pinata
5. Update NFT metadata with IPFS hash

## 📧 Email System

SMTP integration sends HTML emails with:
- Congratulations message
- IPFS download link
- NFT viewing instructions
- Event details

## 🔐 Security Features

- **Soulbound NFTs**: Prevent trading/transfer
- **Event Validation**: Verify event codes and existence
- **Duplicate Prevention**: One PoA per participant per event
- **Environment Variables**: Secure credential management

## 🧪 Testing

```bash
# Test backend endpoints
curl http://localhost:8000/health

# Test event creation
curl -X POST http://localhost:8000/create_event \
  -H "Content-Type: application/json" \
  -d '{"event_name": "Test Hackathon"}'

# Test participant registration
curl -X POST http://localhost:8000/register_participant \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x...",
    "email": "test@example.com",
    "name": "John Doe",
    "team_name": "Team Alpha",
    "event_code": "123456"
  }'
```

## 🚀 Deployment

### Production Deployment:

1. **Backend**: Deploy FastAPI with uvicorn/gunicorn
2. **Frontend**: Serve static files via nginx/CDN
3. **Database**: Upgrade to PostgreSQL for production
4. **Security**: Add authentication, rate limiting, HTTPS

### Docker Deployment (Optional):

```dockerfile
# Dockerfile example for backend
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

## 🐛 Troubleshooting

### Common Issues:

1. **MetaMask Connection Failed**
   - Ensure MetaMask is installed and unlocked
   - Switch to Sepolia testnet

2. **Contract Deployment Failed**
   - Check Infura API key and endpoint
   - Ensure deployer wallet has Sepolia ETH

3. **IPFS Upload Failed**
   - Verify Pinata API credentials
   - Check file size limits

4. **Email Sending Failed**
   - Confirm SMTP credentials
   - Check SendGrid account status

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For issues and questions:
- Create GitHub issue
- Check troubleshooting section
- Review API documentation

---

**Built with ❤️ for the Web3 community**