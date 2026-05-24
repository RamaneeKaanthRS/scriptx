import sys
import os

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from api.database import engine, Script, Base
    print("Database URL configured:", engine.url)
    
    # Try connecting
    with engine.connect() as conn:
        print("Successfully connected to Supabase PostgreSQL!")
        
    # Check if tables exist
    from sqlalchemy import inspect
    inspector = inspect(engine)
    print("Existing tables in Supabase:", inspector.get_table_names())
except Exception as e:
    print("Database test failed with error:", str(e))
    sys.exit(1)
