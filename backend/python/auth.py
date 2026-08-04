import hmac
import hashlib
import base64
import json
import time
from typing import Optional
from fastapi import HTTPException, Header, Depends

SECRET_KEY = "ledger_claims_jwt_secret_key_production_2026_super_secure"

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode(data_str + padding)

def hash_password(password: str) -> str:
    salt = "ledger_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_jwt_token(payload: dict, expires_in_seconds: int = 86400) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = dict(payload)
    payload_copy["exp"] = int(time.time()) + expires_in_seconds

    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload_copy).encode('utf-8'))

    signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt_token(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts
        signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()

        if base64url_encode(expected_signature) != signature_b64:
            return None

        payload_bytes = base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        if payload.get("exp") and time.time() > payload["exp"]:
            return None

        return payload
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required. Missing or invalid Bearer token.")

    token = authorization.split("Bearer ")[1].strip()
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired JWT token.")

    return payload
