
# add_products.py

import pathlib
import json

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MANUAL_FILE = DATA_DIR / "manual_products.json"   # your links
SITE_DIR = ROOT / "site"                          # your HTML files

TRENDING_CATEGORY_FILE = SITE_DIR / "trending-tech-picks.html"

def load_manual_products():
    if not MANUAL_FILE.exists():
        return []
    with MANUAL_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)

def clear_manual_products():
    MANUAL_FILE.write_text("[]", encoding="utf-8")

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

def ai_find_products() -> list:
    """
    TODO: Implement:
    - Use an AI/API to select new Amazon products
    - Return list of product dicts with name, description, image_url, amazon_url
    """
    return []

def assign_category(product: dict) -> str:
    """
    If you later want smarter routing, add logic here.
    For now:
    - Manual products: you can add a 'category' field in manual_products.json
    - AI-picked products: default to Trending Tech Picks
    """
    return "trending-tech-picks"

def build_product_card(product: dict) -> str:
    """
    Returns an HTML snippet for a single product card.
    Match your Drone category structure.
    """
    return f"""
<div class="product-card">
  <img src="{product['image_url']}" alt="{product['name']}">
  <h3>{product['name']}</h3>
  <p>{product['description']}</p>
  <a href="{product['amazon_url']}">View on Amazon</a>
</div>
""".strip()

def insert_into_category(category: str, card_html: str):
    """
    For now, treat Trending Tech Picks as a single HTML file.
    Later you can generalize this to other categories.
    """
    target = TRENDING_CATEGORY_FILE
    if not target.exists():
        # basic skeleton
        target.write_text("<div class=\"products\">\n</div>\n", encoding="utf-8")

    content = target.read_text(encoding="utf-8")
    if "</div>" in content:
        content = content.replace("</div>", f"  {card_html}\n</div>")
    else:
        content += f"\n{card_html}\n"
    target.write_text(content, encoding="utf-8")

def main():
    # 1) Manual products
    manual_products = load_manual_products()
    for entry in manual_products:
        product = fetch_amazon_product(entry["amazon_url"])
        category = entry.get("category") or assign_category(product)
        card = build_product_card(product)
        insert_into_category(category, card)

    clear_manual_products()

    # 2) AI-picked products
    ai_products = ai_find_products()
    for product in ai_products:
        category = assign_category(product)
        card = build_product_card(product)
        insert_into_category(category, card)

if __name__ == "__main__":
    main()
