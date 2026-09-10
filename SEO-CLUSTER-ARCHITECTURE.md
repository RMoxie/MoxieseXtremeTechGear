# Moxies eXtreme TechGear — SEO Cluster Architecture

## Canonical hub map

### Portable Computers
- Hub: `/portable-computers/index.html`
- Laptops: `/portable-computers/laptops.html`
- Tablets & 2-in-1s: `/portable-computers/tablets-2-in-1s.html`
- Mini PCs & Handhelds: `/portable-computers/mini-pcs-handhelds.html`

### Storage
- Hub: `/storage-gear/index.html`
- Flagship NVMe/SSD guide: `/storage-gear/ssd-guide.html`
- Broader storage guide: `/storage-gear/storage-gear.html`

Primary-intent rule: the SSD guide owns NVMe/SSD performance and thermal-solution searches. The broader storage guide owns general storage selection, external storage, capacity, and use-case searches. Avoid publishing another page whose primary intent is simply “best NVMe SSDs.”

### Audio
- Hub: `/audio-gear/index.html`
- Desktop/general audio overview: `/audio-gear.html`
- Headset guide: `/audio-gear/headset-guide.html`

The two audio landing pages are retained because they can serve different intents. The `/audio-gear/index.html` page is the navigational cluster hub; `/audio-gear.html` should remain focused on desktop/general audio rather than competing for the same “audio gear guides” query.

### Coding & Software
- Hub: `/coding-gear/index.html`
- Linux/Open Source: `/coding-gear/linux-open-source.html`
- Ubuntu vs Mint vs Fedora: `/coding-gear/ubuntu-vs-mint-vs-fedora.html`
- Linux Live USB: `/coding-gear/linux-live-usb-install-guide.html`
- Linux Gaming / Steam Proton: `/coding-gear/linux-gaming-steam-proton.html`
- Windows-to-Linux alternatives: `/coding-gear/windows-to-linux-app-alternatives.html`
- Keyboard guide: `/coding-gear/keyboard-guide.html`
- Mouse guide: `/coding-gear/mouse-guide.html`

Primary-intent rule: the hub targets broad software/coding-guide discovery; child pages target their specific questions. Keyboard and mouse pages are supporting hardware guides, not replacements for the coding hub.

## Internal-link pattern

Every hub should link to every primary child. Every child should link back to its hub. Supporting guides should link laterally only where the relationship genuinely helps the reader.

## Breadcrumb pattern

- Home → Hub → Child guide
- Home → Hub for the hub itself
- Home → Standalone guide for pages that do not belong to a formal cluster
- Home → About/Contact/Privacy/Affiliate Disclosure/Terms for trust pages

## Canonicalization policy

Do not canonicalize two live pages to one URL merely because they are in the same topic. Canonicalize only when the pages are duplicates or near-duplicates and one is clearly the preferred version. Preserve distinct search intent where both pages have unique value.

## Priority follow-up

1. Compare the actual copy of the Audio landing pages and Storage pages for intent overlap.
2. Add explicit hub links where absent.
3. Keep one primary H1 per page.
4. Review titles/descriptions against the assigned intent.
5. Review image alt text and internal anchor text.
6. Validate JSON-LD with Google's Rich Results Test and inspect representative URLs in Search Console after deployment.
