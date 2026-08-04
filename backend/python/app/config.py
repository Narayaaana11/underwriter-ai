import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 5000))
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-underwriter-agent-dev-environment-change-in-prod-12345!")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5000").split(",")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

DATA_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/store.json"))
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))

os.makedirs(UPLOADS_DIR, exist_ok=True)
