# audit_products.py
#
# Nightly checkup for the LIVE site pages.
#   - Makes sure every Amazon link on the live pages carries the
#     rmoxie-20 affiliate tag (adds it when missing, fixes it when wrong).
#   - Prints a short summary so the workflow log shows what happened.
# It does NOT check whether links still load -- Amazon blocks automated
# checks too often for that to mean anything here. Dead links are caught
# by the weekly health scan instead. It never deletes anything.

import pathlib
import re
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent

AFFILIATE_TAG = "rmoxie-20"


def find_html_files():
    # Live pages live in the repo root and its subfolders.
    # Skip the retired site/ folder (old auto-generated pages, not live).
    return sorted(p for p in ROOT.glob("**/*.html") if "site" not in p.parts)


def ensure_affiliate_tag(url: str) -> str:
    if "amazon." not in url:
        return url
    if "tag=" in url:
        # Replace whatever tag is there with the correct one.
        parts = url.split("tag=")
        before = parts[0]
        after = parts[1].split("&", 1)
        rest = after[1] if len(after) > 1 else ""
        return f"{before}tag={AFFILIATE_TAG}" + (f"&{rest}" if rest else "")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}tag={AFFILIATE_TAG}"


def _replace_href(html: str, old: str, new: str):
    """Replace the exact quoted href value in the raw text.

    The closing quote is part of the match on purpose: a tagless URL is
    a prefix of the same URL with a tag, and a plain text replace would
    corrupt the already-correct copy. Returns (html, occurrences fixed).
    """
    variants = ((old, new), (old.replace("&", "&amp;"), new.replace("&", "&amp;")))
    for old_v, new_v in variants:
        pattern = re.compile(r'href=(["\'])' + re.escape(old_v) + r"\1")
        html, n = pattern.subn(lambda m: f"href={m.group(1)}{new_v}{m.group(1)}", html)
        if n:
            return html, n
    return html, 0


def audit_file(path: pathlib.Path) -> int:
    """Fix tags in one file. Returns how many links were fixed."""
    html = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    fixed = 0
    # Every Amazon link on the page, not just product cards: compare
    # tables carry buy links too, and they need the tag just the same.
    for a in soup.find_all("a", href=True):
        if "amazon." not in a["href"]:
            continue
        new_href = ensure_affiliate_tag(a["href"])
        if new_href != a["href"]:
            # Surgical swap of just this href value: the rest of the
            # file is untouched.
            html, n = _replace_href(html, a["href"], new_href)
            if n:
                fixed += 1

    if fixed:
        path.write_text(html, encoding="utf-8")
    return fixed


def main():
    files = find_html_files()
    total_fixed = 0
    for html_file in files:
        total_fixed += audit_file(html_file)
    print(f"Audited {len(files)} live pages, fixed {total_fixed} affiliate tags.")


if __name__ == "__main__":
    main()
