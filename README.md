# CyberRx - Healthcare Cybersecurity Management Platform

CyberRx is a comprehensive cybersecurity management platform designed for healthcare organizations, providing ITSM ticket routing, security tool integration, and credential vault management.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ installed
- Git installed
- Vercel account (https://vercel.com/) - for frontend
- Render account (https://render.com/) - for backend + database

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Cyber-Rx
   ```

2. **Install dependencies**
   ```bash
   # Install API dependencies
   cd cyberrx-api
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy API environment template
   cd cyberrx-api
   cp .env.example .env

   # Copy frontend environment template
   cd ../frontend
   cp .env.example .env
   ```

4. **Start the services**
   ```bash
   # Terminal 1 - Start API
   cd cyberrx-api
   npm start

   # Terminal 2 - Start frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:3001
   - API Health: http://localhost:3001/health

## 🚀 Vercel + Render Deployment

### Architecture Overview

- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Node.js + Express)
- **Database**: Render PostgreSQL

### Step 1: Prepare GitHub Repository

The repository is already created at: https://github.com/btd2026/Cyber-Rx

### Step 2: Deploy Backend to Render

1. **Create Render Account**
   - Go to https://render.com/
   - Sign up/login with your GitHub account

2. **Deploy Backend Service**
   - Click "New" → "Web Service"
   - Select your `Cyber-Rx` repository
   - Set root directory to `cyberrx-api/`
   - Configure:
     - **Name**: cyberrx-api
     - **Region**: Oregon (or closest to you)
     - **Plan**: Free
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Click "Deploy"

3. **Create PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Configure:
     - **Name**: cyberrx-db
     - **Database**: cyberrx
     - **User**: cyberrx_user
     - **Region**: Same as backend
     - **Plan**: Free
   - Click "Create Database"

4. **Link Database to Backend**
   - Go to your backend service → "Settings"
   - Scroll to "Environment"
   - Render automatically adds database variables:
     - `DATABASE_URL`
     - `PGHOST`
     - `PGPORT`
     - `PGDATABASE`
     - `PGUSER`
     - `PGPASSWORD`
   - Add additional variables:
     ```bash
     NODE_ENV = production
     PORT = 3001
     JWT_SECRET = <generate-secure-secret>
     VAULT_MODE = local
     FRONTEND_URL = https://your-vercel-app.vercel.app
     ```
   - Click "Save Changes"
   - Render will automatically restart your service

5. **Verify Backend Deployment**
   - Check deployment logs in Render dashboard
   - Test health endpoint: `https://cyberrx-api.onrender.com/health`
   - You should see: `{"status":"ok","version":"1.0.0","ts":"..."}`

### Step 3: Deploy Frontend to Vercel

1. **Create Vercel Account**
   - Go to https://vercel.com/
   - Sign up/login with your GitHub account

2. **Import Project**
   - Click "Add New" → "Project"
   - Select your `Cyber-Rx` repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend/`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Configure Environment Variables**
   - In Vercel project settings → "Environment Variables"
   - Add:
     ```bash
     VITE_API_URL = https://cyberrx-api.onrender.com
     ```
   - Or add as: `render-backend-url` for the vercel.json configuration

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your frontend
   - Get your Vercel URL: `https://your-project.vercel.app`

5. **Update Backend CORS**
   - Go back to Render backend service
   - Update `FRONTEND_URL` environment variable:
     ```bash
     FRONTEND_URL = https://your-project.vercel.app
     ```
   - Render will restart the backend with updated CORS settings

### Step 4: Post-Deployment Configuration

1. **Verify Services**
   - Frontend: `https://your-project.vercel.app`
   - Backend Health: `https://cyberrx-api.onrender.com/health`
   - Test API connectivity from frontend

2. **Configure Security Tool Credentials** (Optional)
   - Go to Render backend service → "Environment"
   - Add tool credentials:
     ```bash
     # ServiceNow
     SNOW_INSTANCE = your-instance
     SNOW_USER = admin
     SNOW_PASSWORD = your-password
     SNOW_ASSIGN_GROUP = IT Security

     # Okta
     OKTA_DOMAIN = your-org.okta.com
     OKTA_APITOKEN = your-token

     # CrowdStrike
     CROWDSTRIKE_CLIENT_ID = your-client-id
     CROWDSTRIKE_CLIENT_SECRET = your-client-secret
     ```

3. **Configure Custom Domains** (Optional)
   - **Vercel**: Add custom domain in project settings
   - **Render**: Add custom domain in service settings (requires paid plan)

### Step 5: Monitor Deployments

- **Vercel**: Automatic deployments on git push
- **Render**: Automatic deployments on git push
- Both platforms provide real-time logs and health monitoring

## 📁 Project Structure

```
Cyber-Rx/
├── cyberrx-api/          # Backend API service (Render)
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── utils/        # Database utilities
│   │   └── index.js      # API entry point
│   ├── package.json
│   └── render.yaml       # Render configuration
│
├── frontend/             # Frontend React application (Vercel)
│   ├── src/
│   │   └── App.jsx       # Main React component
│   ├── public/
│   ├── package.json
│   └── vercel.json       # Vercel configuration
│
├── .gitignore
└── README.md
```

## 🔧 Environment Variables

### Backend Variables (cyberrx-api)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NODE_ENV` | Environment mode | Yes | development |
| `PORT` | API port | No | 3001 |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `VAULT_MODE` | Credential vault mode | No | local |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | - |

### Frontend Variables (frontend)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL (Render) | Yes | http://localhost:3001 |

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete configuration reference.

## 🏗️ Architecture

CyberRx uses a microservices architecture:

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Deployment**: Vercel (Frontend) + Render (Backend + Database)

## 🔒 Security Features

- Environment-based configuration
- CORS protection
- JWT authentication ready
- Secure database connections with SSL
- Credential vault integration ready

## 📊 Key Features

- **ITSM Integration**: ServiceNow, Jira, Freshservice
- **Security Tool Integration**: CrowdStrike, Okta, Splunk, KnowBe4, Tenable
- **Metrics Dashboard**: Real-time security metrics visualization
- **CMMI Scoring**: 5-level maturity assessment
- **Multi-tenant Organization Support**

## 🐛 Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## 📚 Additional Documentation

- [SETUP.md](./SETUP.md) - Detailed setup instructions
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Complete environment variable reference
- [VERCEL_RENDER_DEPLOYMENT.md](./VERCEL_RENDER_DEPLOYMENT.md) - Vercel + Render deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support and questions, please contact the development team.

---

**Built with ❤️ for Healthcare Cybersecurity**