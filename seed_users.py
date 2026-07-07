#!/usr/bin/env python3
"""
CBE-Analytics User Seeder
Creates all required auth users and profiles via Supabase Admin API
"""
import os
import json
import requests

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set")
    exit(1)

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

USERS = [
    {
        'email': 'martinmakau2005@gmail.com',
        'password': '#Martin123456789',
        'first_name': 'Martin',
        'last_name': 'Makau',
        'role': 'master_super_admin',
    },
    {
        'email': 'theophillusngewa@gmail.com',
        'password': '123456789',
        'first_name': 'Theophillus',
        'last_name': 'Ngewa',
        'role': 'reseller_super_admin',
    },
    {
        'email': 'demoreseller@school.com',
        'password': 'Demo@2025',
        'first_name': 'Demo',
        'last_name': 'Reseller',
        'role': 'reseller_super_admin',
    },
]

def create_user(user):
    """Create auth user via Supabase Admin API"""
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    payload = {
        'email': user['email'],
        'password': user['password'],
        'email_confirm': True,
        'user_metadata': {
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'role': user['role'],
        }
    }
    resp = requests.post(url, headers=headers, json=payload)
    if resp.status_code in (200, 201):
        data = resp.json()
        print(f"  ✅ Created: {user['email']} (ID: {data.get('id', 'unknown')})")
        return data.get('id')
    elif resp.status_code == 422:
        # User already exists - get their ID
        print(f"  ℹ️  Already exists: {user['email']}")
        # Try to get user by email
        list_url = f"{SUPABASE_URL}/auth/v1/admin/users?email={user['email']}"
        list_resp = requests.get(list_url, headers=headers)
        if list_resp.status_code == 200:
            users_data = list_resp.json()
            if isinstance(users_data, dict) and 'users' in users_data:
                for u in users_data['users']:
                    if u.get('email') == user['email']:
                        return u.get('id')
        return None
    else:
        print(f"  ❌ Failed: {user['email']} - {resp.status_code}: {resp.text[:200]}")
        return None

def update_profile(user_id, user):
    """Update profile with correct role"""
    url = f"{SUPABASE_URL}/rest/v1/profiles"
    payload = {
        'id': user_id,
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'role': user['role'],
        'email': user['email'],
    }
    resp = requests.post(
        url,
        headers={**headers, 'Prefer': 'resolution=merge-duplicates,return=representation'},
        json=payload
    )
    if resp.status_code in (200, 201):
        print(f"  ✅ Profile updated: {user['email']} -> {user['role']}")
    else:
        print(f"  ⚠️  Profile update: {resp.status_code}: {resp.text[:200]}")

def seed_reseller(user_id, user):
    """Create reseller record"""
    if user['role'] != 'reseller_super_admin':
        return
    
    url = f"{SUPABASE_URL}/rest/v1/resellers"
    
    extra = {}
    if user['email'] == 'theophillusngewa@gmail.com':
        extra = {
            'paystack_public_key': 'pk_live_c15b4c6c95f06f7408326b14395eb727147a8935',
            'parent_pay_enabled': True,
            'view_results_fee': 50,
            'pdf_report_fee': 50,
        }
    
    payload = {
        'user_id': user_id,
        'name': f"{user['first_name']} {user['last_name']}",
        'email': user['email'],
        'status': 'active',
        **extra,
    }
    resp = requests.post(
        url,
        headers={**headers, 'Prefer': 'resolution=merge-duplicates,return=representation'},
        json=payload
    )
    if resp.status_code in (200, 201):
        print(f"  ✅ Reseller record created: {user['email']}")
    else:
        print(f"  ⚠️  Reseller record: {resp.status_code}: {resp.text[:200]}")

print("=" * 60)
print("CBE-Analytics User Seeder")
print("=" * 60)

for user in USERS:
    print(f"\nProcessing: {user['email']} ({user['role']})")
    user_id = create_user(user)
    if user_id:
        update_profile(user_id, user)
        seed_reseller(user_id, user)

print("\n" + "=" * 60)
print("Seeding complete!")
print("=" * 60)
print("\nUser Credentials Summary:")
print("-" * 60)
for u in USERS:
    print(f"  Role: {u['role']}")
    print(f"  Email: {u['email']}")
    print(f"  Password: {u['password']}")
    print()
