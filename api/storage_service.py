import os
import uuid
import logging
import requests

# Configure logging
logger = logging.getLogger(__name__)

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))
SCRIPTS_DIR = os.path.join(STORAGE_DIR, "scripts")
os.makedirs(SCRIPTS_DIR, exist_ok=True)

# Supabase Credentials (loaded from environment)
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
# Accept either standard server key or fallback to the client-side key provided by the user
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
BUCKET_NAME = "screenplays"

def is_supabase_configured() -> bool:
    """Check if the necessary Supabase credentials are configured in the environment."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

def upload_to_supabase(file_path_name: str, file_content: bytes) -> str:
    """Uploads file content directly to Supabase Storage via REST API."""
    url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{BUCKET_NAME}/{file_path_name}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/octet-stream"
    }
    
    logger.info(f"Attempting to upload screenplay to Supabase Storage: {url}")
    response = requests.post(url, data=file_content, headers=headers, timeout=10)
    
    if response.status_code == 200:
        logger.info(f"Successfully uploaded file to Supabase: {file_path_name}")
        # Return the Supabase URL or relative path
        return f"supabase://{BUCKET_NAME}/{file_path_name}"
    else:
        # Check if the bucket does not exist or user is unauthenticated
        error_msg = response.json().get("error", response.text) if response.headers.get("content-type") == "application/json" else response.text
        raise Exception(f"Supabase Storage upload failed with status {response.status_code}: {error_msg}")

def delete_from_supabase(file_path_name: str) -> bool:
    """Deletes a file from Supabase Storage via REST API."""
    # Strip any prefix like 'supabase://bucket/'
    clean_path = file_path_name
    prefix = f"supabase://{BUCKET_NAME}/"
    if clean_path.startswith(prefix):
        clean_path = clean_path[len(prefix):]
        
    url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{BUCKET_NAME}/{clean_path}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    logger.info(f"Attempting to delete screenplay from Supabase Storage: {url}")
    response = requests.delete(url, headers=headers, timeout=10)
    
    if response.status_code == 200:
        logger.info(f"Successfully deleted file from Supabase: {clean_path}")
        return True
    else:
        logger.error(f"Failed to delete file from Supabase Storage: {response.text}")
        return False

class StorageService:
    @staticmethod
    def save_file(file_name: str, file_content: bytes) -> str:
        """
        Saves file either to Supabase Storage (if configured) or falls back to local disk.
        Returns the saved file path identifier (local path or supabase:// path).
        """
        unique_prefix = str(uuid.uuid4())
        safe_file_name = f"{unique_prefix}_{file_name}"
        
        # 1. Try Supabase Cloud Storage if configured
        if is_supabase_configured():
            try:
                return upload_to_supabase(safe_file_name, file_content)
            except Exception as e:
                logger.warning(f"Supabase Storage failed, falling back to local disk: {e}")
                # Fallback to local storage on exception
        
        # 2. Local Disk Storage Mode / Fallback
        local_path = os.path.join(SCRIPTS_DIR, safe_file_name)
        logger.info(f"Saving screenplay locally to disk: {local_path}")
        with open(local_path, "wb") as f:
            f.write(file_content)
        return local_path

    @staticmethod
    def delete_file(file_path: str) -> bool:
        """
        Deletes a screenplay file from either local disk or Supabase Storage
        based on the file path prefix.
        """
        if not file_path:
            return False
            
        if file_path.startswith("supabase://"):
            return delete_from_supabase(file_path)
            
        # Local file deletion
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Successfully deleted local file: {file_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete local file {file_path}: {e}")
                return False
        return False

    @staticmethod
    def read_file_text(file_path: str) -> str:
        """
        Reads text content of a screenplay from either local disk or Supabase Storage.
        """
        if not file_path:
            return ""
            
        if file_path.startswith("supabase://"):
            # Download file from Supabase Storage
            clean_path = file_path
            prefix = f"supabase://{BUCKET_NAME}/"
            if clean_path.startswith(prefix):
                clean_path = clean_path[len(prefix):]
                
            url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{BUCKET_NAME}/{clean_path}"
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
            logger.info(f"Downloading screenplay content from Supabase Storage: {url}")
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                return response.text
            else:
                raise Exception(f"Failed to read screenplay from Supabase Storage: {response.text}")
                
        # Local file read
        if os.path.exists(file_path):
            with open(file_path, "r", errors="ignore") as f:
                return f.read()
        return ""
