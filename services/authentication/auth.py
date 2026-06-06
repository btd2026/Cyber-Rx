"""
CyberRX Authentication Service - Core Authentication Module

Implements user authentication, JWT token management, and MFA (TOTP).
Following NIST SP 800-63B guidelines for password security.
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, timedelta
from enum import Enum
import jwt
import bcrypt
import pyotp
import uuid
import os
from functools import lru_cache

# Configuration
class Settings:
    """Authentication service settings"""
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_MIN_LENGTH: int = 12
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    MFA_ISSUER: str = "CyberRX"

@lru_cache()
def get_settings():
    """Cached settings instance"""
    return Settings()

settings = get_settings()

# FastAPI app
app = FastAPI(
    title="CyberRX Authentication Service",
    description="Authentication and authorization for CyberRX Multi-Agent AI Platform",
    version="0.1.0"
)

# Security
security = HTTPBearer()

# Enums
class Role(str, Enum):
    """User roles for RBAC"""
    CFO = "cfo"
    CRO = "cro"
    CLO = "clo"
    CIO = "cio"
    CISO = "ciso"
    BOARD = "board"
    ADMIN = "admin"

# Models
class UserLogin(BaseModel):
    """User login request"""
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=settings.PASSWORD_MIN_LENGTH)
    totp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    role: Role

class UserCreate(BaseModel):
    """User creation request"""
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=settings.PASSWORD_MIN_LENGTH)
    full_name: str = Field(..., min_length=1, max_length=255)
    role: Role
    customer_id: str = Field(..., min_length=1, max_length=100)

    @validator('password')
    def validate_password(cls, v):
        """Validate password meets NIST requirements"""
        if len(v) < settings.PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters")
        # Check against common passwords (simplified - in production use a full list)
        common_passwords = [
            "password123456", "123456789012", "qwerty123456", "abc123456789",
            "letmein123456", "welcome12345", "monkey123456", "dragon123456"
        ]
        if v.lower() in common_passwords:
            raise ValueError("Password is too common. Please choose a stronger password")
        return v

class TOTPSetupResponse(BaseModel):
    """TOTP setup response"""
    secret: str
    qr_code_url: str
    backup_codes: List[str]

class CurrentUser(BaseModel):
    """Current user info"""
    user_id: str
    username: str
    email: str
    full_name: str
    role: Role
    customer_id: str

# Password Hashing (bcrypt with work factor 12)
def hash_password(password: str) -> str:
    """
    Hash password using bcrypt with work factor 12.

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """
    Verify password against hash.

    Args:
        password: Plain text password
        hashed: Hashed password

    Returns:
        True if password matches
    """
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# JWT Token Management
def create_access_token(data: dict) -> str:
    """
    Create JWT access token.

    Args:
        data: Token payload data

    Returns:
        Encoded JWT access token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow()
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """
    Create JWT refresh token.

    Args:
        data: Token payload data

    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow()
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token.

    Args:
        token: JWT token

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# MFA (TOTP)
def generate_totp_secret() -> str:
    """
    Generate new TOTP secret.

    Returns:
        Base32-encoded TOTP secret
    """
    return pyotp.random_base32()

def generate_totp_uri(secret: str, email: str) -> str:
    """
    Generate TOTP provisioning URI for QR code.

    Args:
        secret: TOTP secret
        email: User email

    Returns:
        Provisioning URI
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=email,
        issuer_name=settings.MFA_ISSUER
    )

def verify_totp(secret: str, code: str, valid_window: int = 1) -> bool:
    """
    Verify TOTP code.

    Args:
        secret: TOTP secret
        code: 6-digit TOTP code
        valid_window: Time window to allow (default: 1 = 30 seconds before/after)

    Returns:
        True if code is valid
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=valid_window)

def generate_backup_codes(count: int = 10) -> List[str]:
    """
    Generate backup codes for MFA recovery.

    Args:
        count: Number of backup codes to generate

    Returns:
        List of backup codes
    """
    return [pyotp.random_base32()[:8].upper() for _ in range(count)]

# Database integration (placeholder - will be implemented with actual database)
class UserDatabase:
    """User database interface (placeholder for actual database integration)"""

    async def get_user_by_username(self, username: str) -> Optional[dict]:
        """Get user by username"""
        # TODO: Implement actual database query
        return None

    async def create_user(self, user: UserCreate, hashed_password: str, totp_secret: str, backup_codes: List[str]) -> str:
        """Create new user"""
        # TODO: Implement actual database insert
        user_id = str(uuid.uuid4())
        return user_id

    async def update_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp"""
        # TODO: Implement actual database update
        pass

    async def record_failed_login_attempt(self, username: str) -> int:
        """Record failed login attempt and return attempt count"""
        # TODO: Implement actual database update
        return 0

    async def reset_failed_login_attempts(self, username: str) -> None:
        """Reset failed login attempts"""
        # TODO: Implement actual database update
        pass

    async def is_account_locked(self, username: str) -> tuple[bool, Optional[datetime]]:
        """Check if account is locked"""
        # TODO: Implement actual database query
        return False, None

    async def store_refresh_token(self, user_id: str, token: str, expires_at: datetime) -> str:
        """Store refresh token in database"""
        # TODO: Implement actual database insert
        token_id = str(uuid.uuid4())
        return token_id

    async def revoke_refresh_token(self, token_id: str) -> None:
        """Revoke refresh token"""
        # TODO: Implement actual database update
        pass

    async def create_session(self, user_id: str, access_token: str, refresh_token_id: str,
                           customer_id: str, ip_address: Optional[str],
                           user_agent: Optional[str]) -> str:
        """Create user session"""
        # TODO: Implement actual database insert
        session_id = str(uuid.uuid4())
        return session_id

# Global user database instance
user_db = UserDatabase()

# Dependency: Get current user from JWT token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """
    Get current user from JWT token.

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        Current user info

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    # Get user from database
    username = payload.get("sub")
    user = await user_db.get_user_by_username(username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return CurrentUser(
        user_id=user["id"],
        username=user["username"],
        email=user["email"],
        full_name=user["full_name"],
        role=Role(payload.get("role")),
        customer_id=payload.get("customer_id")
    )

# API Endpoints
@app.post("/api/v1/auth/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """
    Register new user (requires admin role in production).

    Args:
        user: User creation data

    Returns:
        User ID and TOTP setup information
    """
    # Check if user exists
    existing_user = await user_db.get_user_by_username(user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )

    # Hash password
    hashed_password = hash_password(user.password)

    # Generate TOTP secret and backup codes
    totp_secret = generate_totp_secret()
    backup_codes = generate_backup_codes()

    # Create user in database
    user_id = await user_db.create_user(user, hashed_password, totp_secret, backup_codes)

    # Generate TOTP QR code URI
    qr_code_url = generate_totp_uri(totp_secret, user.email)

    return {
        "user_id": user_id,
        "message": "User registered successfully. Please set up MFA using the QR code or backup codes.",
        "totp_setup": {
            "secret": totp_secret,
            "qr_code_url": qr_code_url,
            "backup_codes": backup_codes
        }
    }

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user_login: UserLogin, request_user_agent: str = None, request_ip: str = None):
    """
    Authenticate user with username/password + MFA.

    Args:
        user_login: Login credentials
        request_user_agent: User agent from request
        request_ip: IP address from request

    Returns:
        Access and refresh tokens

    Raises:
        HTTPException: If authentication fails
    """
    # Check if account is locked
    is_locked, locked_until = await user_db.is_account_locked(user_login.username)
    if is_locked:
        if locked_until and locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is locked until {locked_until.isoformat()}"
            )

    # Get user
    user = await user_db.get_user_by_username(user_login.username)
    if not user:
        await user_db.record_failed_login_attempt(user_login.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Verify password
    if not verify_password(user_login.password, user["password_hash"]):
        failed_attempts = await user_db.record_failed_login_attempt(user_login.username)
        if failed_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            # Lock account
            # TODO: Implement account lockout in database
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account locked due to too many failed login attempts"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Verify TOTP code
    if not verify_totp(user["totp_secret"], user_login.totp_code):
        await user_db.record_failed_login_attempt(user_login.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )

    # Reset failed login attempts
    await user_db.reset_failed_login_attempts(user_login.username)

    # Create tokens
    token_data = {
        "sub": user["username"],
        "role": user["role"],
        "customer_id": user["customer_id"]
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_id = await user_db.store_refresh_token(user["id"], refresh_token, expires_at)

    # Create session
    await user_db.create_session(
        user_id=user["id"],
        access_token=access_token,
        refresh_token_id=refresh_token_id,
        customer_id=user["customer_id"],
        ip_address=request_ip,
        user_agent=request_user_agent
    )

    # Update last login
    await user_db.update_last_login(user["id"])

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=Role(user["role"])
    )

@app.post("/api/v1/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token.

    Args:
        refresh_token: Refresh token

    Returns:
        New access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid
    """
    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    # Create new tokens
    token_data = {
        "sub": payload["sub"],
        "role": payload["role"],
        "customer_id": payload["customer_id"]
    }
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    # TODO: Revoke old refresh token and store new one

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=Role(payload["role"])
    )

@app.post("/api/v1/auth/logout")
async def logout(current_user: CurrentUser = Depends(get_current_user)):
    """
    Logout user (invalidate tokens).

    Args:
        current_user: Current authenticated user

    Returns:
        Success message
    """
    # TODO: Implement token blacklist in Redis for production
    # For MVP, client-side token deletion is sufficient
    return {"message": "Logged out successfully"}

@app.get("/api/v1/auth/me", response_model=CurrentUser)
async def get_current_user_info(current_user: CurrentUser = Depends(get_current_user)):
    """
    Get current user information.

    Args:
        current_user: Current authenticated user

    Returns:
        Current user info
    """
    return current_user

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "authentication"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
