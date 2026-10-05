import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed';
import bundled from './data/networks.json';
import bundledEsims from './data/esims.json';
import { normCountry } from './utils';
import { THEMES, makeStyles } from './theme';

// Host the refreshed JSON (GitHub) and put its URL here.
const DATA_URL = 'https://raw.githubusercontent.com/canthonyrogers-prog/Cellfinder-app/main/data/networks.json';
const ESIM_URL = DATA_URL ? DATA_URL.replace('networks.json', 'esims.json') : '';

const norm = (s = '') => s.trim().toLowerCase();

function rank(networks, hasCoverage) {
  if (!hasCoverage) {
    return { cheapest: [...networks].sort((a, b) => a.priceUSD - b.priceUSD)[0], coverageMissing: true };
  }
  const minPrice = Math.min(...networks.map((n) => n.priceUSD));
  const maxCov = Math.max(...networks.map((n) => n.coverage));
  const score = (n) => 0.5 * (n.coverage / maxCov) + 0.5 * (minPrice / n.priceUSD);
  return {
    cheapest: [...networks].sort((a, b) => a.priceUSD - b.priceUSD)[0],
    coverage: [...networks].sort((a, b) => b.coverage - a.coverage)[0],
    balanced: [...networks].sort((a, b) => score(b) - score(a))[0],
  };
}

function Card({ s, label, tag, n }) {
  return (
    <View style={s.card}>
      <View style={s.badge}><Text style={s.badgeText}>{tag}</Text></View>
      <View style={s.cardBody}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.net}>{n.name}</Text>
        <Text style={s.plan}>{n.plan}</Text>
      </View>
      <View style={s.priceCol}>
        <Text style={s.price}>${n.priceUSD}</Text>
        {typeof n.coverage === 'number' ? <Text style={s.cov}>Coverage {n.coverage}/100</Text> : null}
      </View>
    </View>
  );
}

function SimGlyph({ color }) {
  return (
    <View style={{ width: 22, height: 28, borderWidth: 2, borderColor: color, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 10, height: 10, borderWidth: 2, borderColor: color, borderRadius: 2 }} />
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

function EsimCard({ s, t, e, via }) {
  return (
    <View style={s.outlineCard}>
      <View style={s.iconBox}><SimGlyph color={t.accent} /></View>
      <View style={s.cardBody}>
        <Text style={s.label}>Travel eSIM</Text>
        <View style={s.eRow}>
          <Text style={s.net}>{e.provider}</Text>
          <Text style={s.price}>${e.priceUSD}</Text>
        </View>
        <Text style={s.plan}>{e.gb} GB · {e.days} days</Text>
        <Text style={s.note}>Install before you land. A reseller eSIM, not a local network. Advertised price via {via}, checked {e.asOf}. Confirm at checkout.</Text>
      </View>
    </View>
  );
}

function Roaming({ s, t, home, roam, cheapest }) {
  const has = roam && roam.partner;
  return (
    <View style={s.outlineCard}>
      <View style={s.iconBox}><SignalGlyph color={t.accent} /></View>
      <View style={s.cardBody}>
        <Text style={s.label}>Your carrier abroad: {home}</Text>
        {has ? (
          <>
            <Text style={s.net}>{roam.partner}</Text>
            <Text style={s.plan}>Partner network · ${roam.dailyPassUSD}/day pass</Text>
            <Text style={s.note}>10 days: ${roam.dailyPassUSD * 10} roaming vs ${cheapest.priceUSD} for the cheapest SIM</Text>
          </>
        ) : (
          <Text style={s.note}>No partner network listed here. A local SIM is your best option.</Text>
        )}
      </View>
    </View>
  );
}

function Main() {
  const scheme = useColorScheme();
  const t = THEMES[scheme === 'dark' ? 'dark' : 'light'];
  const s = useMemo(() => makeStyles(t), [t]);

  const [data, setData] = useState(bundled);
  const [esims, setEsims] = useState(bundledEsims);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
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
      } catch (e) { /* keep bundled or cached data */ }
    })();
  }, []);

  const esimMap = useMemo(() => {
    const m = {};
    Object.entries(esims?.countries || {}).forEach(([c, v]) => { m[normCountry(c)] = { country: c, ...v }; });
    return m;
  }, [esims]);

  const suggestions = useMemo(() => {
    const dests = data.destinations.map((d) => ({ city: d.city, country: d.country, sub: d.country }));
    const have = new Set(data.destinations.map((d) => normCountry(d.country)));
    const extra = Object.values(esimMap)
      .filter((e) => !have.has(normCountry(e.country)))
      .map((e) => ({ city: '', country: e.country, sub: 'Travel eSIM only' }));
    return [...dests, ...extra];
  }, [data, esimMap]);

  const search = (cityArg, countryArg) => {
    const c = cityArg !== undefined ? cityArg : city;
    const co = countryArg !== undefined ? countryArg : country;
    if (!co.trim()) { setResult(null); setError('Enter a country.'); return; }
    const match = data.destinations.find((d) => norm(d.city) === norm(c) && normCountry(d.country) === normCountry(co));
    const esim = esimMap[normCountry(co)] || null;
    if (!match && !esim) {
      setResult(null);
      setError('No data for that city and country yet. Check the spelling or try a listed destination.');
      return;
    }
    setError('');
    if (!match) {
      setResult({ dest: { city: c.trim(), country: esim.country }, esim, noNetworks: true });
      return;
    }
    const roam = home ? data.roaming?.[home]?.[match.country] || null : null;
    setResult({ dest: match, roam, esim, ...rank(match.networks, match.coverageAvailable !== false) });
  };

  const pick = (x) => { setCity(x.city); setCountry(x.country); search(x.city, x.country); };
  const carriers = data.homeCarriers || [];

  return (
    <View style={s.root}>
      <StatusBar style={t.statusBar} />
      <View style={s.headerWrap}>
        <SafeAreaView>
          <View style={s.header}>
            <Text style={s.title} accessibilityRole="header">Cell Finder</Text>
            <Text style={s.tagline}>Pick the right SIM before you land.</Text>
          </View>
        </SafeAreaView>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <TextInput style={s.input} placeholder="City" placeholderTextColor={t.muted} accessibilityLabel="City" value={city} onChangeText={setCity} />
        <TextInput style={s.input} placeholder="Country" placeholderTextColor={t.muted} accessibilityLabel="Country" value={country} onChangeText={setCountry} onSubmitEditing={() => search()} />

        {carriers.length > 0 && (
          <View>
            <Text style={s.fieldLabel}>Your home carrier</Text>
            <View style={s.chipRow}>
              {carriers.map((h) => (
                <TouchableOpacity key={h} style={[s.chip, home === h && s.chipOn]} onPress={() => setHome(home === h ? '' : h)} accessibilityRole="button" accessibilityState={{ selected: home === h }}>
                  <Text style={[s.chipText, home === h && s.chipTextOn]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={s.button} onPress={() => search()} accessibilityRole="button">
          <Text style={s.buttonText}>Find networks</Text>
        </TouchableOpacity>

        {!!error && <Text style={s.error}>{error}</Text>}

        {result ? (
          <View>
            <Text style={s.dest} accessibilityRole="header">{result.dest.city ? `${result.dest.city}, ` : ''}{result.dest.country}</Text>
            {result.noNetworks ? (
              <Text style={s.intro}>Local network comparison isn't available for this city yet. Here is the cheapest travel eSIM for the country.</Text>
            ) : (
              <View>
                <Card s={s} label="Cheapest" tag="A" n={result.cheapest} />
                {result.coverageMissing ? (
                  <Text style={s.intro}>Coverage ratings for this destination are coming soon, so only the cheapest network is shown.</Text>
                ) : (
                  <View>
                    <Card s={s} label="Best coverage" tag="B" n={result.coverage} />
                    <Card s={s} label="Best overall value" tag="C" n={result.balanced} />
                  </View>
                )}
                {home ? <Roaming s={s} t={t} home={home} roam={result.roam} cheapest={result.cheapest} /> : null}
              </View>
            )}
            {result.esim ? <EsimCard s={s} t={t} e={result.esim} via={esims.via || 'a comparison site'} /> : null}
            {!result.noNetworks ? <Text style={s.foot}>Network data: {data.updated}. Prices in USD for the entry tourist plan; verify with the carrier before buying.</Text> : null}
          </View>
        ) : (
          <View>
            <Text style={s.sectionLabel}>Try a destination</Text>
            {suggestions.map((x) => (
              <TouchableOpacity key={`${x.city}|${x.country}`} style={s.row} onPress={() => pick(x)} accessibilityRole="button">
                <Text style={s.rowMain}>{x.city || x.country}</Text>
                <Text style={s.rowSub}>{x.sub}</Text>
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
