import fs from 'node:fs';

// Reads esims-source.json (your spreadsheet rows) and writes ../data/esims.json:
// for each country, the cheapest plan with at least MIN_GB of data.
const MIN_GB = 10;
const MAX_AGE_DAYS = 120; // older than this: hidden from the app
const src = JSON.parse(fs.readFileSync('./esims-source.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const log = [];
const countries = {};

const age = (src.checkedOn ? (Date.now() - new Date(src.checkedOn)) / 864e5 : Infinity);
if (age > MAX_AGE_DAYS) log.push(`STALE: esims-source.json was checked ${src.checkedOn}; plans hidden until refreshed.`);

const ok = (p) => p && p.country && p.type === 'Country' && p.gb > 0 && p.days > 0 && p.priceUSD > 0 && p.priceUSD < 500 && p.provider;
const byCountry = {};
for (const p of src.plans) {
  if (!ok(p)) { if (p.type !== 'Regional') log.push('SKIP bad row: ' + JSON.stringify(p)); continue; }
  (byCountry[p.country] = byCountry[p.country] || []).push(p);
}
if (age <= MAX_AGE_DAYS) {
  for (const [country, plans] of Object.entries(byCountry)) {
    const eligible = plans.filter((p) => p.gb >= MIN_GB).sort((a, b) => a.priceUSD - b.priceUSD || a.priceUSD / a.gb - b.priceUSD / b.gb);
    if (!eligible.length) { log.push(`NONE ${country}: no plan with ${MIN_GB} GB or more`); continue; }
    const p = eligible[0];
    countries[country] = { provider: p.provider, gb: p.gb, days: p.days, priceUSD: p.priceUSD, asOf: src.checkedOn };
    log.push(`OK   ${country}: ${p.provider} ${p.gb} GB / ${p.days} days $${p.priceUSD}`);
  }
}
const out = { updated: today, via: src.via, viaUrl: src.viaUrl,
  note: 'Advertised travel-eSIM prices from a comparison site; reseller eSIMs, not networks. Verify at checkout.', countries };
fs.writeFileSync('../data/esims.json', JSON.stringify(out, null, 1));
fs.writeFileSync('esims-report.txt', log.join('\n'));
console.log(log.join('\n'));
