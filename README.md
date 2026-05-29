# CyberRx - Healthcare Cybersecurity Management Platform

CyberRx is a comprehensive cybersecurity management platform designed for healthcare organizations, providing ITSM ticket routing, security tool integration, and credential vault management.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ installed
- Git installed
- Railway account (https://railway.app/)

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

## 🚂 Railway Deployment

### Step 1: Prepare GitHub Repository

1. **Initialize Git and push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit: CyberRx application"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Deploy to Railway

1. **Create Railway Project**
   - Go to https://railway.app/
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your CyberRx repository

2. **Deploy Backend API Service**
   - Railway will auto-detect the Node.js service in `cyberrx-api/`
   - Click "Add Service" → "GitHub Repo"
   - Select the same repository
   - Railway will detect the API service automatically
   - Click "Deploy"

3. **Add PostgreSQL Database**
   - Click "Add Service" → "Database" → "Add PostgreSQL"
   - Railway will provision a PostgreSQL database
   - Copy the `DATABASE_URL` from the database service

4. **Configure Backend Environment Variables**
   - Go to your API service → "Variables"
   - Add the following variables:
     ```bash
     DATABASE_URL = <from Railway PostgreSQL service>
     NODE_ENV = production
     PORT = 3001
     JWT_SECRET = <generate-a-secure-secret>
     VAULT_MODE = local
     FRONTEND_URL = <your-frontend-railway-url>
     ```

5. **Deploy Frontend Service**
   - Click "Add Service" → "GitHub Repo"
   - Select the same repository
   - Set root directory to `frontend/`
   - Add environment variable:
     ```bash
     VITE_API_URL = <your-api-railway-url>
     ```
   - Click "Deploy"

6. **Configure Service Networking**
   - Go to your frontend service → "Settings"
   - Generate a custom domain or use the default Railway domain
   - Update `VITE_API_URL` in frontend if needed

### Step 3: Post-Deployment Configuration

1. **Verify Services**
   - Check API health: `<api-url>/health`
   - Access frontend: `<frontend-url>`
   - Test connectivity between services

2. **Configure Security Tool Credentials** (Optional)
   - Add tool credentials in API service environment variables:
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

## 📁 Project Structure

```
Cyber-Rx/
├── cyberrx-api/          # Backend API service
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── utils/        # Database utilities
│   │   └── index.js      # API entry point
│   ├── package.json
│   └── railway.json      # Railway configuration
│
├── frontend/             # Frontend React application
│   ├── src/
│   │   └── App.jsx       # Main React component
│   ├── public/
│   ├── package.json
│   └── railway.json      # Railway configuration
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
| `VITE_API_URL` | Backend API URL | Yes | http://localhost:3001 |

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete configuration reference.

## 🏗️ Architecture

CyberRx uses a microservices architecture:

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Deployment**: Railway (PaaS)

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
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Railway-specific deployment guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture documentation

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support and questions, please contact the development team.

---

**Built with ❤️ for Healthcare Cybersecurity**