#!/usr/bin/env python3
"""Run migration SQL against Supabase using the REST API."""
import os
import requests
import sys

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://naihzzlszvrkxrxogsuz.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

# Read the service role key from env or use anon key
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_KEY)

sql_file = sys.argv[1] if len(sys.argv) > 1 else "MULTI_TENANT_MIGRATION.sql"

with open(sql_file, "r") as f:
    sql = f.read()

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

# Use the Supabase SQL execution endpoint
resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
    headers=headers,
    json={"sql": sql},
    timeout=30,
)
print(f"Status: {resp.status_code}")
print(resp.text[:500])
