import pathlib
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SITE_DIR = ROOT / "site"

HISTORY_FILE = DATA_DIR / "product_history.json"

# ---------------------------------------------------------
# CATEGORY LIST
# ---------------------------------------------------------
CATEGORIES = [
    "drones",
    "audio",
    "portable-computers",
    "storage",
    "coding",
    "desktop-systems",
    "scuba",
    "trending-tech-picks"
]

BEST_SELLER_URLS = {
    "drones": "https://www.amazon.com/Best-Sellers-Camera-Photo-Drones/zgbs/photo/2975392011",
    "audio": "https://www.amazon.com/Best-Sellers-Electronics-Headphones/zgbs/electronics/172541",
    "portable-computers": "https://www.amazon.com/Best-Sellers-Computers-Tablets/zgbs/pc/541966",
    "storage": "https://www.amazon.com/Best-Sellers-Computers-Accessories-External-Hard-Drives/zgbs/pc/595048",
    "coding": "https://www.amazon.com/Best-Sellers-Books-Programming/zgbs/books/3952",
    "desktop-systems": "https://www.amazon.com/Best-Sellers-Computers-Accessories-Desktop-Computers/zgbs/pc/565098",
    "scuba": "https://www.amazon.com/Best-Sellers-Sports-Outdoors-Diving-Snorkeling/zgbs/sporting-goods/3410851",
    "trending-tech-picks": "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics",
}

AFFILIATE_TAG = "moxie-20"

# ---------------------------------------------------------
# LOGGING
# ---------------------------------------------------------
def log(msg: str):
    print(f"[TechGear] {msg}")

# ---------------------------------------------------------
# HISTORY SYSTEM
# ---------------------------------------------------------
def load_history():
    if not HISTORY_FILE.exists():
        HISTORY_FILE.write_text("{}", encoding="utf-8")
        return {}
    try:
        with HISTORY_FILE.open("r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_history(history: dict):
    with HISTORY_FILE.open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

def product_already_added(history: dict, product_url: str) -> bool:
    for day, categories in history.items():
        for cat, url in categories.items():
            if url == product_url:
                return True
    return False

# ---------------------------------------------------------
# AMAZON SCRAPER
# ---------------------------------------------------------
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
        log(f"Failed to fetch Amazon page for {category}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    item = soup.select_one(".zg-grid-general-faceout, .zg-item-immersion, .a-section.a-spacing-none.p13n-asin")
    if not item:
        log(f"No product found for {category}")
        return None

    title_el = item.select_one(".p13n-sc-truncated, .a-link-normal")
    name = title_el.get_text(strip=True) if title_el else "Amazon Best Seller"

    link_el = item.select_one("a.a-link-normal")
    if link_el and link_el.get("href"):
        product_url = "https://www.amazon.com" + link_el["href"].split("?", 1)[0]
    else:
        product_url = url

    product_url = ensure_affiliate_tag(product_url)

    img_el = item.select_one("img")
    image_url = img_el.get("src") if img_el and img_el.get("src") else "https://via.placeholder.com/400x400?text=Product"

    description = f"Trending pick in {category.replace('-', ' ').title()} from Amazon Best Sellers."

    return {
        "name": name,
        "description": description,
        "image_url": image_url,
        "amazon_url": product_url,
    }

# ---------------------------------------------------------
# HTML BUILDER
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

def insert_into_category(category: str, card_html: str):
    target = SITE_DIR / f"{category}.html"

    if not target.exists():
        target.write_text("<div class=\"products\">\n</div>\n", encoding="utf-8")

    content = target.read_text(encoding="utf-8")

    if "</div>" in content:
        content = content.replace("</div>", f"  {card_html}\n</div>")
    else:
        content += f"\n{card_html}\n"

    target.write_text(content, encoding="utf-8")

# ---------------------------------------------------------
# DASHBOARD UPDATER
# ---------------------------------------------------------
def update_dashboard(history: dict):
    dashboard_path = SITE_DIR / "dashboard.html"

    total_products = sum(len(day_data) for day_data in history.values())
    today = datetime.now().strftime("%Y-%m-%d")
    today_entries = history.get(today, {})

    today_rows = "".join(
        f"<tr><td>{cat}</td><td>{url}</td></tr>"
        for cat, url in today_entries.items()
    )

    history_rows = ""
    for day, categories in history.items():
        for cat, url in categories.items():
            history_rows += f"<tr><td>{day}</td><td>{cat}</td><td>{url}</td></tr>"

    html = dashboard_path.read_text(encoding="utf-8")

    html = html.replace("Loading...", today) \
               .replace("<table id=\"today-table\"></table>",
                        f"<table><tr><th>Category</th><th>Product URL</th></tr>{today_rows}</table>") \
               .replace("<table id=\"history-table\"></table>",
                        f"<table><tr><th>Date</th><th>Category</th><th>Product URL</th></tr>{history_rows}</table>") \
               .replace("Loading...</p>", f"{total_products}</p>")

    dashboard_path.write_text(html, encoding="utf-8")

# ---------------------------------------------------------
# MAIN DAILY PROCESS
# ---------------------------------------------------------
def main():
    history = load_history()
    today = datetime.now().strftime("%Y-%m-%d")

    if today not in history:
        history[today] = {}

    # AI products
    for category in CATEGORIES:
        product = ai_find_product_for_category(category)
        if not product:
            continue

        if product_already_added(history, product["amazon_url"]):
            log(f"Duplicate AI product skipped for {category}")
            continue

        card = build_product_card(product)
        insert_into_category(category, card)

        history[today][category] = product["amazon_url"]
        log(f"AI product added for {category}")

    save_history(history)
    update_dashboard(history)

# ---------------------------------------------------------
# RUN
# ---------------------------------------------------------
if __name__ == "__main__":
    main()
