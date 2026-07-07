/**
 * SEO.tsx
 * Reusable SEO component that injects meta tags, Open Graph tags,
 * Twitter Card tags, and JSON-LD structured data into the document head.
 *
 * Usage:
 *   <SEO
 *     title="Teacher Dashboard | Kimatu Analytics"
 *     description="Manage your classes, upload results, and track student performance."
 *     path="/teacher"
 *   />
 */

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  structuredData?: object;
}

const SITE_NAME = 'Kimatu Analytics';
const BASE_URL = 'https://kimatu.company';
const DEFAULT_DESCRIPTION =
  "Kimatu Analytics is Kenya's leading school management system. Manage learners, learning areas, assessments, fees, and report cards. Supports CBE and 8-4-4 curricula for Pre-Primary, Primary, Junior, and Senior schools.";
const DEFAULT_IMAGE = `${BASE_URL}/kimatu-logo-full.png`;

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  structuredData,
}: SEOProps) {
  const fullTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Smarter Schools, Brighter Futures`;
  const canonicalUrl = `${BASE_URL}${path}`;

  useEffect(() => {
    // ── Title ──────────────────────────────────────────────────────────────────
    document.title = fullTitle;

    // ── Helper: set or create a <meta> tag ────────────────────────────────────
    const setMeta = (selector: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        // Parse attribute from selector, e.g. [name="description"] → name="description"
        const match = selector.match(/\[(\w+)="([^"]+)"\]/);
        if (match) el.setAttribute(match[1], match[2]);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // ── Helper: set or create a <link> tag ────────────────────────────────────
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // ── Basic meta ─────────────────────────────────────────────────────────────
    setMeta('[name="description"]', description);
    setMeta('[name="robots"]', noindex ? 'noindex,nofollow' : 'index,follow');
    setMeta('[name="author"]', SITE_NAME);
    setMeta('[name="keywords"]', 'Kimatu, Analytics, School Management, CBE, 8-4-4, Kenya, Education, School System, Learner Management, Report Cards, Fee Management');
    setLink('canonical', canonicalUrl);

    // ── Open Graph ─────────────────────────────────────────────────────────────
    setMeta('[property="og:title"]', fullTitle);
    setMeta('[property="og:description"]', description);
    setMeta('[property="og:url"]', canonicalUrl);
    setMeta('[property="og:type"]', type);
    setMeta('[property="og:image"]', image);
    setMeta('[property="og:site_name"]', SITE_NAME);
    setMeta('[property="og:locale"]', 'en_KE');

    // ── Twitter Card ───────────────────────────────────────────────────────────
    setMeta('[name="twitter:card"]', 'summary_large_image');
    setMeta('[name="twitter:title"]', fullTitle);
    setMeta('[name="twitter:description"]', description);
    setMeta('[name="twitter:image"]', image);
    setMeta('[name="twitter:url"]', canonicalUrl);

    // ── JSON-LD Structured Data ────────────────────────────────────────────────
    if (structuredData) {
      const id = 'seo-structured-data';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }
  }, [fullTitle, description, canonicalUrl, image, type, noindex, structuredData]);

  return null;
}
