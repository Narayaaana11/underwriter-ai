"""
auth.py — JWT Authentication & Role-Based Access Control (RBAC)
"""
import time
import jwt
import bcrypt
from typing import Dict, Any, Optional
from fastapi import Request, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import JWT_SECRET

security = HTTPBearer()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def compare_password(password: str, password_hash: Optional[str]) -> bool:
    if not password_hash:
        return False
    try:
        if password_hash.startswith("plain:"):
            return password == password_hash.replace("plain:", "")
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def generate_token(user: Dict[str, Any]) -> str:
    payload = {
        "id": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role"),
        "name": user.get("name"),
        "company": user.get("company", "Independent"),
        "iat": int(time.time()),
        "exp": int(time.time()) + (24 * 60 * 60) # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token_str: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token_str, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    token = credentials.credentials
    return verify_token(token)

def safe_user(user: Dict[str, Any]) -> Dict[str, Any]:
    safe = dict(user)
    safe.pop("passwordHash", None)
    safe.pop("plainPasswordForSeed", None)
    return safe
