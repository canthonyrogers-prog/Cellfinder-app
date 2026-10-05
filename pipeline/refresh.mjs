import fs from 'node:fs';
import * as cheerio from 'cheerio';

const DATA = '../data/networks.json';
const MAX_FAIL = 0.4; // abort (and publish nothing) if more than 40% of lookups fail
const UA = 'CellFinderBot/0.1 (personal data refresh)';
const FIELDS = ['priceUSD', 'coverage'];
const today = new Date().toISOString().slice(0, 10);
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const { destinations: sources } = JSON.parse(fs.readFileSync('./sources.json', 'utf8'));
const log = [];
let tried = 0, failed = 0, ecb = null, erapi = null;

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

// ECB rates (frankfurter) cover EUR, GBP, JPY, MXN, TRY... but not every currency (e.g. DOP).
// open.er-api.com is the fallback.
async function toUSD(amount, cur) {
  if (!cur || cur === 'USD') return amount;
  if (!ecb) { try { ecb = (await (await fetch('https://api.frankfurter.app/latest?from=USD')).json()).rates || {}; } catch { ecb = {}; } }
  if (ecb[cur]) return amount / ecb[cur];
  if (!erapi) { try { erapi = (await (await fetch('https://open.er-api.com/v6/latest/USD')).json()).rates || {}; } catch { erapi = {}; } }
  if (erapi[cur]) return amount / erapi[cur];
  throw new Error('no exchange rate for ' + cur);
}

// 1. Anything without a recorded source is sample/placeholder data: remove it.
for (const d of data.destinations)
  for (const n of d.networks) {
    n.sources = n.sources || {};
    for (const f of FIELDS) if (!n.sources[f]) delete n[f];
  }

// 2. Apply sources.json
for (const src of sources) {
  let dest = data.destinations.find((d) => d.city === src.city && d.country === src.country);
  if (!dest) { dest = { city: src.city, country: src.country, networks: [] }; data.destinations.push(dest); }
  for (const n of src.networks) {
    let net = dest.networks.find((x) => x.name === n.name);
    if (!net) { net = { name: n.name, plan: '', sources: {} }; dest.networks.push(net); }
    if (n.plan) net.plan = n.plan;
    for (const [field, cfg] of [['priceUSD', n.price], ['coverage', n.coverage]]) {
      const label = `${src.city} / ${n.name} / ${field}`;
      const range = field === 'priceUSD' ? [1, 300] : [0, 100];
      if (!cfg || cfg.todo || (cfg.value === undefined && String(cfg.url).includes('TODO'))) {
        log.push('SKIP ' + label + ' (not configured)'); continue;
      }
      tried++;
      try {
        let v, srcInfo;
        if (cfg.value !== undefined) { // researched value entered by hand
          if (!cfg.source || !cfg.asOf) throw new Error('manual value needs source and asOf');
          v = cfg.value; srcInfo = { url: cfg.source, asOf: cfg.asOf };
          const age = (Date.now() - new Date(cfg.asOf)) / 864e5;
          if (age > (field === 'priceUSD' ? 120 : 450)) log.push('STALE ' + label + ' (asOf ' + cfg.asOf + ')');
        } else { // scraped
          v = await grab(cfg); srcInfo = { url: cfg.url, asOf: today };
          if (field === 'coverage') v = v * (cfg.multiply || 1);
          await sleep(2000);
        }
        if (field === 'priceUSD') v = Math.round((await toUSD(v, cfg.currency)) * 100) / 100;
        if (!(v >= range[0] && v <= range[1])) throw new Error('value out of range: ' + v);
        net[field] = v; net.sources[field] = srcInfo; delete net.stale;
        log.push('OK   ' + label + ' = ' + v + (cfg.value !== undefined ? ' (manual)' : ''));
      } catch (e) {
        failed++; net.stale = true;
        log.push('FAIL ' + label + ': ' + e.message + (net[field] !== undefined ? ' (kept previous value)' : ''));
      }
    }
  }
}

// 3. A network needs a sourced price to be shown. Coverage is optional: if any network in a
//    destination lacks a coverage score, the destination is flagged coverageAvailable:false and
//    the app shows only the cheapest option (no B or C). A destination needs 2+ priced networks.
for (const d of data.destinations) {
  d.networks = d.networks.filter((n) => typeof n.priceUSD === 'number');
  d.coverageAvailable = d.networks.length > 0 && d.networks.every((n) => typeof n.coverage === 'number');
}
const complete = data.destinations.filter((d) => d.networks.length >= 2);

log.push(`\n${tried} lookups, ${failed} failed, ${complete.length} destination(s) complete`);
const finish = (code = 0) => { fs.writeFileSync('report.txt', log.join('\n')); console.log(log.join('\n')); process.exit(code); };

if (tried && failed / tried > MAX_FAIL) { log.push('Too many failures, data not updated.'); finish(1); }
if (!complete.length) { // nothing real and complete yet: leave the published file untouched
  log.push('No destination has prices for 2 or more networks yet. Published file left unchanged.');
  finish(0);
}

data.destinations = complete;
data.updated = today;
data.note = 'Researched values. Each network lists its source and date under "sources".';
if (!data.roamingVerified) { // roaming/home-carrier numbers were placeholders
  delete data.roaming; delete data.homeCarriers;
  log.push('Removed placeholder roaming data (set "roamingVerified": true once real roaming data is added).');
}
fs.writeFileSync(DATA, JSON.stringify(data, null, 1));
finish(0);
