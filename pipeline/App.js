import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bundled from './data/networks.json';
import bundledEsims from './data/esims.json';
import { normCountry } from './utils';

// Host the refreshed JSON (e.g. GitHub Pages / S3) and put its URL here.
const DATA_URL = 'https://raw.githubusercontent.com/canthonyrogers-prog/Cellfinder-app/main/data/networks.json';
const ESIM_URL = DATA_URL ? DATA_URL.replace('networks.json', 'esims.json') : '';
const C = { navy: '#0B2A5B', blue: '#1F6FEB', sky: '#EAF2FF', yellow: '#FFC72C', ink: '#0F1B33', mute: '#5B6B88', white: '#FFFFFF' };

const norm = (s) => s.trim().toLowerCase();

function rank(networks) {
  const minPrice = Math.min(...networks.map((n) => n.priceUSD));
  const maxCov = Math.max(...networks.map((n) => n.coverage));
  const score = (n) => 0.5 * (n.coverage / maxCov) + 0.5 * (minPrice / n.priceUSD);
  return {
    cheapest: [...networks].sort((a, b) => a.priceUSD - b.priceUSD)[0],
    coverage: [...networks].sort((a, b) => b.coverage - a.coverage)[0],
    balanced: [...networks].sort((a, b) => score(b) - score(a))[0],
  };
}

function Card({ label, tag, n }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.label}>{label}</Text>
        <View style={s.tag}><Text style={s.tagText}>{tag}</Text></View>
      </View>
      <Text style={s.net}>{n.name}</Text>
      <Text style={s.meta}>${n.priceUSD} · Coverage {n.coverage}/100</Text>
      <Text style={s.plan}>{n.plan}</Text>
    </View>
  );
}

function EsimCard({ e, via }) {
  return (
    <View style={[s.card, s.roam]}>
      <View style={s.cardHead}>
        <Text style={s.label}>Travel eSIM</Text>
        <View style={s.tag}><Text style={s.tagText}>eSIM</Text></View>
      </View>
      <Text style={s.net}>{e.provider}</Text>
      <Text style={s.meta}>From ${e.priceUSD} · {e.gb} GB · {e.days} days</Text>
      <Text style={s.plan}>A reseller eSIM you can install before you land, not a local network. Prices are advertised examples via {via}, checked {e.asOf}. Confirm at checkout.</Text>
    </View>
  );
}

function Roaming({ home, roam, cheapest }) {
  const has = roam && roam.partner;
  return (
    <View style={[s.card, s.roam]}>
      <Text style={s.label}>Your carrier abroad: {home}</Text>
      {has ? (
        <>
          <Text style={s.net}>{roam.partner}</Text>
          <Text style={s.meta}>Partner network · ${roam.dailyPassUSD}/day pass</Text>
          <Text style={s.plan}>10 days: ${roam.dailyPassUSD * 10} roaming vs ${cheapest.priceUSD} for the cheapest SIM</Text>
        </>
      ) : (
        <Text style={s.plan}>No partner network listed here. A local SIM is your best option.</Text>
      )}
    </View>
  );
}

export default function App() {
  const [data, setData] = useState(bundled);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [esims, setEsims] = useState(bundledEsims);
  const [home, setHome] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('cf-data');
        if (cached) setData(JSON.parse(cached));
        const cachedE = await AsyncStorage.getItem('cf-esims');
        if (cachedE) setEsims(JSON.parse(cachedE));
        if (DATA_URL) {
          const res = await fetch(DATA_URL);
          const fresh = await res.json();
          setData(fresh);
          await AsyncStorage.setItem('cf-data', JSON.stringify(fresh));
        }
        if (ESIM_URL) {
          const resE = await fetch(ESIM_URL);
          const freshE = await resE.json();
          setEsims(freshE);
          await AsyncStorage.setItem('cf-esims', JSON.stringify(freshE));
        }
      } catch (e) { /* keep bundled data */ }
    })();
  }, []);

  const esimMap = useMemo(() => {
    const m = {};
    Object.entries(esims?.countries || {}).forEach(([c, v]) => { m[normCountry(c)] = { country: c, ...v }; });
    return m;
  }, [esims]);

  const known = useMemo(() => {
    const dests = data.destinations.map((d) => `${d.city}, ${d.country}`);
    const have = new Set(data.destinations.map((d) => normCountry(d.country)));
    const extra = Object.values(esimMap).filter((e) => !have.has(normCountry(e.country))).map((e) => e.country);
    return [...dests, ...extra];
  }, [data, esimMap]);

  const search = () => {
    if (!country.trim()) { setResult(null); setError('Enter a country.'); return; }
    const match = data.destinations.find((d) => norm(d.city) === norm(city) && normCountry(d.country) === normCountry(country));
    const esim = esimMap[normCountry(country)] || null;
    if (!match && !esim) {
      setResult(null);
      setError('No data for that city and country yet. Check the spelling or try a listed destination.');
      return;
    }
    setError('');
    if (!match) {
      setResult({ dest: { city: city.trim(), country: esim.country }, esim, noNetworks: true });
      return;
    }
    const roam = home ? data.roaming?.[home]?.[match.country] || null : null;
    setResult({ dest: match, roam, esim, ...rank(match.networks) });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Text style={s.title}>Cell Finder</Text>
        <Text style={s.sub}>Pick the right SIM before you land.</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <TextInput style={s.input} placeholder="City" placeholderTextColor={C.mute} value={city} onChangeText={setCity} />
        <TextInput style={s.input} placeholder="Country" placeholderTextColor={C.mute} value={country} onChangeText={setCountry} onSubmitEditing={search} />
        <Text style={s.fieldLabel}>Your home carrier</Text>
        <View style={s.row}>
          {(data.homeCarriers || []).map((h) => (
            <TouchableOpacity key={h} style={[s.pick, home === h && s.pickOn]} onPress={() => setHome(home === h ? '' : h)}>
              <Text style={[s.pickText, home === h && s.pickTextOn]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.button} onPress={search} accessibilityRole="button">
          <Text style={s.buttonText}>Find networks</Text>
        </TouchableOpacity>

        {!!error && <Text style={s.error}>{error}</Text>}

        {result ? (
          <View>
            <Text style={s.dest}>{result.dest.city ? `${result.dest.city}, ` : ''}{result.dest.country}</Text>
            {result.noNetworks ? (
              <Text style={s.plan}>Local network comparison isn't available for this city yet. Here is the cheapest travel eSIM for the country.</Text>
            ) : (
              <View>
                <Card label="Cheapest" tag="A" n={result.cheapest} />
                <Card label="Best coverage" tag="B" n={result.coverage} />
                <Card label="Best overall value" tag="C" n={result.balanced} />
                {home ? <Roaming home={home} roam={result.roam} cheapest={result.cheapest} /> : null}
              </View>
            )}
            {result.esim ? <EsimCard e={result.esim} via={esims.via || 'a comparison site'} /> : null}
            {!result.noNetworks ? <Text style={s.foot}>Network data: {data.updated}. Prices in USD for the entry tourist plan; verify with the carrier before buying.</Text> : null}
          </View>
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Try a destination</Text>
            {known.map((k) => (
              <TouchableOpacity key={k} onPress={() => { const [c, co] = k.split(', '); setCity(c); setCountry(co); }}>
                <Text style={s.chip}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  header: { padding: 24, paddingBottom: 20 },
  title: { color: C.white, fontSize: 30, fontWeight: '800' },
  sub: { color: C.yellow, fontSize: 15, marginTop: 4 },
  body: { backgroundColor: C.sky, padding: 20, minHeight: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  input: { backgroundColor: C.white, borderRadius: 12, padding: 14, fontSize: 16, color: C.ink, marginBottom: 12, borderWidth: 1, borderColor: '#D3E1FA' },
  button: { backgroundColor: C.yellow, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: C.navy, fontSize: 16, fontWeight: '800' },
  error: { color: '#B42318', marginBottom: 12 },
  dest: { fontSize: 20, fontWeight: '700', color: C.navy, marginBottom: 12 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 6, borderLeftColor: C.blue },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.mute, fontSize: 14, fontWeight: '600' },
  tag: { backgroundColor: C.yellow, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 },
  tagText: { color: C.navy, fontWeight: '800' },
  net: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 6 },
  meta: { color: C.blue, fontWeight: '600', marginTop: 4 },
  plan: { color: C.mute, marginTop: 2 },
  fieldLabel: { color: C.navy, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  pick: { borderWidth: 1, borderColor: C.blue, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: C.white },
  pickOn: { backgroundColor: C.blue },
  pickText: { color: C.blue, fontWeight: '600' },
  pickTextOn: { color: C.white },
  roam: { borderLeftColor: C.yellow },
  foot: { color: C.mute, fontSize: 12, marginTop: 8 },
  empty: { marginTop: 4 },
  emptyTitle: { color: C.navy, fontWeight: '700', marginBottom: 8 },
  chip: { color: C.blue, fontSize: 16, paddingVertical: 8 },
});
