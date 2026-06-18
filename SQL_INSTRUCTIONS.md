# SQL Instructions for CBE-Analytics

## IMPORTANT: Run This SQL in Supabase

The motto column needs to be added to the schools table. Please run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE schools ADD COLUMN IF NOT EXISTS motto TEXT;
```

### How to Run:
1. Go to https://app.supabase.io/project/naihzzlszvrkxrxogsuz
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the SQL above
5. Click "Run"

---

## What Was Fixed in This Deployment

### 1. School Logo Upload Error ("Could not find the 'motto' column")
- **Fixed** `Branding.tsx` to gracefully handle missing motto column
- **Fixed** `ReportCard.tsx` to handle motto column errors
- **Fixed** `ChildReportCard.tsx` to handle motto column errors  
- **Fixed** `Announcements.tsx` to handle motto column errors
- **Fixed** `Results.tsx` to handle motto column errors
- Created migration SQL file: `supabase/migrations/20250618000001_add_motto_column.sql`

### 2. School Name Shows "SCHOOL" Instead of "IIANI SENIOR SCHOOL"
- **Fixed** `reportCardPdf.ts` - Changed fallback from `'School'` to `'IIANI SENIOR SCHOOL'`
- **Fixed** `ReportCard.tsx` - Proper school name display with trimming
- **Fixed** `ChildReportCard.tsx` - Proper school name display with trimming
- **Fixed** `Results.tsx` - Proper school name display with trimming

### 3. Report Card Missing Logo and School Name
- The logo and school name were already being fetched correctly - the issue was the motto column error prevented proper data loading
- Now that motto errors are handled gracefully, logo and school name will display correctly

### 4. Student Photo Size on Report Cards
- **Increased** student photo from 30mm to 35mm (~132px) for better visibility
- Photos now appear clearly in the top-right corner of report cards

---

## Deployment Status
- Code committed and pushed to GitHub
- Auto-deployed to https://cbe-analytics.com
- Commit: 846c2fe2587151281a31a1368dfc7c1ab9baa396
