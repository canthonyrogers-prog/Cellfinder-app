import fs from 'node:fs';

// Reads esims-source.json (the plan rows from your spreadsheet) and writes ../data/esims.json.
// For each country it picks three plans:
//   cheapest  = lowest price (ties: more data)
//   value     = lowest price per GB (ties: lower price)
//   mostData  = most GB (ties: lower price)
// Only country plans with at least MIN_GB of data are considered, so "cheapest" is never a tiny plan.
const MIN_GB = 3;
const MAX_AGE_DAYS = 120; // source older than this: eSIM data is hidden from the app
const src = JSON.parse(fs.readFileSync('./esims-source.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const log = [];
const countries = {};

const age = src.checkedOn ? (Date.now() - new Date(src.checkedOn)) / 864e5 : Infinity;
if (age > MAX_AGE_DAYS) log.push(`STALE: esims-source.json was checked ${src.checkedOn}; plans hidden until refreshed.`);

const ok = (p) => p && p.country && p.type === 'Country' && p.gb > 0 && p.days > 0 && p.priceUSD > 0 && p.priceUSD < 500 && p.provider;
const byCountry = {};
for (const p of src.plans) {
  if (!ok(p)) { if (p.type !== 'Regional') log.push('SKIP bad row: ' + JSON.stringify(p)); continue; }
  (byCountry[p.country] = byCountry[p.country] || []).push(p);
}
const slim = (p) => ({ provider: p.provider, gb: p.gb, days: p.days, priceUSD: p.priceUSD, perGB: Math.round((p.priceUSD / p.gb) * 100) / 100 });
const best = (plans, cmp) => [...plans].sort(cmp)[0];

if (age <= MAX_AGE_DAYS) {
  for (const [country, all] of Object.entries(byCountry)) {
    const plans = all.filter((p) => p.gb >= MIN_GB);
    if (!plans.length) { log.push(`NONE ${country}: no plan with ${MIN_GB} GB or more`); continue; }
    const cheapest = best(plans, (a, b) => a.priceUSD - b.priceUSD || b.gb - a.gb);
    const value = best(plans, (a, b) => a.priceUSD / a.gb - b.priceUSD / b.gb || a.priceUSD - b.priceUSD);
    const mostData = best(plans, (a, b) => b.gb - a.gb || a.priceUSD - b.priceUSD);
    countries[country] = { cheapest: slim(cheapest), value: slim(value), mostData: slim(mostData), planCount: plans.length, asOf: src.checkedOn };
    log.push(`OK   ${country}: cheapest ${cheapest.provider} $${cheapest.priceUSD}; value ${value.provider}; most data ${mostData.provider} ${mostData.gb} GB (${plans.length} plans)`);
  }
}
const out = {
  updated: today, via: src.via, viaUrl: src.viaUrl, minGB: MIN_GB,
  note: 'Advertised travel-eSIM prices from a comparison site; reseller eSIMs, not networks. Verify at checkout.',
  countries,
};
fs.writeFileSync('../data/esims.json', JSON.stringify(out, null, 1));
fs.writeFileSync('esims-report.txt', log.join('\n'));
console.log(log.join('\n'));
