# Google Search Console Setup Guide for CBE-Analytics

## Overview

This guide walks you through verifying your site with Google Search Console, submitting your sitemap, and monitoring search performance for **CBE-Analytics** (`https://cbe-analytics.com`).

---

## Step 1: Add Your Property to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console/welcome).
2. Click **"Add property"**.
3. Choose **"URL prefix"** and enter: `https://cbe-analytics.com`
4. Click **Continue**.

---

## Step 2: Verify Ownership

Google offers several verification methods. The two easiest for a Vite/React app deployed on Vercel are:

### Option A: HTML Meta Tag (Recommended for React SPAs)

1. Google will give you a `<meta>` tag like:
   ```html
   <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   ```
2. Open `index.html` in your project and add the tag inside `<head>`:
   ```html
   <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   ```
3. Commit and push to GitHub — Vercel will auto-deploy.
4. Return to Search Console and click **Verify**.

### Option B: HTML File Upload

1. Download the `googleXXXXXXXXXXXXXXXX.html` verification file from Search Console.
2. Place it in the `/public/` folder of your project:
   ```
   /public/googleXXXXXXXXXXXXXXXX.html
   ```
3. Commit and push to GitHub — Vercel will auto-deploy.
4. Return to Search Console and click **Verify**.

### Option C: DNS TXT Record (via Vercel or your domain registrar)

1. Copy the TXT record value from Search Console.
2. Go to your domain registrar (e.g., Namecheap, GoDaddy) or Vercel DNS settings.
3. Add a new **TXT record** with:
   - **Host**: `@`
   - **Value**: `google-site-verification=YOUR_CODE`
4. Wait 5–15 minutes, then click **Verify** in Search Console.

---

## Step 3: Submit Your Sitemap

Once verified:

1. In the left sidebar, click **Sitemaps**.
2. In the "Add a new sitemap" field, enter:
   ```
   sitemap.xml
   ```
3. Click **Submit**.

Your sitemap is already live at: `https://cbe-analytics.com/sitemap.xml`

It includes the following URLs:
- `https://cbe-analytics.com/` (Homepage)
- `https://cbe-analytics.com/login`
- `https://cbe-analytics.com/register`
- `https://cbe-analytics.com/pricing`
- `https://cbe-analytics.com/about`
- `https://cbe-analytics.com/contact`

---

## Step 4: Verify robots.txt

Your `robots.txt` is live at: `https://cbe-analytics.com/robots.txt`

It correctly:
- Allows crawling of public pages (`/`, `/login`, `/register`, `/pricing`, `/about`, `/contact`)
- Blocks dashboard routes (`/teacher/`, `/student/`, `/parent/`, `/school-admin/`, `/super-admin/`)
- References the sitemap

To verify, visit: `https://cbe-analytics.com/robots.txt`

---

## Step 5: Request Indexing for Key Pages

After verification:

1. In Search Console, use the **URL Inspection** tool (top search bar).
2. Enter `https://cbe-analytics.com/` and press Enter.
3. Click **"Request Indexing"** to fast-track crawling.
4. Repeat for `/login` and `/register`.

---

## Step 6: Monitor Performance

Once Google starts indexing (usually within 1–7 days):

| Report | Location | What to Check |
|---|---|---|
| **Coverage** | Index > Coverage | Ensure no pages are erroneously blocked |
| **Performance** | Performance > Search results | Track clicks, impressions, CTR, and position |
| **Core Web Vitals** | Experience > Core Web Vitals | Monitor LCP, FID, CLS scores |
| **Mobile Usability** | Experience > Mobile Usability | Ensure no mobile issues |
| **Sitemaps** | Indexing > Sitemaps | Confirm sitemap is processed without errors |

---

## Step 7: Structured Data Validation

Your site already includes JSON-LD structured data for the `WebApplication` schema.

To validate:

1. Go to [Google Rich Results Test](https://search.google.com/test/rich-results).
2. Enter `https://cbe-analytics.com/` and click **Test URL**.
3. Confirm the `WebApplication` structured data is detected without errors.

---

## SEO Summary: What Was Added to CBE-Analytics

The following SEO improvements were made in this update:

| File | Change |
|---|---|
| `index.html` | Added full meta tags, Open Graph, Twitter Card, JSON-LD structured data |
| `public/sitemap.xml` | Created sitemap with all public routes |
| `public/robots.txt` | Created robots.txt with correct allow/disallow rules |
| `src/components/SEO.tsx` | Reusable SEO component for per-page meta tags |
| `src/pages/Home.tsx` | Added SEO component with homepage-specific tags |
| `src/pages/auth/Login.tsx` | Added SEO component with login-specific tags |

### Target Keywords

The site is optimised for the following search terms:

- `CBE Analytics`
- `CBC grading Kenya`
- `school management system Kenya`
- `competency based education portal`
- `student results portal Kenya`
- `CBC report card`
- `Kenya school portal`
- `CBE portal`
- `CBC school system`

---

## Important Notes

- **If your custom domain is `cbe-analytics.com`**: Update the `BASE_URL` constant in `src/components/SEO.tsx` to match your actual domain.
- **If you are still on `cbe-analytics.vercel.app`**: Update all `https://cbe-analytics.com` references in `index.html`, `sitemap.xml`, `robots.txt`, and `SEO.tsx` to `https://cbe-analytics.vercel.app`.
- **OG Image**: Create a `1200×630` image and place it at `public/og-image.png` for social sharing previews.

---

*Generated by CBE-Analytics development workflow — June 2025*
