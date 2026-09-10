# Moxies eXtreme TechGear — Master SEO/Page Template

**Canonical site:** https://moxiesextremetechgear.com/

## Page-type architecture

- **Home:** WebSite + Organization context. One clear H1 and primary site navigation.
- **Editorial guide/article:** Article + BreadcrumbList. Use Person author `Moxie` only where the page visibly identifies Moxie as author. Use the About page as the author URL. Never imply hands-on testing unless the page explicitly documents it.
- **Category/hub:** CollectionPage + BreadcrumbList. The hub should link to its primary guides and explain how the cluster is organized.
- **FAQ:** FAQPage only when the visible page actually contains qualifying FAQ content. Do not add FAQ schema merely for SEO.
- **Legal/contact:** WebPage or ContactPage + BreadcrumbList. Do not mark legal pages as Article.

## Required head elements on indexable pages

1. UTF-8 charset
2. Responsive viewport
3. Unique, descriptive `<title>`
4. Unique meta description
5. Canonical URL using `https://moxiesextremetechgear.com/`
6. Favicon
7. Open Graph title/description/type/url/image
8. Twitter card/title/description/image
9. Appropriate structured data
10. No accidental `noindex`

## Heading rules

- Exactly one meaningful H1.
- H2s define major sections.
- H3s belong beneath relevant H2s.
- Do not use headings solely for visual styling.

## Breadcrumb rules

Use a visible breadcrumb trail and matching `BreadcrumbList` JSON-LD. Follow the user's likely navigation path, not merely URL segments. Example:

`Home → Storage Gear → NVMe SSD Guide`

The last breadcrumb may omit `item` in JSON-LD, but the visible breadcrumb remains clickable only when a destination exists.

## Internal-link rules

Every hub should link to its core guides. Every guide should link back to its hub and to at least two contextually related guides when useful. Avoid repetitive keyword-stuffed anchor text.

## Evidence/trust rules

- Distinguish **hands-on tested**, **personally owned/used**, **researched**, and **editorially selected**.
- Do not claim lab testing, ownership, measurements, or personal use unless documented on the page.
- Keep update dates truthful.
- Keep affiliate disclosures visible and linked to the full disclosure page.

## Standard content-page metadata pattern

```html
<title>Specific Search Intent | Moxies eXtreme TechGear</title>
<meta name="description" content="Specific, useful summary of the page and what a reader will learn.">
<link rel="canonical" href="https://moxiesextremetechgear.com/example.html">
<meta property="og:site_name" content="Moxies eXtreme TechGear">
<meta property="og:title" content="Specific Search Intent | Moxies eXtreme TechGear">
<meta property="og:description" content="Specific, useful summary of the page.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://moxiesextremetechgear.com/example.html">
<meta property="og:image" content="https://moxiesextremetechgear.com/social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Specific Search Intent | Moxies eXtreme TechGear">
<meta name="twitter:description" content="Specific, useful summary of the page.">
<meta name="twitter:image" content="https://moxiesextremetechgear.com/social-card.png">
```

## Cluster hierarchy decisions

- **Portable Computers:** `/portable-computers/index.html` is the hub; laptops, tablets/2-in-1s, and mini-PCs/handhelds are children.
- **Storage:** `/storage-gear/index.html` is the hub; `/storage-gear/ssd-guide.html` is the NVMe/SSD flagship guide; `/storage-gear/storage-gear.html` is the broader storage guide and should avoid competing with the SSD guide for the same primary intent.
- **Audio:** `/audio-gear/index.html` is the hub; `/audio-gear/headset-guide.html` is the primary child guide. `/audio-gear.html` should function as a distinct overview/landing page or eventually redirect/canonicalize to the hub if it has no unique search intent.
- **Coding:** `/coding-gear/index.html` is the hub; Linux/open-source, distro comparison, installation, gaming, Windows alternatives, keyboard, and mouse guides are supporting pages.

## Change-control rule

Prefer small, verifiable batches. After template/schema changes, validate HTML structure, canonical consistency, sitemap membership, breadcrumb URLs, JSON-LD parsing, and internal links before making content changes.
