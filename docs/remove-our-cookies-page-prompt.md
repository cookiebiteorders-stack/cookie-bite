# Prompt: Remove Our Cookies Page from Cookie Bite Website

## Task Overview
Remove the "Our Cookies" page (`/our-cookies`) and all its references from the Cookie Bite website. This page currently displays cookie collections organized by category and is integrated throughout the site's navigation, SEO, and content structure.

## Files to Delete Completely

### Core Page Files
1. **`app/(site)/our-cookies/page.tsx`** - Main page component
2. **`components/pages/our-cookies-client.tsx`** - Client-side page component
3. **`components/our-cookies/our-cookies-testimonials.tsx`** - Testimonials component
4. **`components/our-cookies/our-cookies.css`** - Page-specific styles
5. **`components/sections/mobile-our-cookies-view.tsx`** - Mobile-specific view component

### Supporting Library Files
6. **`lib/content/our-cookies-seo.ts`** - SEO content and FAQ data
7. **`lib/storefront/our-cookies-sections.ts`** - Section building logic

## Files to Modify (Remove References)

### Navigation Components
8. **`components/layout/site-header.tsx`**
   - Remove `/our-cookies` from navigation menu (line ~146)
   - Remove `menuActive` check for `/our-cookies` (line ~116)
   - Remove `/our-cookies` from mobile menu (line ~229)

9. **`components/layout/site-footer.tsx`**
   - Remove `/our-cookies` from footer navigation (line ~26, ~80)

10. **`components/layout/mobile-header.tsx`**
    - Remove `/our-cookies` path check (line ~37, ~47)
    - Remove `/our-cookies` from navigation (line ~115)

### Other Page Components
11. **`components/sections/mobile-story-view.tsx`**
    - Remove `/our-cookies` link (line ~42)

12. **`components/sections/mobile-home-sections.tsx`**
    - Remove `/our-cookies` link (line ~49)

13. **`components/pages/our-story-client.tsx`**
    - Remove `/our-cookies` reference (line ~21, ~321)

14. **`components/ui/hero-section-5-motion.tsx`**
    - Remove `/our-cookies` link (line ~92)

15. **`app/not-found.tsx`**
    - Remove `/our-cookies` link (line ~55)

### SEO and Metadata Files
16. **`lib/seo/page-metadata.ts`**
    - Remove `/our-cookies` entry from page metadata (line ~19, ~258)

17. **`app/sitemap.ts`**
    - Remove `/our-cookies` from sitemap (line ~21)

18. **`lib/content/collections-seo.ts`**
    - Remove `/our-cookies` from related links (line ~61, ~231)

### AI and Knowledge Base Files
19. **`lib/ai/website-knowledge.ts`**
    - Remove `/our-cookies` entry from website pages (line ~81)

20. **`lib/mr-brownie/page-intent.ts`**
    - Remove `/our-cookies` path check (line ~34)

21. **`lib/mr-brownie/response-playbook.ts`**
    - Remove `/our-cookies` reference (line ~47)

### Utility and Config Files
22. **`lib/announcements/shared.ts`**
    - Remove `/our-cookies` path check (line ~47)

23. **`lib/data.ts`**
    - Remove `/our-cookies` from site navigation data (line ~17)

## Translation Cleanup
24. **`lib/i18n/translations.ts`**
    - Remove translation keys for `pages.ourCookies.*` and `nav.ourCookies`
    - Search for and remove all translation keys related to "ourCookies"

## Import Cleanup
After removing references, clean up unused imports in all modified files:
- Remove imports of deleted components (e.g., `OurCookiesClient`)
- Remove imports of deleted utility functions (e.g., `getOurCookiesPageFaq`, `buildOurCookiesSections`)
- Remove imports of deleted types (e.g., `OurCookieSectionIcon`)

## Testing Checklist
After completing the removal:
1. Run `npm run type-check` to ensure no TypeScript errors
2. Run `npm run lint` to check for linting issues
3. Start the dev server (`npm run dev`) and verify:
   - No 404 errors for missing imports
   - Navigation works correctly without the removed links
   - Footer displays properly
   - Mobile navigation functions correctly
4. Test the sitemap at `/sitemap.xml` to ensure it's valid
5. Verify no broken links in the application

## Additional Notes
- The removal should be complete and not leave any orphaned code
- Ensure redirects are NOT set up (this is a permanent removal, not a move)
- Consider if any analytics or tracking references to `/our-cookies` need to be removed
- Check if any cached data or references exist in the database that reference this page

## Execution Order
1. Delete the core page files first
2. Delete supporting library files
3. Modify navigation components
4. Modify other page components
5. Update SEO and metadata files
6. Update AI and knowledge base files
7. Update utility and config files
8. Clean up translations
9. Run type-check and lint
10. Test the application
