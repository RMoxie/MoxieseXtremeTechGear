#!/usr/bin/env python3
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "giveaway-data.json"
SOURCES = {
    "windows": ("Windows Software", "💻", "https://www.giveawayoftheday.com/"),
    "game": ("PC Game", "🎮", "https://game.giveawayoftheday.com/"),
    "android": ("Android App", "🤖", "https://android.giveawayoftheday.com/"),
    "iphone": ("iPhone & iPad App", "📱", "https://iphone.giveawayoftheday.com/"),
}

def clean(node):
    return " ".join(node.get_text(" ", strip=True).split()) if node else ""

def valid_gotd(url):
    parsed = urlparse(url)
    return parsed.scheme == "https" and (parsed.hostname == "giveawayoftheday.com" or (parsed.hostname or "").endswith(".giveawayoftheday.com"))

def fetch_item(category, label, icon, source):
    request = Request(source, headers={"User-Agent": "Mozilla/5.0 (compatible; MoxiesDailyGiveaways/1.0; +https://rmoxie.github.io/MoxieseXtremeTechGear/)"})
    with urlopen(request, timeout=25) as response:
        soup = BeautifulSoup(response.read(), "html.parser")
    wrap = soup.select_one(".col1.giveaway_day .giveaway_wrap, .giveaway_day .giveaway_wrap")
    if not wrap:
        raise ValueError("featured giveaway not found")
    title_node = wrap.select_one(".giveaway_title a")
    image_node = wrap.select_one(".giveaway_img img")
    title = clean(title_node)
    detail_url = urljoin(source, title_node.get("href", "")) if title_node else ""
    image_url = urljoin(source, image_node.get("src", "")) if image_node else ""
    if not title or not valid_gotd(detail_url):
        raise ValueError("featured giveaway is incomplete")
    return {"category": category, "label": label, "icon": icon, "title": title,
            "description": clean(wrap.select_one(".giveaway_descr")),
            "price": clean(wrap.select_one(".old_price")) or "Regular price",
            "url": detail_url, "categoryUrl": source,
            "image": image_url if valid_gotd(image_url) else ""}

def main():
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {"items": []}
    old = {item.get("category"): item for item in previous.get("items", [])}
    items = []
    for category, (label, icon, source) in SOURCES.items():
        try:
            items.append(fetch_item(category, label, icon, source))
        except Exception as error:
            if category in old:
                stale = dict(old[category]); stale["stale"] = True; items.append(stale)
                print(f"Keeping previous {category} giveaway: {error}")
            else:
                raise
    payload = {"updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "source": "Giveaway of the Day", "items": items}
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

if __name__ == "__main__":
    main()
