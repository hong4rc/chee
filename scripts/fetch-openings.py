#!/usr/bin/env python3
"""Fetch all openings from chess.com ECO API and generate openings.js"""

import json
import time
import urllib.request

BASE_URL = 'https://www.chess.com/callback/eco/advanced-search?keyword=&useFavorites=false&page={}'
HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0',
}

def fetch_page(page):
    req = urllib.request.Request(BASE_URL.format(page), headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def fen_key(fen):
    """Extract 'position turn' from full FEN."""
    parts = fen.split(' ')
    return f"{parts[0]} {parts[1]}"

def main():
    # Fetch page 1 to get total count
    data = fetch_page(1)
    total = data['total_count']
    per_page = data['num_items_per_page']
    total_pages = (total + per_page - 1) // per_page

    print(f"Total openings: {total}, pages: {total_pages}")

    all_items = list(data['items'])

    for page in range(2, total_pages + 1):
        print(f"  Fetching page {page}/{total_pages}...")
        d = fetch_page(page)
        all_items.extend(d['items'])
        time.sleep(0.3)  # be polite

    print(f"Fetched {len(all_items)} items")

    # Build map: fen_key -> name (skip "Undefined" starting position)
    openings = {}
    for item in all_items:
        name = item['name']
        if name == 'Undefined':
            continue
        key = fen_key(item['fen'])
        # Later (deeper) entries override earlier ones — more specific name wins
        openings[key] = name

    print(f"Unique positions: {len(openings)}")

    # Generate JS
    lines = []
    lines.append("// ECO opening names — compact lookup by position + turn")
    lines.append("// Auto-generated from chess.com ECO database")
    lines.append("export const STARTING_POSITION = 'Starting Position';")
    lines.append("")
    lines.append("const OPENINGS = new Map([")
    lines.append(f"  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w', STARTING_POSITION],")

    for key, name in openings.items():
        escaped = name.replace("\\", "\\\\").replace("'", "\\'")
        lines.append(f"  ['{key}', '{escaped}'],")

    lines.append("]);")
    lines.append("")
    lines.append("export function lookupOpening(fen) {")
    lines.append("  const key = fen.split(' ').slice(0, 2).join(' ');")
    lines.append("  return OPENINGS.get(key) || null;")
    lines.append("}")
    lines.append("")

    out_path = 'src/core/openings.js'
    with open(out_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"Wrote {len(openings)} openings to {out_path}")

if __name__ == '__main__':
    main()
