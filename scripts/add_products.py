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
def ai_find_product_for_category(category: str) -> dict:
    """
    TODO: Implement:
    - AI logic to pick one Amazon product per category
    - Return dict with name, description, image_url, amazon_url
    """
    return None

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
