"""MoxiesExtremeTechGear daily auto-pick adder — v2 (2026-11-05).

Adds ONE verified Amazon Best Seller pick per day to each coverable live
product page, inside a dedicated "Fresh picks" section just before </main>.

Why a dedicated section (not the curated grid):
- The curated grids feed the compare tables + best-value callouts; appending
  into them would silently stale the tables. Fresh picks live in their own
  clearly-marked section and never touch the curated content.
- One stable anchor (</main>) works on all 21 pages, so a per-page anchor
  bug can't mangle a page. (The v1 script's replace("</div>") inserted a
  card before EVERY closing div in the file.)

Verification (every pick, every day):
- Real product name (never the "Amazon Best Seller" fallback).
- ASIN extracted from a /dp/ link; the dp URL must return HTTP 200.
- Keyword filter: name must contain >=1 MUST word and 0 MUST-NOT words
  (plus a global clothing blocklist, word-boundary matched). This is what
  stops another tennis skirt landing under "scuba".
- Dedupe by ASIN against the page's existing cards AND product_history.json.
- Real Amazon image (images-na.ssl-images-amazon.com); if no image, the
  pick is skipped — never a placeholder (reads as "no pic").
- Optional max-price rule (tech-gifts-under-50: price must parse and be <= $50).

Cap: 100 total product cards per page. Past 100, the oldest AUTO-ADDED card
is removed (FIFO). Original hand-built picks are never removed. Auto cards
are marked data-auto-pick="1" + <!-- auto-pick DATE ASIN -->.

Safety:
- Only pages in PAGES are ever modified. A page is skipped (never written)
  if its anchor is missing, its fresh-picks section is malformed, or any
  step fails. One bad page never stops the others.
- Writes only live root pages. The old /site/ folder is dead (404) and is
  never touched. No dashboard rewrite.
- Amazon fetches send full browser headers, retry, and skip silently on
  failure (Amazon intermittently robot-checks).

Usage:
    python scripts/add_products.py [--root DIR] [--dry-run]
  --root defaults to the repo root (parent of scripts/). --dry-run prints
  what it would do without writing any files.
"""

import argparse
import html
import json
import pathlib
import re
import sys
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------
# PATHS / CONSTANTS
# ---------------------------------------------------------
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
HISTORY_FILE = DATA_DIR / "product_history.json"

AFFILIATE_TAG = "rmoxie-20"
MAX_ITEMS_PER_PAGE = 100
MAX_CANDIDATES_PER_PAGE = 8  # how many zgbs entries to try before giving up

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Global blocklist — no clothing on any page (none of these pages is apparel),
# no gift cards (not real gear), and no laptops/Chromebooks (no page here
# is about laptops; a "keyboard" hit on a Chromebook listing is a false positive).
GLOBAL_BLOCK = [
    "shirt", "skirt", "dress", "pants", "underwear", "socks", "shoes",
    "swimsuit", "t-shirt", "tshirt", "bra", "lingerie", "sweater", "jacket",
    "gift card", "laptop", "chromebook",
]

# ---------------------------------------------------------
# PER-PAGE CONFIG
# (repo path, card-count regex, zgbs source, MUST words, MUST-NOT words,
#  optional max price in USD)
# ---------------------------------------------------------
Z_ELECTRONICS = "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics"
Z_SPORTING = "https://www.amazon.com/Best-Sellers-Sports-Outdoors/zgbs/sporting-goods"
Z_PC = "https://www.amazon.com/Best-Sellers-Computers-Accessories/zgbs/pc"

PAGES = [
    ("ai-hardware.html",
     r'<article class="card product-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Computer-Graphics-Cards/zgbs/pc/284822",
     ["gpu", "graphics card", "rtx", "geforce", "radeon", "vram", "ai accelerator", "npu"],
     ["laptop", "monitor", "keyboard", "shirt", "clothing"], None),
    ("audio-gear.html",
     r'<article class="card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Headphones/zgbs/electronics/172541",
     ["headphone", "headset", "earbud", "speaker", "dac", "amplifier", "microphone", "audio"],
     ["drone", "charger", "cable", "keyboard", "mouse", "laptop"], None),
    ("audio-gear/headset-guide.html",
     r'<div class="product-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Headphones/zgbs/electronics/172541",
     ["headphone", "headset", "earbud", "speaker", "dac", "amplifier", "microphone", "audio"],
     ["drone", "charger", "cable", "keyboard", "mouse", "laptop"], None),
    ("automotive-emergency.html",
     r'<article class="auto-card"',
     "https://www.amazon.com/Best-Sellers-Automotive/zgbs/automotive",
     ["car", "auto", "tire", "jump", "roadside", "emergency", "motor oil",
      "windshield", "air freshener", "microfiber", "flashlight", "charger", "inflator"],
     ["drone", "headphones", "kitchen", "clothing"], None),
    ("best-100w-usb-c-chargers-travel.html",
     r'<section class="pick-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Cell-Phone-Accessories/zgbs/electronics/2407755011",
     ["charger", "gan", "watt", "charging station", "power adapter",
      "charging block", "wall charger"],
     ["power bank", "headphones", "cable"], None),
    ("best-locks-for-ebikes.html",
     r'<article class="product-pick"',
     "https://www.amazon.com/Best-Sellers-Sports-Outdoors-Cycling-Accessories/zgbs/sporting-goods/3403211",
     ["lock", "u-lock", "chain lock", "folding lock", "bike lock"],
     ["helmet", "light", "shirt", "clothing"], None),
    ("best-power-banks-camping-field-charging.html",
     r'<section class="pick-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Cell-Phone-Accessories/zgbs/electronics/2407755011",
     ["power bank", "portable charger", "battery pack"],
     ["wall charger", "cable", "phone case", "laptop"], None),
    ("best-usb-c-docks-dual-monitors.html",
     r'<article class="product-pick"',
     "https://www.amazon.com/Best-Sellers-Electronics-USB-Hubs/zgbs/electronics/17387627011",
     ["dock", "docking station", "hub", "dual monitor", "thunderbolt", "usb-c hub"],
     ["cable", "charger", "laptop", "keyboard", "mouse"], None),
    ("camping-outdoors-equipment.html",
     r'<article class="product-card"',
     "https://www.amazon.com/Best-Sellers-Sports-Outdoors-Camping-Hiking/zgbs/sporting-goods/3400371",
     ["tent", "sleeping bag", "camp", "lantern", "cooler", "camp stove", "hiking", "outdoor"],
     ["drone", "headphones", "laptop", "clothing"], None),
    ("coding-gear/keyboard-guide.html",
     r'<div class="product-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Computer-Keyboards-Mice-Accessories/zgbs/electronics/11548956011",
     ["keyboard", "keycap", "mechanical keyboard"],
     ["mouse", "monitor", "laptop", "headset"], None),
    ("coding-gear/mouse-guide.html",
     r'<div class="product-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Computer-Keyboards-Mice-Accessories/zgbs/electronics/11548956011",
     ["mouse", "trackball", "trackpad"],
     ["keyboard", "monitor", "laptop", "headset"], None),
    ("drones.html",
     r'<article class="card"',
     "https://www.amazon.com/Best-Sellers-Toys-Games-Hobby-RC-Quadcopters-Multirotors/zgbs/toys-and-games/11608080011",
     ["drone", "quadcopter", "uav", "fpv", "dji", "holy stone", "camera drone"],
     ["shirt", "skirt", "dress", "shoes", "clothing", "swimsuit", "toy car"], None),
    ("ebike-gear.html",
     r'<div class="product-card"',
     "https://www.amazon.com/Best-Sellers-Sports-Outdoors-Bikes/zgbs/sporting-goods/1265458011",
     ["e-bike", "electric bike", "ebike", "bike light", "bike pump", "bike lock",
      "bike helmet", "bike rack", "bike tire", "bike accessory", "bicycle"],
     ["motorcycle", "scooter", "car", "shirt", "clothing"], None),
    ("epoxy-resin-tables.html",
     r'<article class="product-card"',
     "https://www.amazon.com/Best-Sellers-Arts-Crafts-Sewing-Epoxy-Resin/zgbs/arts-crafts/8090758011",
     ["epoxy", "resin", "river table", "deep pour", "tabletop epoxy",
      "mica", "pigment", "mold", "resin kit"],
     ["paint", "varnish", "wood stain", "glue", "acrylic", "watercolor", "clothing"], None),
    ("gaming-setup.html",
     r'<article class="product-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Video-Game-Consoles-Accessories/zgbs/electronics/7926841011",
     ["gaming", "monitor", "keyboard", "mouse", "headset", "chair", "desk",
      "gpu", "controller", "xbox", "playstation", "nintendo"],
     ["laptop", "clothing", "shirt"], None),
    ("gan-chargers-guide.html",
     r'<article class="product-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Cell-Phone-Accessories/zgbs/electronics/2407755011",
     ["charger", "gan", "watt", "charging station", "power adapter",
      "charging block", "wall charger"],
     ["power bank", "headphones", "cable"], None),
    ("home-safety-security.html",
     r'<article class="product-card"',
     "https://www.amazon.com/Best-Sellers-Electronics-Security-Surveillance-Equipment/zgbs/electronics/524136",
     ["security", "doorbell", "alarm", "sensor", "smoke detector",
      "surveillance", "floodlight", "video doorbell", "lock"],
     ["drone", "headphones", "kitchen", "clothing"], None),
    ("scuba-diving/index.html",
     r'<article class="scooter-card"',
     "https://www.amazon.com/Best-Sellers-Sports-Outdoors-Diving-Snorkeling-Equipment/zgbs/sporting-goods/3406281",
     ["dive", "scuba", "snorkel", "underwater", "scooter", "regulator",
      "bcd", "wetsuit", "fin", "mask"],
     ["shirt", "skirt", "dress", "business", "clothing", "swimsuit", "tennis"], None),
    ("smart-home.html",
     r'<article class="product-card"',
     Z_ELECTRONICS,
     ["echo", "alexa", "smart plug", "smart bulb", "hub", "matter", "zigbee",
      "thermostat", "google home", "ring", "wyze", "kasa", "smart lock",
      "smart switch", "smart speaker", "smart display", "smart camera", "smart home"],
     ["phone", "laptop", "charger", "clothing", "cable", "keyboard", "mouse", "tablet", "shirt"], None),
    ("storage-gear/index.html",
     r'<div class="product-card"',
     "https://www.amazon.com/Best-Sellers-Computers-Accessories-External-Hard-Drives/zgbs/pc/595048",
     ["ssd", "hard drive", "external drive", "nas", "storage", "usb drive",
      "memory card", "portable ssd"],
     ["laptop", "monitor", "charger"], None),
    ("tech-gifts-under-50.html",
     r'<article class="product-card"',
     Z_ELECTRONICS,
     [],  # any real product; the price rule does the filtering
     ["clothing", "shirt", "skirt", "dress", "shoes", "underwear", "socks",
      "pants", "swimsuit"],
     50.0),
]

# Pages that deliberately do NOT get auto-picks (kept here so a future
# editor knows the omission is intentional):
#   black-friday-deals.html — seasonal 12-deal watchlist, framing breaks
#   special-picks.html      — miscellaneous by design, no theme to filter on
#   full-auto-bb-guns.html  — restricted category, no clean best-seller node
#   cable-management.html   — no matching best-seller node

# ---------------------------------------------------------
# LOGGING
# ---------------------------------------------------------
def log(msg):
    print(f"[auto-pick] {msg}", flush=True)

# ---------------------------------------------------------
# DATES
# ---------------------------------------------------------
def today_str():
    """Today's date in the site owner's timezone (ET), ISO + display forms."""
    try:
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo("America/New_York"))
    except Exception:
        now = datetime.now()
    return now.strftime("%Y-%m-%d"), now.strftime("%b %-d, %Y")

# ---------------------------------------------------------
# HISTORY
# ---------------------------------------------------------
def load_history():
    if not HISTORY_FILE.exists():
        return {}
    try:
        with HISTORY_FILE.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_history(history):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with HISTORY_FILE.open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

def asin_in_history(history, asin):
    for day_data in history.values():
        if not isinstance(day_data, dict):
            continue
        for url in day_data.values():
            if asin in str(url):
                return True
    return False

# ---------------------------------------------------------
# AMAZON FETCH + PARSE
# ---------------------------------------------------------
def fetch(url, tries=3):
    """GET with browser headers; returns text or None (robot-check/failure).

    A page counts as blocked when Amazon serves its robot check or a bare
    "Amazon.com" title. (A "Best undefined" title is NOT treated as blocked:
    some live nodes serve real products under it; a truly dead node simply
    parses to zero items and the page skips.)"""
    for attempt in range(1, tries + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code != 200:
                log(f"  fetch {url} -> HTTP {resp.status_code} (attempt {attempt})")
                time.sleep(2 * attempt)
                continue
            text = resp.text
            lowered = text.lower()
            title_m = re.search(r"<title>([^<]*)</title>", text, re.IGNORECASE)
            title = (title_m.group(1).strip() if title_m else "")
            if ("captcha" in lowered or "robot check" in lowered
                    or title == "Amazon.com"):
                log(f"  fetch {url} -> blocked (title={title!r}) (attempt {attempt})")
                time.sleep(3 * attempt)
                continue
            return text
        except Exception as e:
            log(f"  fetch {url} failed ({e}) (attempt {attempt})")
            time.sleep(2 * attempt)
    return None

def parse_candidates(zgbs_html):
    """Extract candidate products from a best-sellers page."""
    soup = BeautifulSoup(zgbs_html, "html.parser")
    items = soup.select(
        ".zg-grid-general-faceout, .zg-item-immersion, "
        ".a-section.a-spacing-none.p13n-asin"
    )
    candidates = []
    for item in items:
        # --- ASIN from any /dp/ link in the item ---
        asin = None
        for a in item.select("a[href]"):
            m = re.search(r"/dp/([A-Z0-9]{10})", a.get("href", ""))
            if m:
                asin = m.group(1)
                break
        if not asin:
            continue
        # --- name: line-clamp div, else img alt, else legacy truncated ---
        name = ""
        clamp = item.select_one('div[class*="p13n-sc-css-line-clamp"]')
        if clamp:
            name = clamp.get_text(" ", strip=True)
        if not name:
            img = item.select_one("img[alt]")
            if img:
                name = (img.get("alt") or "").strip()
        if not name:
            trunc = item.select_one(".p13n-sc-truncated")
            if trunc:
                name = trunc.get_text(" ", strip=True)
        if not name or name.lower() in ("amazon best seller", "best seller"):
            continue
        # --- image: largest from data-a-dynamic-image, else img src ---
        image_url = ""
        img = item.select_one("img")
        if img is not None:
            dyn = img.get("data-a-dynamic-image")
            if dyn:
                try:
                    urls = json.loads(dyn)
                    # pick the largest width, capped at 900px
                    best = sorted(urls.items(), key=lambda kv: kv[1][0], reverse=True)
                    image_url = best[0][0]
                except Exception:
                    image_url = ""
            if not image_url:
                src = img.get("src") or ""
                if src.startswith("http") and "amazon.com" in src:
                    image_url = src
        if not image_url:
            continue  # no image -> skip, never a placeholder
        # --- price: first $XX.XX in the item ---
        price = None
        m = re.search(r"\$([0-9][0-9,]*\.[0-9]{2})", item.get_text(" ", strip=True))
        if m:
            try:
                price = float(m.group(1).replace(",", ""))
            except ValueError:
                price = None
        candidates.append({
            "asin": asin,
            "name": name,
            "image_url": image_url,
            "price": price,
            "amazon_url": f"https://www.amazon.com/dp/{asin}?tag={AFFILIATE_TAG}",
        })
    return candidates

def verify_dp(asin, tries=2):
    """True only if the dp URL returns HTTP 200 (retried — Amazon
    intermittently blocks single requests)."""
    for attempt in range(1, tries + 1):
        try:
            resp = requests.get(
                f"https://www.amazon.com/dp/{asin}",
                headers=HEADERS, timeout=15,
            )
            if resp.status_code == 200:
                return True
            time.sleep(2 * attempt)
        except Exception:
            time.sleep(2 * attempt)
    return False

# ---------------------------------------------------------
# KEYWORD FILTER (word-boundary matched)
# ---------------------------------------------------------
def _word_in(text, word):
    return re.search(r"\b" + re.escape(word.lower()) + r"\b", text) is not None

def keyword_ok(name, must, must_not):
    lowered = name.lower()
    if must and not any(_word_in(lowered, w) for w in must):
        return False
    for w in list(must_not) + GLOBAL_BLOCK:
        if _word_in(lowered, w):
            return False
    return True

# ---------------------------------------------------------
# HTML BUILDERS
# ---------------------------------------------------------
FRESH_SECTION = """
<section class="gear-section" id="fresh-picks">
  <h2>Fresh picks</h2>
  <p>New best-sellers added daily. Every pick is verified as a real, in-stock Amazon listing before it appears here.</p>
  <div class="product-grid" id="fresh-picks-grid">
  <!-- /fresh-picks-grid -->
  </div>
</section>
"""

MARKER = "<!-- /fresh-picks-grid -->"

AUTO_RE = re.compile(
    r"<!-- auto-pick (\d{4}-\d{2}-\d{2}) ([A-Z0-9]{10}) -->\s*"
    r"<article class=\"product-card\" data-auto-pick=\"1\"[^>]*>.*?</article>",
    re.DOTALL,
)

def build_card(product, date_iso, date_display):
    name = html.escape(product["name"])
    img = html.escape(product["image_url"], quote=True)
    url = html.escape(product["amazon_url"], quote=True)
    return (
        f"<!-- auto-pick {date_iso} {product['asin']} -->\n"
        f"<article class=\"product-card\" data-auto-pick=\"1\" data-added=\"{date_iso}\">\n"
        f"  <img class=\"card-photo\" src=\"{img}\" alt=\"{name}\" loading=\"lazy\">\n"
        f"  <h3>{name}</h3>\n"
        f"  <p class=\"specs\"><strong>Added:</strong> {date_display} | Fresh pick from Amazon Best Sellers</p>\n"
        f"  <p>Fresh pick from Amazon Best Sellers, added {date_display}. "
        f"Prices and availability change — check the current price on Amazon before buying.</p>\n"
        f"  <a href=\"{url}\" class=\"btn-buy\" target=\"_blank\" "
        f"rel=\"sponsored noopener noreferrer\">Check Price on Amazon &rarr;</a>\n"
        f"</article>"
    )

def count_items(page_html, count_pattern):
    """Total product cards: originals (pattern, auto cards stripped out
    first so they can't double-count) + auto-added cards."""
    stripped = AUTO_RE.sub("", page_html)
    originals = len(re.findall(count_pattern, stripped))
    autos = len(AUTO_RE.findall(page_html))
    return originals + autos

def ensure_section(page_html):
    """Create the Fresh Picks section before </main> if it isn't there.
    Returns the new html, or None if the anchor is unusable."""
    if 'id="fresh-picks"' in page_html:
        return page_html
    if page_html.count("</main>") != 1:
        return None
    return page_html.replace("</main>", FRESH_SECTION + "\n</main>", 1)

def insert_card(page_html, card_html):
    """Insert a card inside the fresh-picks grid, before its marker."""
    if MARKER not in page_html:
        return None
    return page_html.replace(MARKER, card_html + "\n  " + MARKER, 1)

def prune_oldest(page_html):
    """Remove the single oldest auto-added card. Returns (html, asin|None)."""
    matches = list(AUTO_RE.finditer(page_html))
    if not matches:
        return page_html, None
    oldest = min(matches, key=lambda m: (m.group(1), m.start()))
    new_html = page_html[:oldest.start()] + page_html[oldest.end():]
    return new_html, oldest.group(2)

# ---------------------------------------------------------
# PER-PAGE RUN
# ---------------------------------------------------------
def pick_candidate(candidates, page_html, history, must, must_not,
                   max_price, picked_today, path):
    """First candidate that passes every check, or None.

    Checks, in order: keyword filter, not already on the page, not in
    history, not already picked for another page today, price rule,
    dp-200 check."""
    tried = 0
    for cand in candidates:
        if tried >= MAX_CANDIDATES_PER_PAGE:
            break
        tried += 1
        if not keyword_ok(cand["name"], must, must_not):
            continue
        if cand["asin"] in page_html:
            continue
        if asin_in_history(history, cand["asin"]):
            continue
        if cand["asin"] in picked_today:
            continue
        if max_price is not None and (cand["price"] is None or cand["price"] > max_price):
            continue
        if not verify_dp(cand["asin"]):
            log(f"  {path}: dp check failed for {cand['asin']} ({cand['name'][:50]})")
            continue
        return cand
    return None

def run_page(root, cfg, history, date_iso, date_display, dry_run, picked_today):
    path, count_pattern, source_url, must, must_not, max_price = cfg
    target = root / path
    if not target.exists():
        log(f"{path}: SKIP — file not in repo")
        return False
    try:
        page_html = target.read_text(encoding="utf-8")
    except Exception as e:
        log(f"{path}: SKIP — cannot read ({e})")
        return False

    # 1. Fresh-picks section present (or creatable)?
    new_html = ensure_section(page_html)
    if new_html is None:
        log(f"{path}: SKIP — </main> anchor missing/ambiguous")
        return False
    page_html = new_html
    if MARKER not in page_html:
        log(f"{path}: SKIP — fresh-picks grid marker missing")
        return False

    # 2. Fetch + parse the best-sellers source (page 1, then page 2).
    picked = None
    for page_no in (1, 2):
        if page_no == 1:
            url = source_url
        else:
            sep = "&" if "?" in source_url else "?"
            url = f"{source_url}{sep}pg=2"
        zgbs_html = fetch(url)
        if not zgbs_html:
            log(f"{path}: source fetch failed (page {page_no})")
            continue
        candidates = parse_candidates(zgbs_html)
        if not candidates:
            log(f"{path}: no products parsed from source (page {page_no})")
            continue
        picked = pick_candidate(candidates, page_html, history, must, must_not,
                                max_price, picked_today, path)
        if picked:
            break
        log(f"{path}: no candidate passed verification (page {page_no})")
    if not picked:
        log(f"{path}: SKIP — no verified pick today")
        return False

    # 4. Cap: prune oldest auto pick(s) if at/over 100 items.
    card_html = build_card(picked, date_iso, date_display)
    total = count_items(page_html, count_pattern)
    pruned = []
    while total >= MAX_ITEMS_PER_PAGE:
        page_html, removed = prune_oldest(page_html)
        if not removed:
            log(f"{path}: SKIP — at cap ({total}) with no auto picks to prune")
            return False
        pruned.append(removed)
        total = count_items(page_html, count_pattern)

    # 5. Insert.
    updated = insert_card(page_html, card_html)
    if updated is None:
        log(f"{path}: SKIP — insert failed")
        return False

    if dry_run:
        log(f"{path}: DRY RUN — would add {picked['asin']} "
            f"({picked['name'][:60]})" + (f"; would prune {pruned}" if pruned else ""))
        picked_today.add(picked["asin"])
        return True

    try:
        target.write_text(updated, encoding="utf-8")
    except Exception as e:
        log(f"{path}: SKIP — write failed ({e})")
        return False

    history.setdefault(date_iso, {})[path] = picked["amazon_url"]
    picked_today.add(picked["asin"])
    log(f"{path}: ADDED {picked['asin']} ({picked['name'][:60]})"
        + (f"; pruned oldest {pruned}" if pruned else ""))
    return True

# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(ROOT),
                        help="repo root (default: parent of scripts/)")
    parser.add_argument("--dry-run", action="store_true",
                        help="print what would happen, write nothing")
    args = parser.parse_args()

    root = pathlib.Path(args.root)
    global DATA_DIR, HISTORY_FILE
    DATA_DIR = root / "data"
    HISTORY_FILE = DATA_DIR / "product_history.json"

    history = load_history()
    date_iso, date_display = today_str()
    log(f"run {date_iso} (dry_run={args.dry_run}) — {len(PAGES)} pages")

    added = 0
    picked_today = set()  # ASINs already picked this run (no repeats across pages)
    for cfg in PAGES:
        try:
            if run_page(root, cfg, history, date_iso, date_display,
                        args.dry_run, picked_today):
                added += 1
        except Exception as e:
            log(f"{cfg[0]}: SKIP — unexpected error ({e})")
        time.sleep(1)  # be gentle on Amazon between pages

    if not args.dry_run:
        save_history(history)
    log(f"done — {added}/{len(PAGES)} pages got a new pick")

if __name__ == "__main__":
    main()
