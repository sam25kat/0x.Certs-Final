# Complete Railway Deployment Guide for 0x.Certs

This guide will walk you through deploying your full-stack certificate application to Railway step by step.

## Prerequisites

1. **Git Repository**: Ensure your code is in a Git repository (GitHub, GitLab, etc.)
2. **Railway Account**: Sign up at [railway.app](https://railway.app)
3. **Environment Variables**: Gather all necessary API keys and secrets

## Project Structure Overview

Your application consists of:
- **Backend**: FastAPI Python server (`/backend`)
- **Frontend**: React + Vite TypeScript app (`/new frontend`)
- **Database**: SQLite database (`certificates.db`)
- **Static Files**: Certificate templates and uploads

## Step 1: Prepare Your Repository

### 1.1 Create Root Configuration Files

Create these files in your project root (`C:\Users\JARVIS\Desktop\0x.Certs`):

**`railway.json`**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**`Procfile`** (for backend)
```
web: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 1.2 Create Backend Dockerfile

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for uploads and certificates
RUN mkdir -p uploads certificates

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 1.3 Create Frontend Dockerfile

Create `new frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### 1.4 Update Backend for Production

Create `backend/.env.example`:
```env
# Database
DATABASE_URL=sqlite:///./certificates.db

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Web3 Configuration
WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your-private-key

# Application Settings
DEBUG=False
CORS_ORIGINS=["https://your-frontend-domain.railway.app"]

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

## Step 2: Deploy Backend to Railway

### 2.1 Create Backend Service

1. Go to [railway.app](https://railway.app) and log in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will detect your project - select "Deploy Backend"

### 2.2 Configure Backend Environment Variables

In the Railway dashboard for your backend service:

1. Go to **Variables** tab
2. Add these environment variables:

```
PORT=8000
DATABASE_URL=sqlite:///./certificates.db
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your-private-key
DEBUG=False
CORS_ORIGINS=["*"]
PYTHONPATH=/app
```

**Important**: Replace placeholder values with your actual credentials.

### 2.3 Configure Backend Build Settings

1. Go to **Settings** tab
2. Set **Root Directory** to: `backend`
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

## Step 3: Deploy Frontend to Railway

### 3.1 Create Frontend Service

1. In your Railway project, click "New Service"
2. Select "GitHub Repo" 
3. Choose the same repository
4. Railway will create a new service - rename it to "Frontend"

### 3.2 Configure Frontend Environment Variables

Add these variables to your frontend service:

```
NODE_VERSION=18
VITE_API_URL=https://your-backend-service.railway.app
VITE_APP_NAME=0x.Certs
```

### 3.3 Configure Frontend Build Settings

1. Go to **Settings** tab
2. Set **Root Directory** to: `new frontend`
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npx serve -s dist -l $PORT`

### 3.4 Update Frontend API Configuration

Update your frontend to use environment variables for API calls. In your React app, replace hardcoded API URLs with:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

## Step 4: Configure Database and File Storage

### 4.1 Database Setup

Since you're using SQLite, the database file will be created automatically. However, for production, consider:

1. **Persistent Volumes**: 
   - Go to backend service **Settings** > **Volumes**
   - Add a volume: `/app/certificates.db` → `/data/certificates.db`
   - Update `DATABASE_URL` to: `sqlite:///./data/certificates.db`

2. **Database Migration**:
   Add this to your backend startup:
   ```python
   # In main.py, add database initialization
   @asynccontextmanager
   async def lifespan(app: FastAPI):
       # Initialize database tables
       await init_database()
       yield
   
   app = FastAPI(lifespan=lifespan)
   ```

### 4.2 File Upload Configuration

Update your backend to handle file uploads in production:

```python
# In main.py, update file upload paths
import os

UPLOAD_DIR = os.getenv('UPLOAD_DIR', './uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)
```

## Step 5: Update CORS and Security

### 5.1 Update CORS Settings

In your `backend/main.py`, update CORS configuration:

```python
from fastapi.middleware.cors import CORSMiddleware
import os

# Get frontend URL from environment
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "https://*.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 6: Domain Configuration (Optional)

### 6.1 Custom Domains

1. In Railway dashboard, go to **Settings** > **Domains**
2. Click "Generate Domain" for Railway subdomain
3. Or add your custom domain:
   - Click "Custom Domain"
   - Enter your domain
   - Update DNS records as instructed

## Step 7: Monitoring and Logging

### 7.1 Enable Logging

Add logging to your applications:

**Backend logging**:
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use logger throughout your app
logger.info("Application started")
```

### 7.2 Monitor Deployments

1. Go to **Deployments** tab to see build logs
2. Go to **Metrics** tab to monitor performance
3. Set up **Webhooks** for deployment notifications

## Step 8: Testing the Deployment

### 8.1 Verify Services

1. **Backend**: Visit `https://your-backend-service.railway.app/docs`
2. **Frontend**: Visit `https://your-frontend-service.railway.app`

### 8.2 Test Key Features

1. User registration/login
2. Certificate generation
3. File uploads
4. Email sending
5. Database operations

## Step 9: Environment-Specific Configuration

### 9.1 Create Environment Files

**backend/.env.production**:
```env
DEBUG=False
DATABASE_URL=sqlite:///./data/certificates.db
CORS_ORIGINS=["https://your-frontend-domain.railway.app"]
```

**new frontend/.env.production**:
```env
VITE_API_URL=https://your-backend-service.railway.app
VITE_APP_NAME=0x.Certs Production
```

## Step 10: Troubleshooting Common Issues

### 10.1 Backend Issues

**Port Binding Error**:
```python
# Ensure your main.py uses Railway's PORT
import os
port = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=port)
```

**Database Path Issues**:
```python
# Use absolute paths for database
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATABASE_PATH = BASE_DIR / "certificates.db"
```

### 10.2 Frontend Issues

**Build Errors**:
```bash
# Check Node version compatibility
node --version  # Should be 18+
npm --version
```

**API Connection Issues**:
```typescript
// Add error handling for API calls
const apiCall = async (endpoint: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
```

## Step 11: Security Checklist

- [ ] All secrets stored as environment variables
- [ ] CORS properly configured
- [ ] No sensitive data in code
- [ ] Database properly secured
- [ ] File uploads validated and restricted
- [ ] Rate limiting implemented
- [ ] HTTPS enabled (automatic with Railway)

## Step 12: Performance Optimization

### 12.1 Backend Optimization

```python
# Add caching for frequently accessed data
from functools import lru_cache

@lru_cache(maxsize=100)
def get_certificate_template():
    # Cache certificate templates
    pass
```

### 12.2 Frontend Optimization

```typescript
// Enable code splitting
const LazyComponent = lazy(() => import('./components/LazyComponent'));

// Optimize bundle size
npm run build -- --analyze
```

## Final Deployment Commands

After setting up everything above:

1. **Commit and Push Changes**:
```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

2. **Trigger Deployment**: Railway will automatically deploy when you push to main branch.

3. **Monitor Deployment**: Check Railway dashboard for build status and logs.

## Post-Deployment Checklist

- [ ] Backend service running and accessible
- [ ] Frontend service running and accessible  
- [ ] Database connections working
- [ ] File uploads working
- [ ] Email functionality working
- [ ] Cross-service communication working
- [ ] SSL certificates active
- [ ] Custom domains configured (if applicable)
- [ ] Monitoring and logging active

## Support and Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Community**: [Discord](https://discord.gg/railway)
- **Your App Logs**: Available in Railway dashboard under each service

---

**Note**: Replace all placeholder URLs and credentials with your actual values. Keep your `.env` files local and never commit them to your repository. Always use Railway's environment variables for sensitive data.