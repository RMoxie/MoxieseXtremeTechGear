#!/usr/bin/env python3
"""Refresh the four featured Giveaway of the Day offers, all or nothing."""

from datetime import datetime, timezone
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import sys
import tempfile
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

OUTPUT = Path(__file__).resolve().parents[1] / "giveaway-data.json"
SOURCES = (
    ("windows", "Windows Software", "💻", "https://www.giveawayoftheday.com/"),
    ("game", "PC Game", "🎮", "https://game.giveawayoftheday.com/"),
    ("android", "Android App", "🤖", "https://android.giveawayoftheday.com/"),
    ("iphone", "iPhone & iPad App", "📱", "https://iphone.giveawayoftheday.com/"),
)
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class FeaturedOffer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.offer_depth = None
        self.field = None
        self.field_depth = None
        self.parts = []
        self.values = {"title": "", "description": "", "price": "", "url": "", "image": ""}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set(attrs.get("class", "").split())
        ancestors = [node[1] for node in self.stack]
        inside = self.offer_depth is not None and len(self.stack) >= self.offer_depth
        if self.offer_depth is None and tag == "div" and "giveaway_wrap" in classes and any("giveaway_day" in c for c in ancestors):
            self.offer_depth = len(self.stack) + 1
            inside = True
        if inside:
            if tag == "img" and "giveaway_img" in (ancestors[-1] if ancestors else set()):
                self.values["image"] = attrs.get("src", "") or attrs.get("data-src", "")
            if tag == "a" and any("giveaway_title" in c for c in ancestors):
                self.values["url"] = attrs.get("href", "")
                self.field, self.parts, self.field_depth = "title", [], len(self.stack) + 1
            elif "giveaway_descr" in classes:
                self.field, self.parts, self.field_depth = "description", [], len(self.stack) + 1
            elif "old_price" in classes:
                self.field, self.parts, self.field_depth = "price", [], len(self.stack) + 1
        if tag not in VOID_TAGS:
            self.stack.append((tag, classes))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_data(self, data):
        if self.field:
            self.parts.append(data)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                self.stack = self.stack[:index]
                break
        if self.field and len(self.stack) < self.field_depth:
            self.values[self.field] = " ".join(" ".join(self.parts).split())
            self.field, self.field_depth, self.parts = None, None, []
        if self.offer_depth and len(self.stack) < self.offer_depth:
            self.offer_depth = None


def checked_url(value, base, allowed_host, *, optional=False):
    if not value and optional:
        return ""
    result = urljoin(base, value)
    parsed = urlsplit(result)
    if parsed.scheme != "https" or parsed.hostname != allowed_host or parsed.username or parsed.password:
        raise ValueError(f"Invalid URL for {allowed_host}: {result}")
    if not optional and parsed.path in ("", "/"):
        raise ValueError(f"Offer URL has no product path: {result}")
    return result


def fetch_item(category, label, icon, source):
    print(f"Fetching {category}: {source}", flush=True)
    with urlopen(Request(source, headers={"User-Agent": USER_AGENT}), timeout=30) as response:
        if urlsplit(response.url).hostname != urlsplit(source).hostname or urlsplit(response.url).scheme != "https":
            raise ValueError(f"Unexpected source redirect: {response.url}")
        html = response.read(5_000_001)
        if len(html) > 5_000_000:
            raise ValueError("Source page is unexpectedly large")
        text = html.decode(response.headers.get_content_charset() or "utf-8")
    parser = FeaturedOffer()
    parser.feed(text)
    value = parser.values
    title, description, price = (value[key].strip() for key in ("title", "description", "price"))
    if not title or not description or not price:
        raise ValueError(f"Incomplete {category} offer: title/description/price missing")
    host = urlsplit(source).hostname
    image = ""
    if value["image"]:
        candidate = urljoin(source, value["image"])
        image_host = urlsplit(candidate).hostname or ""
        if image_host == "giveawayoftheday.com" or image_host.endswith(".giveawayoftheday.com"):
            image = checked_url(candidate, source, image_host, optional=True)
    item = {
        "category": category, "label": label, "icon": icon, "title": title,
        "description": description, "price": price,
        "url": checked_url(value["url"], source, host),
        "categoryUrl": source,
        "image": image,
    }
    print(f"Detected {category}: {title} ({item['url']})", flush=True)
    return item


def main():
    items = [fetch_item(*source) for source in SOURCES]
    if [item["category"] for item in items] != [source[0] for source in SOURCES]:
        raise ValueError("Category order or count does not match the expected four")
    previous = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else None
    today = datetime.now(timezone.utc)
    if previous and previous.get("items") == items and str(previous.get("updatedAt", ""))[:10] == today.date().isoformat():
        print("JSON unchanged; no commit needed.")
        return
    data = {"updatedAt": today.isoformat(timespec="seconds").replace("+00:00", "Z"),
            "source": "Giveaway of the Day", "items": items}
    content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if OUTPUT.exists() and OUTPUT.read_text(encoding="utf-8") == content:
        print("JSON unchanged; no commit needed.")
        return
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="\n", dir=OUTPUT.parent, delete=False) as temp:
        try:
            temp.write(content)
            temp_path = temp.name
        except BaseException:
            os.unlink(temp.name)
            raise
    os.replace(temp_path, OUTPUT)
    print("JSON changed; wrote giveaway-data.json.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}; existing giveaway-data.json was not changed.", file=sys.stderr)
        sys.exit(1)
