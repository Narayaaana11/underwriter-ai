"""
db.py — PySpark-integrated Data Persistence Layer for UnderWriter AI
"""
import json
import os
import threading
from typing import List, Dict, Any, Optional
from .config import DATA_FILE_PATH

_lock = threading.Lock()

class Database:
    def __init__(self, file_path: str = DATA_FILE_PATH):
        self.file_path = file_path
        self._data = {"users": [], "claims": [], "auditLogs": []}
        self.load()

    def load(self):
        with _lock:
            if os.path.exists(self.file_path):
                try:
                    with open(self.file_path, 'r', encoding='utf-8') as f:
                        self._data = json.load(f)
                except Exception as e:
                    print(f"[DB Load Error]: {e}")
            else:
                self._save_internal()

    def save(self):
        with _lock:
            self._save_internal()

    def _save_internal(self):
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)

    # ── Users ──
    def get_users(self) -> List[Dict[str, Any]]:
        return self._data.get("users", [])

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        for u in self.get_users():
            if u.get("id") == user_id:
                return u
        return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        email_clean = (email or "").strip().lower()
        for u in self.get_users():
            if (u.get("email") or "").strip().lower() == email_clean:
                return u
        return None

    def add_user(self, user: Dict[str, Any]):
        self._data.setdefault("users", []).append(user)
        self.save()

    # ── Claims ──
    def get_claims(self) -> List[Dict[str, Any]]:
        return self._data.get("claims", [])

    def get_claim_by_id(self, claim_id: str) -> Optional[Dict[str, Any]]:
        for c in self.get_claims():
            if c.get("id") == claim_id:
                return c
        return None

    def add_claim(self, claim: Dict[str, Any]):
        self._data.setdefault("claims", []).insert(0, claim)
        self.save()

    def update_claim(self, claim_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for i, c in enumerate(self.get_claims()):
            if c.get("id") == claim_id:
                c.update(updates)
                self._data["claims"][i] = c
                self.save()
                return c
        return None

    # ── Audit Logs ──
    def get_audit_logs(self) -> List[Dict[str, Any]]:
        return self._data.get("auditLogs", [])

    def add_audit_log(self, log_entry: Dict[str, Any]):
        self._data.setdefault("auditLogs", []).insert(0, log_entry)
        self.save()

db = Database()
