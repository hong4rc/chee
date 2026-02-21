# Chrome Web Store Listing Assets

This directory contains assets for the Chrome Web Store (CWS) listing. These are **not auto-deployed** — the CWS API does not support updating listing metadata programmatically.

## Contents

- `description.txt` — Full store listing description
- `screenshots/` — Store listing screenshots (1280x800 or 640x400)

## Updating the listing

When `description.txt` or screenshots change, manually update the CWS dashboard:

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select the Chee extension
3. Update the **Store listing** tab with the new description and/or screenshots
4. Submit for review

## CWS listing requirements

- **Description** — Up to 16,000 characters
- **Icon** — 128x128 PNG (lives in `static/icons/`)
- **Screenshots** — At least one, 1280x800 or 640x400 PNG/JPEG
- **Category** — Fun & Games
- **Privacy** — Privacy practices and permissions justification
