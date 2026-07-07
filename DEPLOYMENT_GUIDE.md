# CBE-Analytics Deployment Guide

## Overview

All code changes have been committed locally. Since the sandbox has no external internet access, you need to push the code and run the database migrations manually. Follow these steps in order.

---

## STEP 1: Push Code to GitHub

On your local machine (or GitHub web interface), push the committed changes:

```bash
cd eduhub
git pull  # if you have a local copy
```

Or download the updated files from the sandbox and push them.

**Alternatively**, if you have the repo locally:
```bash
git fetch origin
git merge origin/main
git push origin main
```

---

## STEP 2: Run Supabase Database Migration

Go to your **Supabase Dashboard** → **SQL Editor** and run the contents of `SEED_USERS.sql`.

This will:
- Add `master_super_admin` and `reseller_super_admin` to the `user_role` enum
- Create the `resellers` table
- Create the `parent_payments` table
- Add `reseller_id`, `parent_pay_enabled`, `view_results_fee`, `pdf_report_fee` columns to `schools`
- Set up Row Level Security policies
- Create indexes

---

## STEP 3: Create Auth Users in Supabase

Go to **Supabase Dashboard** → **Authentication** → **Users** → **Add User**

Create these users (with "Auto Confirm Email" checked):

| Email | Password | Role |
|-------|----------|------|
| `martinmakau2005@gmail.com` | `#Martin123456789` | master_super_admin |
| `theophillusngewa@gmail.com` | `123456789` | reseller_super_admin |
| `demoreseller@school.com` | `Demo@2025` | reseller_super_admin |

---

## STEP 4: Update Profiles with Correct Roles

After creating the auth users, run this SQL in the **Supabase SQL Editor**:

```sql
-- Update roles
UPDATE public.profiles SET role = 'master_super_admin', first_name = 'Martin', last_name = 'Makau'
WHERE email = 'martinmakau2005@gmail.com';

UPDATE public.profiles SET role = 'reseller_super_admin', first_name = 'Theophillus', last_name = 'Ngewa'
WHERE email = 'theophillusngewa@gmail.com';

UPDATE public.profiles SET role = 'reseller_super_admin', first_name = 'Demo', last_name = 'Reseller'
WHERE email = 'demoreseller@school.com';

-- Link reseller records to auth users
UPDATE public.resellers
SET user_id = (SELECT id FROM auth.users WHERE email = 'theophillusngewa@gmail.com')
WHERE email = 'theophillusngewa@gmail.com';

UPDATE public.resellers
SET user_id = (SELECT id FROM auth.users WHERE email = 'demoreseller@school.com')
WHERE email = 'demoreseller@school.com';

-- Verify
SELECT p.email, p.role, r.name AS reseller_name, r.parent_pay_enabled
FROM public.profiles p
LEFT JOIN public.resellers r ON r.user_id = p.id
WHERE p.role IN ('master_super_admin', 'reseller_super_admin');
```

---

## STEP 5: Deploy to Vercel

The project already has a `vercel.json` configured. Deploy using:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy with your token
VERCEL_TOKEN="your_vercel_token_here"
vercel --token $VERCEL_TOKEN --prod
```

Or connect via the Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Import the `GoldGain/eduhub` GitHub repository
3. Set environment variables (see below)
4. Deploy

---

## STEP 6: Set Vercel Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://naihzzlszvrkxrxogsuz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(your Supabase anon key)* |

---

## STEP 7: Verify All Features

After deployment, verify:

### ✅ Branding
- [ ] Site title shows "CBE-Analytics" everywhere
- [ ] No "EduConnect" or "EduHub" references remain

### ✅ Login & Redirects
- [ ] `martinmakau2005@gmail.com` → redirects to `/master-admin`
- [ ] `theophillusngewa@gmail.com` → redirects to `/reseller-admin`
- [ ] School admin → redirects to `/school-admin`

### ✅ Master Super Admin (`/master-admin`)
- [ ] Dashboard with platform-wide stats
- [ ] Resellers management (create, suspend, enable parent-pay)
- [ ] All Schools view (across all resellers)
- [ ] All Students view (across all resellers)
- [ ] All Payments view with export
- [ ] Platform Settings

### ✅ Reseller Super Admin (`/reseller-admin`)
- [ ] Dashboard shows ONLY their schools/students/revenue
- [ ] Schools management (add/edit schools)
- [ ] Payments view (ONLY their schools' payments)
- [ ] Change Password

### ✅ Data Isolation
- [ ] Theophillus cannot see Demo Reseller's schools
- [ ] Demo Reseller cannot see Theophillus's schools

### ✅ Grading Systems
- [ ] Primary (Grades 1-6): Shows EE/ME/AE/BE with marks only (NO points)
- [ ] Junior (Grades 7-9): Shows EE1/EE2/ME1/ME2/AE1/AE2/BE1/BE2 with points (1-8)
- [ ] 8-4-4: Shows A/A-/B+/B/B-/C+/C/C-/D+/D/D-/E with points (12-1)

### ✅ Paystack (Theophillus only)
- [ ] Parent-Pay enabled for Theophillus's schools
- [ ] Parents pay KES 50 to view results or download PDF
- [ ] Paystack public key: `pk_live_c15b4c6c95f06f7408326b14395eb727147a8935`

---

## User Credentials Summary

| Role | Email | Password |
|------|-------|----------|
| Master Super Admin | martinmakau2005@gmail.com | #Martin123456789 |
| Reseller (Theophillus) | theophillusngewa@gmail.com | 123456789 |
| Reseller (Demo) | demoreseller@school.com | Demo@2025 |
| Super Admin | super@edu.ac.ke | admin@2025 |
| School Admin | admin@greenfield.ac.ke | admin@2025! |
| Teacher | teacher@greenfield.ac.ke | Teacher@2025! |
| Student | student@greenfield.ac.ke | student@2025! |
| Parent | parent@greenfield.ac.ke | parent@2025! |
