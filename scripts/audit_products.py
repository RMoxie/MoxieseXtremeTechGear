# audit_products.py

import pathlib
from bs4 import BeautifulSoup  # add to requirements.txt
import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_DIR = ROOT / "site"

AFFILIATE_TAG = "moxie-20"

def find_html_files():
    return list(SITE_DIR.glob("**/*.html"))

def ensure_affiliate_tag(url: str) -> str:
    if "amazon." not in url:
        return url
    if "tag=" in url:
        # replace existing tag
        parts = url.split("tag=")
        before = parts[0]
        after = parts[1].split("&", 1)
        rest = after[1] if len(after) > 1 else ""
        return f"{before}tag={AFFILIATE_TAG}" + (f"&{rest}" if rest else "")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}tag={AFFILIATE_TAG}"

def link_works(url: str) -> bool:
    try:
        r = requests.head(url, timeout=10, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False

def audit_file(path: pathlib.Path):
    html = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    changed = False

    for card in soup.select(".product-card"):
        img = card.find("img")
        a = card.find("a", href=True)

        # Fix affiliate tag
        if a and "amazon." in a["href"]:
            new_href = ensure_affiliate_tag(a["href"])
            if new_href != a["href"]:
                a["href"] = new_href
                changed = True

            # Check link works (optional: log failures)
            if not link_works(a["href"]):
                # TODO: replace with equivalent product or flag for manual review
                pass

        # Check image presence
        if img and not img.get("src"):
            # TODO: attempt to recover image from Amazon or flag
            pass

    if changed:
        path.write_text(str(soup), encoding="utf-8")

def main():
    for html_file in find_html_files():
        audit_file(html_file)

if __name__ == "__main__":
    main()

