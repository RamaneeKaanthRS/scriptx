import psycopg2
import sys

passwords = ["Radiant_RAM@180516", "Radiant_RAM", "Radiant_RAM@180516"]
for pw in passwords:
    try:
        print(f"Attempting connection with password: {pw}")
        conn = psycopg2.connect(
            host="db.rxbkshcjqhutstlapetv.supabase.co",
            port=5432,
            user="postgres",
            password=pw,
            database="postgres"
        )
        print("Success!")
        conn.close()
        sys.exit(0)
    except Exception as e:
        print("Failed:", str(e))
        
print("All attempts failed.")
sys.exit(1)
