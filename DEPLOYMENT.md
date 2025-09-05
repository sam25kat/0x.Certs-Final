# 🚀 Deployment Guide

Step-by-step deployment instructions for the Hackathon Certificate DApp.

## 📋 Prerequisites Checklist

- [ ] Node.js v16+ installed
- [ ] Python 3.8+ installed
- [ ] MetaMask browser extension
- [ ] Infura account with Sepolia API key
- [ ] Pinata IPFS account with API keys
- [ ] SendGrid account with API key
- [ ] Sepolia testnet ETH for deployment

## 🔧 Step-by-Step Deployment

### Step 1: Get Required API Keys

#### 1.1 Infura Setup
1. Go to [infura.io](https://infura.io)
2. Create account and new project
3. Copy your Sepolia endpoint URL
4. Format: `https://sepolia.infura.io/v3/YOUR_API_KEY`

#### 1.2 Pinata Setup
1. Go to [pinata.cloud](https://pinata.cloud)
2. Create account
3. Go to API Keys section
4. Create new API key with admin permissions
5. Save: API Key, Secret API Key, and JWT token

#### 1.3 SendGrid Setup
1. Go to [sendgrid.com](https://sendgrid.com)
2. Create account
3. Go to Settings > API Keys
4. Create new API key with Mail Send permissions
5. Save the API key

#### 1.4 Get Sepolia ETH
1. Go to [sepoliafaucet.com](https://sepoliafaucet.com)
2. Connect your deployer wallet
3. Request testnet ETH (minimum 0.1 ETH recommended)

### Step 2: Environment Configuration

#### 2.1 Create Environment Files
```bash
# In project root
cp .env.example .env
cp backend/.env.example backend/.env
cp blockchain/.env.example blockchain/.env
```

#### 2.2 Configure blockchain/.env
```env
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
PRIVATE_KEY=your_deployer_private_key_without_0x_prefix
```

⚠️ **Security Warning**: Never commit your private key to git!

### Step 3: Smart Contract Deployment

```bash
# Navigate to blockchain directory
cd blockchain

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected Output:**
```
Deploying contracts with the account: 0x...
Account balance: 1000000000000000000
CertificateNFT deployed to: 0xABC123...
Save this address to your .env file as CONTRACT_ADDRESS
```

**Important**: Copy the deployed contract address!

### Step 4: Backend Configuration

#### 4.1 Update backend/.env and root .env
```env
# Database (SQLite for development)
DB_URL=sqlite:///certificates.db

# Blockchain
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
PRIVATE_KEY=your_deployer_private_key
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Pinata IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt_token

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key
FROM_EMAIL=no-reply@yourdomain.com
```

#### 4.2 Test Backend Installation
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Test run (Ctrl+C to stop)
python main.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 5: Frontend Setup

#### 5.1 Update API Endpoint (if needed)
Edit `frontend/public/index.html` line ~203:
```javascript
const API_BASE = 'http://localhost:8000'; // Change for production
```

#### 5.2 Test Frontend
```bash
cd frontend
npm install
npm start
```

**Expected**: Browser opens to `http://localhost:3000`

### Step 6: End-to-End Testing

#### 6.1 Create Test Event
1. Open frontend at `http://localhost:3000`
2. Scroll to "Organizer Tools"
3. Enter event name: "Test Hackathon"
4. Click "Create Event"
5. Note the Event ID and Event Code

#### 6.2 Test Participant Registration
1. Install MetaMask if not already installed
2. Switch to Sepolia testnet in MetaMask
3. Click "Connect Wallet"
4. Fill registration form with test event code
5. Submit registration
6. Check MetaMask for PoA NFT transaction

#### 6.3 Test Certificate Generation
1. Upload a test certificate template (JPEG)
2. Enter the Event ID from step 6.1
3. Click "Generate & Send Certificates"
4. Check email for certificate delivery

## 🌐 Production Deployment

### Option 1: VPS Deployment

#### Backend (FastAPI)
```bash
# Install production server
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

#### Frontend (Static Hosting)
```bash
# Copy frontend files to web server
cp -r frontend/public/* /var/www/html/
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Cloud Deployment

#### Vercel (Frontend)
1. Push code to GitHub
2. Connect Vercel to repository
3. Deploy frontend from `frontend/public`

#### Railway/Heroku (Backend)
1. Create `Procfile` in backend directory:
```
web: python main.py
```
2. Push to platform
3. Set environment variables in dashboard

### Option 3: Docker Deployment

#### Dockerfile (Backend)
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "main.py"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - backend/.env
    volumes:
      - ./backend/certificates.db:/app/certificates.db
      - ./backend/uploads:/app/uploads
  
  frontend:
    image: nginx:alpine
    ports:
      - "3000:80"
    volumes:
      - ./frontend/public:/usr/share/nginx/html
```

## 🔒 Security Checklist

### For Production:
- [ ] Use HTTPS for all endpoints
- [ ] Implement rate limiting
- [ ] Add input validation and sanitization
- [ ] Use environment variables for all secrets
- [ ] Enable CORS only for allowed origins
- [ ] Add authentication for organizer endpoints
- [ ] Use PostgreSQL instead of SQLite
- [ ] Implement logging and monitoring
- [ ] Regular security audits

### Environment Security:
- [ ] Never commit private keys
- [ ] Use different keys for dev/prod
- [ ] Rotate API keys regularly
- [ ] Secure server access with SSH keys
- [ ] Enable firewall on production servers

## 📊 Monitoring Setup

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Database check
python -c "
import sqlite3
conn = sqlite3.connect('certificates.db')
print('Tables:', [r[0] for r in conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")])"
```

### Log Monitoring
```python
# Add to main.py for production logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
```

## 🚨 Troubleshooting

### Common Deployment Issues:

#### "Contract deployment failed"
- Check Sepolia ETH balance
- Verify Infura API key
- Ensure private key is correct (no 0x prefix)

#### "IPFS upload failed"
- Verify Pinata API keys
- Check internet connectivity
- Ensure file size under limits

#### "Email sending failed"
- Confirm SendGrid API key
- Check FROM_EMAIL domain verification
- Verify SMTP settings

#### "Database errors"
- Check write permissions in backend directory
- Ensure SQLite is installed
- Clear existing certificates.db if corrupted

#### "Frontend wallet connection failed"
- Ensure MetaMask is unlocked
- Switch to Sepolia testnet
- Check browser console for errors

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review error logs
3. Test individual components
4. Create GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant log files

---

**🎉 Congratulations! Your DApp should now be deployed and ready for hackathon participants!**