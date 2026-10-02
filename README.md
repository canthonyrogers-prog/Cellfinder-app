# Cell Finder

Run: `npm install && npx expo start` then scan the QR code with Expo Go (iOS/Android).

## Data
`data/networks.json` is SAMPLE data. Do not ship it.
Fields per network: name, priceUSD, coverage (0-100), plan. Roaming: roaming[homeCarrier][country] = { dailyPassUSD, partner } (null if none). Source: each home carrier's public international roaming page.

## Refresh pipeline (next step)
1. Prices: carrier prepaid/tourist pages and public SIM-price datasets (e.g. cable.co.uk's mobile data pricing).
2. Coverage: public reports (Opensignal, nPerf, regulator maps such as Ofcom/ARCEP), normalized to 0-100 per country.
3. A scheduled job (GitHub Actions, monthly) rebuilds networks.json and publishes it to static hosting.
4. Set DATA_URL in App.js. The app caches the latest copy offline.
Check each source's terms of use before republishing its data.

## Scoring
Best value = 50% coverage (vs best in city) + 50% price (vs cheapest in city). Adjust weights in `rank()`.
