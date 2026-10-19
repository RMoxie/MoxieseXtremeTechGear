# add_products.py

import pathlib
import json

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MANUAL_FILE = DATA_DIR / "manual_products.json"   # your links
SITE_DIR = ROOT / "site"                          # your HTML files

TRENDING_CATEGORY_FILE = SITE_DIR / "trending-tech-picks.html"

# ---------------------------------------------------------
# CATEGORY LIST (one product per category per day)
# ---------------------------------------------------------
CATEGORIES = [
    "drones",
    "audio",
    "portable-computers",
    "storage",
    "coding",
    "desktop-systems",
    "scuba",
    "trending-tech-picks"  # catch-all
]
BEST_SELLER_URLS = {
    "drones": "https://www.amazon.com/Best-Sellers-Camera-Photo-Drones/zgbs/photo/2975392011",
    "audio": "https://www.amazon.com/Best-Sellers-Electronics-Headphones/zgbs/electronics/172541",
    "portable-computers": "https://www.amazon.com/Best-Sellers-Computers-Tablets/zgbs/pc/541966",
    "storage": "https://www.amazon.com/Best-Sellers-Computers-Accessories-External-Hard-Drives/zgbs/pc/595048",
    # pick one for coding:
    # "coding": "https://www.amazon.com/Best-Sellers-Computers-Accessories-Computer-Keyboards/zgbs/pc/172574",
    "coding": "https://www.amazon.com/Best-Sellers-Books-Programming/zgbs/books/3952",
    "desktop-systems": "https://www.amazon.com/Best-Sellers-Computers-Accessories-Desktop-Computers/zgbs/pc/565098",
    "scuba": "https://www.amazon.com/Best-Sellers-Sports-Outdoors-Diving-Snorkeling/zgbs/sporting-goods/3410851",
    "trending-tech-picks": "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics",
}

AFFILIATE_TAG = "moxie-20"

# ---------------------------------------------------------
# LOAD / CLEAR MANUAL PRODUCTS
# ---------------------------------------------------------
def load_manual_products():
    if not MANUAL_FILE.exists():
        return []
    with MANUAL_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)

def clear_manual_products():
    MANUAL_FILE.write_text("[]", encoding="utf-8")

# ---------------------------------------------------------
# FETCH AMAZON PRODUCT (placeholder)
# ---------------------------------------------------------
def fetch_amazon_product(url: str) -> dict:
    """
    TODO: Implement:
    - Fetch title
    - Fetch description
    - Fetch main image URL
    - Normalize affiliate tag (moxie-20)
    """
    return {
        "name": "Example Product",
        "description": "Short description from Amazon.",
        "image_url": "https://example.com/image.jpg",
        "amazon_url": url,
    }

# ---------------------------------------------------------
# AI PRODUCT PICKER (placeholder)
# ---------------------------------------------------------
import requests
from bs4 import BeautifulSoup

def ensure_affiliate_tag(url: str) -> str:
    if "amazon." not in url:
        return url
    if "tag=" in url:
        parts = url.split("tag=")
        before = parts[0]
        after = parts[1].split("&", 1)
        rest = after[1] if len(after) > 1 else ""
        return f"{before}tag={AFFILIATE_TAG}" + (f"&{rest}" if rest else "")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}tag={AFFILIATE_TAG}"

def ai_find_product_for_category(category: str) -> dict:
    url = BEST_SELLER_URLS.get(category)
    if not url:
        return None

    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
    except Exception:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Amazon Best Seller pages often use this structure; may need tweaking over time
    item = soup.select_one(".zg-grid-general-faceout, .zg-item-immersion, .a-section.a-spacing-none.p13n-asin")
    if not item:
        return None

    # Title
    title_el = item.select_one(".p13n-sc-truncated, .a-link-normal")
    name = title_el.get_text(strip=True) if title_el else "Amazon Best Seller"

    # Link
    link_el = item.select_one("a.a-link-normal")
    if link_el and link_el.get("href"):
        product_url = "https://www.amazon.com" + link_el["href"].split("?", 1)[0]
    else:
        product_url = url

    product_url = ensure_affiliate_tag(product_url)

    # Image
    img_el = item.select_one("img")
    image_url = img_el.get("src") if img_el and img_el.get("src") else "https://via.placeholder.com/400x400?text=Product"

    # Description (simple version: reuse title)
    description = f"Trending pick in {category.replace('-', ' ').title()} from Amazon Best Sellers."

    return {
        "name": name,
        "description": description,
        "image_url": image_url,
        "amazon_url": product_url,
    }

# ---------------------------------------------------------
# ONE PRODUCT PER CATEGORY PER DAY
# ---------------------------------------------------------
def get_one_product_per_category():
    results = {}

    manual_products = load_manual_products()

    for category in CATEGORIES:

        # 1) Manual override for this category
        manual = [
            p for p in manual_products
            if p.get("category") == category
        ]
        if manual:
            results[category] = fetch_amazon_product(manual[0]["amazon_url"])
            continue

        # 2) AI-selected product for this category
        ai_product = ai_find_product_for_category(category)
        if ai_product:
            results[category] = ai_product
            continue

        # 3) Fallback: Trending Tech Picks
        fallback = ai_find_product_for_category("trending-tech-picks")
        if fallback:
            results[category] = fallback

    return results

# ---------------------------------------------------------
# CATEGORY ASSIGNMENT
# ---------------------------------------------------------
def assign_category(product: dict) -> str:
    return "trending-tech-picks"

# ---------------------------------------------------------
# BUILD PRODUCT CARD HTML
# ---------------------------------------------------------
def build_product_card(product: dict) -> str:
    return f"""
<div class="product-card">
  <img src="{product['image_url']}" alt="{product['name']}">
  <h3>{product['name']}</h3>
  <p>{product['description']}</p>
  <a href="{product['amazon_url']}">View on Amazon</a>
</div>
""".strip()

# ---------------------------------------------------------
# INSERT PRODUCT INTO CATEGORY HTML FILE
# ---------------------------------------------------------
def insert_into_category(category: str, card_html: str):
    target = SITE_DIR / f"{category}.html"

    # If file doesn't exist, create a basic skeleton
    if not target.exists():
        target.write_text("<div class=\"products\">\n</div>\n", encoding="utf-8")

    content = target.read_text(encoding="utf-8")

    if "</div>" in content:
        content = content.replace("</div>", f"  {card_html}\n</div>")
    else:
        content += f"\n{card_html}\n"

    target.write_text(content, encoding="utf-8")

# ---------------------------------------------------------
# MAIN PROCESS
# ---------------------------------------------------------
def main():
    # 1) Manual products
    manual_products = load_manual_products()
    for entry in manual_products:
        product = fetch_amazon_product(entry["amazon_url"])
        category = entry.get("category") or assign_category(product)
        card = build_product_card(product)
        insert_into_category(category, card)

    clear_manual_products()

    # 2) AI-picked products (one per category per day)
    category_products = get_one_product_per_category()

    for category, product in category_products.items():
        if not product:
            continue
        card = build_product_card(product)
        insert_into_category(category, card)

# ---------------------------------------------------------
# RUN SCRIPT
# ---------------------------------------------------------
if __name__ == "__main__":
    main()
