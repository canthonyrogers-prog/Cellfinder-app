import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed';
import bundledEsims from './data/esims.json';
import bundledRoaming from './data/roaming.json';
import { normCountry } from './utils';
import { THEMES, makeStyles } from './theme';

// Where the refreshed JSON lives (GitHub). Roaming sits next to the eSIM file.
const BASE = 'https://raw.githubusercontent.com/canthonyrogers-prog/Cellfinder-app/main/data/';
const ESIM_URL = BASE + 'esims.json';
const ROAM_URL = BASE + 'roaming.json';
const TRIPS = [3, 7, 14, 30];

// Only accept data in the shape this version understands (an older file on GitHub must not crash the app).
const goodPlan = (p) => p && typeof p.priceUSD === 'number' && typeof p.gb === 'number' && typeof p.days === 'number' && p.provider;
function cleanEsims(x) {
  if (!x || typeof x.countries !== 'object') return null;
  const countries = {};
  Object.entries(x.countries).forEach(([k, c]) => {
    if (c && goodPlan(c.cheapest) && goodPlan(c.value) && goodPlan(c.mostData)) countries[k] = c;
  });
  return Object.keys(countries).length ? { ...x, countries } : null;
}
const cleanRoaming = (x) => (x && Array.isArray(x.carriers) ? { ...x, rules: x.rules || {} } : null);
const money = (n) => {
  const r = Math.round(n * 100) / 100;
  return '$' + (Number.isInteger(r) ? String(r) : r.toFixed(2));
};

// The three eSIM options. If one plan wins several, it is shown once with several letters.
function options(c) {
  const defs = [['A', 'Cheapest', c.cheapest], ['B', 'Best value', c.value], ['C', 'Most data', c.mostData]];
  const out = [];
  defs.forEach(([tag, label, p]) => {
    const key = `${p.provider}|${p.gb}|${p.days}|${p.priceUSD}`;
    const hit = out.find((o) => o.key === key);
    if (hit) { hit.tags.push(tag); hit.labels.push(label); } else out.push({ key, tags: [tag], labels: [label], p });
  });
  return out;
}

// What roaming would cost for a trip of `days` days, from a rule in roaming.json.
function roamCost(rule, days) {
  if (!rule) return null;
  if (rule.kind === 'daily') {
    const raw = rule.dailyUSD * days;
    return { usd: rule.capUSD ? Math.min(raw, rule.capUSD) : raw };
  }
  if (rule.kind === 'included') return { usd: 0 };
  return { usd: null };
}

function EsimCard({ s, o }) {
  const p = o.p;
  const wide = o.tags.length > 1;
  return (
    <View style={s.card}>
      <View style={[s.badge, wide && { width: 'auto', minWidth: 52, paddingHorizontal: 10 }]}>
        <Text style={[s.badgeText, wide && { fontSize: 26 }]}>{o.tags.join(' ')}</Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.label}>{o.labels.join(' · ')}</Text>
        <Text style={s.net}>{p.provider}</Text>
        <Text style={s.plan}>{p.gb} GB · {p.days} days</Text>
      </View>
      <View style={s.priceCol}>
        <Text style={s.price}>{money(p.priceUSD)}</Text>
        <Text style={s.cov}>{money(p.perGB)}/GB</Text>
      </View>
    </View>
  );
}

function SignalGlyph({ color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 24 }}>
      {[8, 15, 22].map((h) => (
        <View key={h} style={{ width: 5, height: h, backgroundColor: color, borderRadius: 2, marginRight: 3 }} />
      ))}
    </View>
  );
}

function Roaming({ s, t, carrier, rule, days, cheapest }) {
  const cost = roamCost(rule, days);
  let title; let detail; let verdict = null;
  if (!rule) {
    title = 'Not listed yet';
    detail = `We haven't confirmed ${carrier.name}'s roaming rate for this country. Check with your carrier before you go.`;
  } else if (rule.kind === 'included') {
    title = 'Included';
    detail = rule.note || 'Roaming is included in this country on eligible plans.';
  } else if (rule.kind === 'none') {
    title = 'No roaming';
    detail = rule.note || 'This carrier does not offer roaming here. An eSIM is your best option.';
  } else {
    title = `${money(cost.usd)} for ${days} days`;
    detail = `${money(rule.dailyUSD)} per day${rule.capUSD ? `, capped at ${money(rule.capUSD)}` : ''}${rule.note ? '. ' + rule.note : ''}`;
    verdict = cost.usd > cheapest.priceUSD ? `The cheapest eSIM is ${money(cheapest.priceUSD)}.` : `Roaming costs less than the cheapest eSIM (${money(cheapest.priceUSD)}).`;
  }
  return (
    <View style={s.outlineCard}>
      <View style={s.iconBox}><SignalGlyph color={t.accent} /></View>
      <View style={s.cardBody}>
        <Text style={s.label}>Roaming on {carrier.name}</Text>
        <Text style={s.net}>{title}</Text>
        <Text style={s.plan}>{detail}</Text>
        {verdict ? <Text style={s.note}>{verdict}</Text> : null}
        {rule && rule.asOf ? <Text style={s.note}>Checked {rule.asOf}. Confirm with your carrier.</Text> : null}
      </View>
    </View>
  );
}

function Main() {
  const scheme = useColorScheme();
  const t = THEMES[scheme === 'dark' ? 'dark' : 'light'];
  const s = useMemo(() => makeStyles(t), [t]);

  const [esims, setEsims] = useState(bundledEsims);
  const [roaming, setRoaming] = useState(bundledRoaming);
  const [country, setCountry] = useState('');
  const [days, setDays] = useState(7);
  const [group, setGroup] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const ce = await AsyncStorage.getItem('cf2-esims');
        const e1 = ce && cleanEsims(JSON.parse(ce)); if (e1) setEsims(e1);
        const cr = await AsyncStorage.getItem('cf2-roaming');
        const r1 = cr && cleanRoaming(JSON.parse(cr)); if (r1) setRoaming(r1);
        const re = await fetch(ESIM_URL); const fe = cleanEsims(await re.json());
        if (fe) { setEsims(fe); await AsyncStorage.setItem('cf2-esims', JSON.stringify(fe)); }
        const rr = await fetch(ROAM_URL); const fr = cleanRoaming(await rr.json());
        if (fr) { setRoaming(fr); await AsyncStorage.setItem('cf2-roaming', JSON.stringify(fr)); }
      } catch (e) { /* keep bundled or cached data */ }
    })();
  }, []);

  const names = useMemo(() => Object.keys(esims?.countries || {}), [esims]);
  const carriers = roaming?.carriers || [];
  const groups = useMemo(() => [...new Set(carriers.map((c) => c.group))], [carriers]);
  const members = carriers.filter((c) => c.group === group);
  const carrier = carriers.find((c) => c.id === carrierId) || null;

  const typed = normCountry(country);
  const matches = names.filter((n) => normCountry(n).includes(typed));

  const run = (name, d = days, cid = carrierId) => {
    const c = esims.countries[name];
    if (!c) { setResult(null); setError('No data for that country yet. Pick one from the list.'); return; }
    setError('');
    const car = carriers.find((x) => x.id === cid) || null;
    const rules = (roaming.rules && car && roaming.rules[car.id]) || null;
    const rule = rules ? rules[name] || rules['*'] || null : null;
    setResult({ name, c, car, rule, d });
  };
  const pick = (name) => { setCountry(name); run(name); };
  const submit = () => {
    const exact = names.find((n) => normCountry(n) === typed);
    if (exact) return run(exact);
    if (typed && matches.length === 1) { setCountry(matches[0]); return run(matches[0]); }
    setResult(null);
    setError(typed ? 'No data for that country yet. Pick one from the list.' : 'Enter a country.');
  };
  const chooseDays = (d) => { setDays(d); if (result) run(result.name, d); };
  const chooseGroup = (g) => {
    const next = group === g ? '' : g;
    setGroup(next);
    // Choosing a parent brand also picks its main brand (the member with the same name, or the only member).
    const mem = carriers.filter((c) => c.group === next);
    const main = next ? (mem.find((m) => m.name === next) || (mem.length === 1 ? mem[0] : null)) : null;
    const id = main ? main.id : '';
    setCarrierId(id);
    if (result) run(result.name, days, id);
  };
  const chooseCarrier = (id) => { const next = carrierId === id ? '' : id; setCarrierId(next); if (result) run(result.name, days, next); };

  const opts = result ? options(result.c) : [];
  return (
    <View style={s.root}>
      <StatusBar style={t.statusBar} />
      <View style={s.headerWrap}>
        <SafeAreaView>
          <View style={s.header}>
            <Text style={s.title} accessibilityRole="header">Cell Finder</Text>
            <Text style={s.tagline}>Find the best eSIM before you fly.</Text>
          </View>
        </SafeAreaView>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <TextInput style={s.input} placeholder="Where are you going?" placeholderTextColor={t.muted} accessibilityLabel="Country" value={country} onChangeText={setCountry} onSubmitEditing={submit} />

        <Text style={s.fieldLabel}>Trip length</Text>
        <View style={s.chipRow}>
          {TRIPS.map((d) => (
            <TouchableOpacity key={d} style={[s.chip, days === d && s.chipOn]} onPress={() => chooseDays(d)} accessibilityRole="button" accessibilityState={{ selected: days === d }}>
              <Text style={[s.chipText, days === d && s.chipTextOn]}>{d} days</Text>
            </TouchableOpacity>
          ))}
        </View>

        {groups.length > 0 && (
          <View>
            <Text style={s.fieldLabel}>Your home carrier (optional)</Text>
            <View style={s.chipRow}>
              {groups.map((g) => (
                <TouchableOpacity key={g} style={[s.chip, group === g && s.chipOn]} onPress={() => chooseGroup(g)} accessibilityRole="button" accessibilityState={{ selected: group === g }}>
                  <Text style={[s.chipText, group === g && s.chipTextOn]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {members.length > 0 && (
              <View style={s.chipRow}>
                {members.map((m) => (
                  <TouchableOpacity key={m.id} style={[s.chip, carrierId === m.id && s.chipOn]} onPress={() => chooseCarrier(m.id)} accessibilityRole="button" accessibilityState={{ selected: carrierId === m.id }}>
                    <Text style={[s.chipText, carrierId === m.id && s.chipTextOn]}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={s.button} onPress={submit} accessibilityRole="button">
          <Text style={s.buttonText}>Compare</Text>
        </TouchableOpacity>

        {!!error && <Text style={s.error}>{error}</Text>}

        {result ? (
          <View>
            <Text style={s.dest} accessibilityRole="header">{result.name}</Text>
            <Text style={s.intro}>Best travel eSIMs, bought before you leave.</Text>
            {opts.map((o) => <EsimCard key={o.key} s={s} o={o} />)}
            {result.car ? <Roaming s={s} t={t} carrier={result.car} rule={result.rule} days={result.d} cheapest={result.c.cheapest} /> : null}
            <Text style={s.foot}>Advertised prices via {esims.via || 'a comparison site'}, checked {result.c.asOf}. These are reseller eSIMs, not local networks. Check the plan's network, hotspot rules and taxes at checkout.</Text>
          </View>
        ) : (
          <View>
            <Text style={s.sectionLabel}>{typed ? 'Matching destinations' : 'Try a destination'}</Text>
            {matches.map((n) => (
              <TouchableOpacity key={n} style={s.row} onPress={() => pick(n)} accessibilityRole="button">
                <Text style={s.rowMain}>{n}</Text>
                <Text style={s.rowSub}>From {money(esims.countries[n].cheapest.priceUSD)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [loaded, fontError] = useFonts({
    Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold,
    BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold,
  });
  if (!loaded && !fontError) return null;
  return <Main />;
}
