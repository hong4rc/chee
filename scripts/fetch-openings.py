#!/usr/bin/env python3
"""Fetch all openings from chess.com ECO API and generate openings.js.

Strategy:
1. Fetch all 999 base entries from the default search
2. Extract unique base opening names (before ':')
3. Search each base name to discover sub-variations
4. Deduplicate by FEN key, preferring the most specific name
"""

import json
import sys
import time
import urllib.request
import urllib.parse

BASE_URL = 'https://www.chess.com/callback/eco/advanced-search?keyword={}&useFavorites=false&page={}'
HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0',
}


def fetch_page(keyword, page):
    url = BASE_URL.format(urllib.parse.quote(keyword), page)
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def fetch_all_pages(keyword):
    """Fetch all pages for a keyword search."""
    data = fetch_page(keyword, 1)
    items = list(data['items'])
    total = data['total_count']
    per_page = data['num_items_per_page']
    total_pages = (total + per_page - 1) // per_page

    for page in range(2, total_pages + 1):
        time.sleep(0.25)
        d = fetch_page(keyword, page)
        items.extend(d['items'])

    return items


def fen_key(fen):
    """Extract 'position turn' from full FEN."""
    parts = fen.split(' ')
    return f"{parts[0]} {parts[1]}"


def main():
    # Step 1: Fetch all base entries
    print("Step 1: Fetching base entries...", flush=True)
    base_items = fetch_all_pages('')
    print(f"  Got {len(base_items)} base entries", flush=True)

    # Build initial map: fen_key -> (name, move_count)
    openings = {}
    for item in base_items:
        if item['name'] == 'Undefined':
            continue
        key = fen_key(item['fen'])
        move_count = len(item.get('move_list', '').split()) if item.get('move_list') else 0
        openings[key] = (item['name'], move_count)

    # Step 2: Extract unique base names for sub-variation searches
    base_names = set()
    for item in base_items:
        name = item['name']
        if name == 'Undefined':
            continue
        # Get the base name (before first ':' or the full name)
        base = name.split(':')[0].strip()
        if base:
            base_names.add(base)

    print(f"Step 2: Found {len(base_names)} unique base names to search", flush=True)

    # Step 3: Search each base name for sub-variations
    searched = set()
    total_new = 0
    for i, name in enumerate(sorted(base_names)):
        # Skip very generic terms that would match too broadly
        if name in searched:
            continue
        searched.add(name)

        if (i + 1) % 20 == 0:
            print(f"  Searching {i + 1}/{len(base_names)}: {name}...", flush=True)

        try:
            items = fetch_all_pages(name)
        except Exception as e:
            print(f"  Error searching '{name}': {e}", file=sys.stderr)
            time.sleep(1)
            continue

        new_count = 0
        for item in items:
            if item['name'] == 'Undefined':
                continue
            key = fen_key(item['fen'])
            move_count = len(item.get('move_list', '').split()) if item.get('move_list') else 0
            existing = openings.get(key)
            if existing is None:
                # New position not in base set
                openings[key] = (item['name'], move_count)
                new_count += 1
            elif len(item['name']) > len(existing[0]):
                # More specific name for same position — prefer longer name
                openings[key] = (item['name'], move_count)

        if new_count:
            total_new += new_count

        time.sleep(0.15)

    print(f"Step 3: Found {total_new} new entries from sub-variation searches", flush=True)
    print(f"Total unique positions: {len(openings)}", flush=True)

    # Step 4: Handle remaining duplicates by appending move depth
    from collections import Counter
    name_counts = Counter(name for name, _ in openings.values())
    dupes = {n for n, c in name_counts.items() if c > 1}

    if dupes:
        print(f"Step 4: Resolving {len(dupes)} remaining duplicate names...", flush=True)
        for key, (name, move_count) in list(openings.items()):
            if name in dupes and move_count > 0:
                half_move = (move_count + 1) // 2
                openings[key] = (f"{name} ({half_move}...)", move_count)

    # Generate JS
    lines = []
    lines.append("// ECO opening names — compact lookup by position + turn")
    lines.append("// Auto-generated from chess.com ECO database")
    lines.append("export const STARTING_POSITION = 'Starting Position';")
    lines.append("")
    lines.append("const OPENINGS = new Map([")
    lines.append("  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w', STARTING_POSITION],")

    for key, (name, _) in sorted(openings.items(), key=lambda x: x[1][1]):
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

    final_count = len(openings)
    print(f"Wrote {final_count} openings to {out_path}", flush=True)


if __name__ == '__main__':
    main()
