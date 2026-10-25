import fs from 'node:fs';

// Reads esims-source.json and writes ../data/esims.json. For each country it keeps the
// cheapest plan with at least MIN_GB of data (unlimited counts) as the main pick, and up to
// MAX_PLANS eligible plans in total so the app can show alternatives.
const MIN_GB = 10;
const MAX_PLANS = 6;
const MAX_AGE_DAYS = 120; // older than this: hidden from the app
const src = JSON.parse(fs.readFileSync('./esims-source.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const log = [];
const countries = {};

const ageOf = (d) => (d ? (Date.now() - new Date(d)) / 864e5 : Infinity);
const ok = (p) => p && p.country && p.type === 'Country' && p.provider && p.days > 0 &&
  p.priceUSD > 0 && p.priceUSD < 500 && (p.unlimited === true || p.gb > 0);

const byCountry = {};
for (const p of src.plans) {
  if (!ok(p)) { if (p.type !== 'Regional') log.push('SKIP bad row: ' + JSON.stringify(p)); continue; }
  const asOf = p.asOf || src.checkedOn;
  if (ageOf(asOf) > MAX_AGE_DAYS) { log.push(`STALE ${p.country} / ${p.provider} (asOf ${asOf}): hidden`); continue; }
  (byCountry[p.country] = byCountry[p.country] || []).push({ ...p, asOf });
}
const clean = (p) => {
  const o = { provider: p.provider, days: p.days, priceUSD: p.priceUSD, asOf: p.asOf };
  if (p.unlimited) o.unlimited = true; else o.gb = p.gb;
  if (p.plan) o.plan = p.plan;
  if (p.network) o.network = p.network;
  if (p.source) o.source = p.source;
  return o;
};
for (const [country, plans] of Object.entries(byCountry)) {
  const eligible = plans
    .filter((p) => p.unlimited || p.gb >= MIN_GB)
    .sort((a, b) => a.priceUSD - b.priceUSD || b.days - a.days);
  if (!eligible.length) { log.push(`NONE ${country}: no plan with ${MIN_GB} GB or more`); continue; }
  const list = eligible.slice(0, MAX_PLANS).map(clean);
  countries[country] = { ...list[0], plans: list };
  log.push(`OK   ${country}: ${list.length} plan(s), cheapest ${list[0].provider} $${list[0].priceUSD}`);
}
const out = {
  updated: today, via: src.via, viaUrl: src.viaUrl,
  note: 'Advertised travel-eSIM prices; reseller eSIMs, not networks. Verify at checkout.',
  countries,
};
fs.writeFileSync('../data/esims.json', JSON.stringify(out, null, 1));
fs.writeFileSync('esims-report.txt', log.join('\n'));
console.log(log.join('\n'));
