# Render + Netlify Deployment Guide for 0x.Certs

This guide will help you deploy your backend to Render and frontend to Netlify - an excellent combination for full-stack applications.

## Why Render + Netlify?

- **Render**: Perfect for backend APIs with free tier, automatic SSL, easy database integration
- **Netlify**: Excellent for React frontends with CDN, forms, and seamless deployment
- **Cost**: Both offer generous free tiers
- **Performance**: Great global performance and reliability

## Prerequisites

1. **Git Repository**: Push your code to GitHub
2. **Accounts**: Sign up for [render.com](https://render.com) and [netlify.com](https://netlify.com)
3. **Environment Variables**: Prepare all your API keys and secrets

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Backend Configuration

I've already created the `render.yaml` file in your project root. Let's also create a runtime.txt for Python version:

**Create `backend/runtime.txt`:**
```
python-3.11.0
```

### Step 2: Deploy Backend on Render

1. **Go to [render.com](https://render.com)** and log in
2. **Click "New +"** → **"Web Service"**
3. **Connect GitHub repository** and select your repo
4. **Configure Service:**
   - **Name**: `0x-certs-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 3: Set Environment Variables on Render

In your Render dashboard, go to **Environment** tab and add:

```
DATABASE_URL=sqlite:///./certificates.db
PYTHON_VERSION=3.11.0

# Email Configuration (replace with your values)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Web3 Configuration
RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your-private-key
CONTRACT_ADDRESS=your-contract-address

# Pinata IPFS Configuration
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key
PINATA_JWT=your-pinata-jwt

# Database and File Paths
DB_URL=certificates.db
UPLOAD_DIR=./uploads
```

**Important Notes:**
- Replace all placeholder values with your actual credentials
- For Gmail, use an App Password, not your regular password
- Keep CORS settings as `allow_origins=["*"]` for now (we'll update after frontend deployment)

### Step 4: Deploy Backend

1. **Click "Create Web Service"**
2. **Monitor the build logs** in the Render dashboard
3. **Wait for deployment** (usually takes 2-5 minutes)
4. **Test your backend** at `https://your-service-name.onrender.com/docs`

---

## Part 2: Deploy Frontend to Netlify

### Step 1: Update Frontend Configuration

1. **Create `.env.production` in `new frontend/`:**
```env
VITE_API_URL=https://your-backend-service.onrender.com
VITE_APP_NAME=0x.Certs
```

2. **Update API calls in your React code** to use environment variables:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

### Step 2: Deploy Frontend on Netlify

1. **Go to [netlify.com](https://netlify.com)** and log in
2. **Click "New site from Git"**
3. **Connect to GitHub** and select your repository
4. **Configure Build Settings:**
   - **Base directory**: `new frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `new frontend/dist`

### Step 3: Set Environment Variables on Netlify

1. **Go to Site settings** → **Environment variables**
2. **Add these variables:**
```
VITE_API_URL=https://your-backend-service.onrender.com
VITE_APP_NAME=0x.Certs
NODE_VERSION=18
```

### Step 4: Deploy Frontend

1. **Click "Deploy site"**
2. **Wait for build completion** (2-3 minutes)
3. **Test your frontend** at the provided Netlify URL

---

## Part 3: Connect Frontend and Backend

### Step 1: Update CORS on Backend

1. **Go to your Render backend service** → **Environment**
2. **Update CORS_ORIGINS** to include your Netlify URL:
```
CORS_ORIGINS=["https://your-site-name.netlify.app", "http://localhost:3000"]
```

Alternatively, update your `backend/main.py` to use environment variables:

```python
import os

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "https://*.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 2: Update Frontend API Configuration

Make sure your frontend is using the correct API URL. Update your API configuration file:

```typescript
// src/config/api.ts or wherever you configure your API
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
};

export default API_CONFIG;
```

---

## Part 4: Database and File Storage

### Database Setup on Render

Render automatically handles your SQLite database file. However, for production:

1. **Persistent Storage**: 
   - Go to your service → **Settings** → **Persistent Disks**
   - Add a disk for database persistence (optional on free tier)

2. **Database Initialization**: 
   Your app should create tables automatically on startup.

### File Upload Configuration

Update your backend to handle file uploads properly:

```python
import os
from pathlib import Path

# Create upload directory
UPLOAD_DIR = os.getenv('UPLOAD_DIR', './uploads')
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
```

---

## Part 5: Custom Domains (Optional)

### Netlify Custom Domain

1. **Go to Site settings** → **Domain management**
2. **Add custom domain**
3. **Update DNS records** as instructed

### Render Custom Domain

1. **Go to your service** → **Settings** → **Custom Domains**
2. **Add domain** and update DNS

---

## Part 6: Monitoring and Troubleshooting

### Backend Monitoring (Render)

1. **Logs**: Check **Logs** tab for errors
2. **Metrics**: Monitor performance in **Metrics** tab
3. **Health Checks**: Render automatically monitors `/` endpoint

### Frontend Monitoring (Netlify)

1. **Deploy Logs**: Check build and deploy logs
2. **Function Logs**: If using Netlify functions
3. **Analytics**: Enable Netlify Analytics for visitor data

### Common Issues and Solutions

**Backend Issues:**

1. **Port Binding Error**:
   - Ensure your app uses `$PORT` environment variable
   - Start command should include `--port $PORT`

2. **Database Path Issues**:
   ```python
   import os
   DB_PATH = os.path.join(os.getcwd(), 'certificates.db')
   ```

3. **Environment Variables Not Loading**:
   - Check if variables are set in Render dashboard
   - Use `os.getenv()` with defaults

**Frontend Issues:**

1. **Build Failures**:
   - Check Node.js version (should be 18+)
   - Verify all dependencies are in `package.json`

2. **API Connection Issues**:
   - Verify VITE_API_URL is correct
   - Check CORS settings on backend
   - Test API endpoint directly

3. **Routing Issues**:
   - Netlify automatically handles SPA routing via `netlify.toml`

---

## Part 7: Environment-Specific Configuration

### Development vs Production

**Backend Environment Detection:**
```python
import os

DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

if ENVIRONMENT == 'production':
    # Production-specific settings
    pass
```

**Frontend Environment Detection:**
```typescript
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
```

---

## Part 8: Security Best Practices

### Backend Security

1. **Environment Variables**: Never commit secrets to Git
2. **CORS**: Restrict origins in production
3. **Rate Limiting**: Consider adding rate limiting
4. **Input Validation**: Validate all inputs

### Frontend Security

1. **Environment Variables**: Only expose VITE_ prefixed vars
2. **Content Security Policy**: Configure in `netlify.toml`
3. **HTTPS**: Automatic with Netlify

---

## Part 9: Performance Optimization

### Backend Optimization (Render)

1. **Database Queries**: Optimize database operations
2. **Caching**: Implement response caching
3. **Async Operations**: Use async/await properly

### Frontend Optimization (Netlify)

1. **Code Splitting**: Already handled by Vite
2. **Asset Optimization**: Vite handles this automatically
3. **CDN**: Netlify provides global CDN

---

## Deployment Checklist

### Before Deployment:
- [ ] All secrets stored as environment variables
- [ ] Database schema up to date
- [ ] CORS properly configured
- [ ] Build commands tested locally
- [ ] Environment-specific configs ready

### After Deployment:
- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] API communication works
- [ ] Database operations successful
- [ ] File uploads working
- [ ] Email functionality tested

---

## Final Steps

### 1. Push Your Changes
```bash
git add .
git commit -m "Add Render and Netlify deployment configuration"
git push origin main
```

### 2. URLs You'll Get
- **Backend**: `https://your-service-name.onrender.com`
- **Frontend**: `https://your-site-name.netlify.app`

### 3. Test Everything
1. Visit frontend URL
2. Test user registration/login
3. Test certificate generation
4. Verify email sending
5. Test file uploads

---

## Support Resources

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Render Community**: [community.render.com](https://community.render.com)

---

## Cost Estimates

### Free Tier Limits:
- **Render**: 750 hours/month, sleeps after 15min inactivity
- **Netlify**: 100GB bandwidth, 300 build minutes

### Paid Tier Benefits:
- **Render Pro ($7/month)**: No sleeping, custom domains, more resources
- **Netlify Pro ($19/month)**: More bandwidth, form submissions, analytics

---

**You're all set!** This setup gives you a robust, scalable deployment with excellent developer experience. Both services offer great monitoring, easy rollbacks, and automatic HTTPS.