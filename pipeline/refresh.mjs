import fs from 'node:fs';
import * as cheerio from 'cheerio';

const DATA = '../data/networks.json';
const MAX_FAIL = 0.4; // abort (and publish nothing) if more than 40% of lookups fail
const UA = 'CellFinderBot/0.1 (personal data refresh)';
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const { destinations: sources } = JSON.parse(fs.readFileSync('./sources.json', 'utf8'));
const log = [];
let tried = 0, failed = 0, rates = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseNum(text) {
  const m = text.replace(/\s/g, '').match(/\d[\d.,]*/);
  if (!m) return NaN;
  let s = m[0];
  s = /,\d{3}(\D|$)/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  return parseFloat(s);
}

async function grab({ url, selector }) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const el = cheerio.load(await res.text())(selector).first();
  if (!el.length) throw new Error('selector not found');
  return parseNum(el.text());
}

async function toUSD(amount, cur) {
  if (!cur || cur === 'USD') return amount;
  if (!rates) rates = (await (await fetch('https://api.frankfurter.app/latest?from=USD')).json()).rates;
  if (!rates[cur]) throw new Error('no exchange rate for ' + cur);
  return amount / rates[cur];
}

for (const src of sources) {
  let dest = data.destinations.find((d) => d.city === src.city && d.country === src.country);
  if (!dest) { dest = { city: src.city, country: src.country, networks: [] }; data.destinations.push(dest); }
  for (const n of src.networks) {
    let net = dest.networks.find((x) => x.name === n.name);
    if (!net) { net = { name: n.name, plan: '' }; dest.networks.push(net); }
    if (n.plan) net.plan = n.plan;
    for (const [field, cfg] of [['priceUSD', n.price], ['coverage', n.coverage]]) {
      const label = `${src.city} / ${n.name} / ${field}`;
      if (cfg && cfg.value !== undefined) { // researched value entered by hand, with its source
        tried++;
        try {
          const v = field === 'priceUSD' ? Math.round((await toUSD(cfg.value, cfg.currency)) * 100) / 100 : cfg.value;
          const [lo, hi] = field === 'priceUSD' ? [1, 300] : [0, 100];
          if (!(v >= lo && v <= hi)) throw new Error('value out of range: ' + v);
          if (!cfg.source || !cfg.asOf) throw new Error('manual value needs source and asOf');
          const age = (Date.now() - new Date(cfg.asOf)) / 864e5;
          if (age > (field === 'priceUSD' ? 120 : 450)) log.push('STALE ' + label + ' (asOf ' + cfg.asOf + ')');
          net[field] = v; delete net.stale;
          net.sources = { ...net.sources, [field]: { url: cfg.source, asOf: cfg.asOf } };
          log.push('OK   ' + label + ' = ' + v + ' (manual)');
        } catch (e) { failed++; net.stale = true; log.push('FAIL ' + label + ': ' + e.message); }
        continue;
      }
      if (!cfg || cfg.todo || String(cfg.url).includes('TODO')) { log.push('SKIP ' + label + ' (not configured)'); continue; }
      tried++;
      try {
        let v = await grab(cfg);
        if (field === 'priceUSD') v = Math.round((await toUSD(v, cfg.currency)) * 100) / 100;
        else v = v * (cfg.multiply || 1);
        const [lo, hi] = field === 'priceUSD' ? [1, 300] : [0, 100];
        if (!(v >= lo && v <= hi)) throw new Error('value out of range: ' + v);
        net[field] = v; delete net.stale;
        log.push('OK   ' + label + ' = ' + v);
      } catch (e) {
        failed++; net.stale = true;
        log.push('FAIL ' + label + ': ' + e.message + ' (kept previous value)');
      }
      await sleep(2000);
    }
  }
}

// drop networks that still lack numbers, and empty destinations
for (const d of data.destinations)
  d.networks = d.networks.filter((n) => typeof n.priceUSD === 'number' && typeof n.coverage === 'number');
data.destinations = data.destinations.filter((d) => d.networks.length);

log.push(`\n${tried} lookups, ${failed} failed`);
fs.writeFileSync('report.txt', log.join('\n'));
console.log(log.join('\n'));
if (tried && failed / tried > MAX_FAIL) { console.error('Too many failures, data not updated.'); process.exit(1); }
data.updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(DATA, JSON.stringify(data, null, 1));
