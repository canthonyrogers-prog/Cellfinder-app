import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, useColorScheme, BackHandler, Linking, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed';
import bundled from './data/networks.json';
import bundledEsims from './data/esims.json';
import bundledRoaming from './data/roaming.json';
import { normCountry } from './utils';
import { THEMES, makeStyles } from './theme';

const SUNRISE = require('./assets/sunrise.jpg');

// Seller home pages, used when a plan has no page of its own in the data.
const SELLER_SITES = {
  Airalo: 'https://www.airalo.com/',
  Nomad: 'https://www.nomadesim.com/',
  Holafly: 'https://esim.holafly.com/',
  Saily: 'https://saily.com/',
  Ubigi: 'https://cellulardata.ubigi.com/',
  'Maya Mobile': 'https://maya.net/',
  Breeze: 'https://breezesim.com/',
  'Orange Travel': 'https://travel.orange.com/en',
  Yesim: 'https://yesim.app/',
  GigSky: 'https://www.gigsky.com/',
  EtravelSIM: 'https://etravelsim.com/',
  GlobaleSIM: 'https://globalesim.app/',
  'Sim Local': 'https://www.simlocal.com/',
  Jetpac: 'https://www.jetpacglobal.com/',
  GoMoWorld: 'https://www.gomoworld.com/en',
};
const sellerUrl = (p) => p.url || SELLER_SITES[p.provider] || '';
// Only ever open https links from our own data.
const openSeller = (p) => {
  const u = sellerUrl(p);
  if (typeof u === 'string' && u.startsWith('https://')) Linking.openURL(u).catch(() => {});
};

// Host the refreshed JSON (GitHub) and put its URL here.
const DATA_URL = 'https://raw.githubusercontent.com/canthonyrogers-prog/Cellfinder-app/main/data/networks.json';
const ESIM_URL = DATA_URL ? DATA_URL.replace('networks.json', 'esims.json') : '';
const ROAMING_URL = DATA_URL ? DATA_URL.replace('networks.json', 'roaming.json') : '';

const norm = (s = '') => s.trim().toLowerCase();

// Trip length options. A plan must last the whole trip, so "10+" means a plan valid 11 days or more.
const TRIP_OPTIONS = [
  { key: '3', label: '3 days', min: 3 },
  { key: '5', label: '5 days', min: 5 },
  { key: '7', label: '7 days', min: 7 },
  { key: '10', label: '10 days', min: 10 },
  { key: '10+', label: 'More than 10 days', min: 11 },
];
const tripLabel = (key) => (TRIP_OPTIONS.find((o) => o.key === key) || TRIP_OPTIONS[2]).label;

// Cheapest eSIM that lasts the whole trip, one plan per seller and network, cheapest first.
function chooseEsim(esim, tripKey) {
  if (!esim) return null;
  const min = (TRIP_OPTIONS.find((o) => o.key === tripKey) || TRIP_OPTIONS[2]).min;
  const best = {};
  (esim.plans || []).filter((p) => p.days >= min).forEach((p) => {
    const k = `${p.provider}|${p.network || ''}`;
    if (!best[k] || p.priceUSD < best[k].priceUSD) best[k] = p;
  });
  const list = Object.values(best).sort((a, b) => a.priceUSD - b.priceUSD || a.days - b.days);
  return list.length ? { ...list[0], plans: list } : null;
}

// Carrier home pages, used when a country has no roaming page of its own in the data.
const CARRIER_SITES = {
  'T-Mobile': 'https://www.t-mobile.com/',
  Verizon: 'https://www.verizon.com/',
  'AT&T': 'https://www.att.com/',
};

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

const money = (x) => `$${Number(x).toFixed(2)}`;
const gbText = (p) => (p.unlimited ? 'Unlimited data' : `${p.gb} GB`);
const netText = (p) => (p.network ? `Network: ${p.network}` : 'Network not stated');

function EsimCard({ s, t, e, tripKey }) {
  const more = (e.plans || []).slice(1);
  return (
    <View>
      <View style={s.outlineCard}>
        <View style={s.iconBox}><SimGlyph color={t.accent} /></View>
        <View style={s.cardBody}>
          <Text style={s.label}>Cheapest travel eSIM for {tripLabel(tripKey).toLowerCase()}</Text>
          <View style={s.eRow}>
            <Text style={s.net}>{e.provider}</Text>
            <Text style={s.price}>{money(e.priceUSD)}</Text>
          </View>
          <Text style={s.plan}>{gbText(e)} · {e.days} days</Text>
          <Text style={s.plan}>{netText(e)}</Text>
          <Text style={s.note}>Install before you land. A reseller eSIM, not a local network. Advertised price on {e.provider}'s website, checked {e.asOf}. Confirm at checkout.</Text>
          {sellerUrl(e) ? (
            <View>
              <TouchableOpacity style={s.linkBtn} onPress={() => openSeller(e)} accessibilityRole="link" accessibilityLabel={`Open ${e.provider} website`}>
                <Text style={s.linkBtnText}>Visit {e.provider} {'\u203A'}</Text>
              </TouchableOpacity>
              <Text style={s.linkNote}>Opens the seller's website. Check the final price there.</Text>
            </View>
          ) : null}
        </View>
      </View>
      {more.length > 0 ? (
        <View>
          <Text style={s.sectionLabel}>More eSIM options</Text>
          {more.map((p) => (
            <TouchableOpacity key={`${p.provider}|${p.network || ''}|${p.unlimited ? 'u' : p.gb}|${p.days}|${p.priceUSD}`} style={s.row} onPress={() => openSeller(p)} disabled={!sellerUrl(p)} accessibilityRole="link" accessibilityLabel={`Open ${p.provider} website`}>
              <View style={s.rowLine}>
                <Text style={s.rowMain}>{p.provider}</Text>
                <Text style={s.rowPrice}>{money(p.priceUSD)}</Text>
              </View>
              <Text style={s.rowSub}>{gbText(p)} · {p.days} days · {netText(p)}</Text>
              {sellerUrl(p) ? <Text style={s.rowLink}>Visit {p.provider} {'\u203A'}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Roaming({ s, t, home, info }) {
  const linkUrl = (info && info.url) || CARRIER_SITES[home] || '';
  const openCarrier = () => {
    if (typeof linkUrl === 'string' && linkUrl.startsWith('https://')) Linking.openURL(linkUrl).catch(() => {});
  };
  return (
    <View style={s.outlineCard}>
      <View style={s.iconBox}><SignalGlyph color={t.accent} /></View>
      <View style={s.cardBody}>
        <Text style={s.label}>Your carrier abroad: {home}</Text>
        {info ? (
          <>
            <Text style={s.net}>{info.headline}</Text>
            <Text style={s.plan}>{info.detail}</Text>
            <Text style={s.plan}>{info.pass}</Text>
            {info.caution ? <Text style={s.note}>{info.caution}</Text> : null}
            <Text style={s.note}>Checked {info.asOf}.</Text>
          </>
        ) : (
          <Text style={s.note}>No roaming details for this country yet. A travel eSIM is a safe choice.</Text>
        )}
        {linkUrl ? (
          <View>
            <TouchableOpacity style={s.linkBtn} onPress={openCarrier} accessibilityRole="link" accessibilityLabel={`Open ${home} website`}>
              <Text style={s.linkBtnText}>See {home} roaming {'\u203A'}</Text>
            </TouchableOpacity>
            <Text style={s.linkNote}>Opens {home}'s website. Confirm your plan and price there.</Text>
          </View>
        ) : null}
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
  const [roaming, setRoaming] = useState(bundledRoaming);
  const [tripKey, setTripKey] = useState('7');
  const [menuOpen, setMenuOpen] = useState(false);
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
        const cachedR = await AsyncStorage.getItem('cf-roaming');
        if (cachedR) setRoaming(JSON.parse(cachedR));
        if (ROAMING_URL) {
          const resR = await fetch(ROAMING_URL);
          const freshR = await resR.json();
          setRoaming(freshR);
          await AsyncStorage.setItem('cf-roaming', JSON.stringify(freshR));
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
      .map((e) => ({ city: '', country: e.country, sub: 'Travel eSIM only' }))
      .sort((x, y) => x.country.localeCompare(y.country));
    return [...dests, ...extra];
  }, [data, esimMap]);

  const search = (countryArg) => {
    const co = countryArg !== undefined ? countryArg : country;
    if (!co.trim()) { setResult(null); setError('Enter a country.'); return; }
    const match = data.destinations.find((d) => normCountry(d.country) === normCountry(co));
    const esim = esimMap[normCountry(co)] || null;
    if (!match && !esim) {
      setResult(null);
      setError('No data for that country yet. Check the spelling or try a listed destination.');
      return;
    }
    setError('');
    if (!match) {
      setResult({ dest: { city: '', country: esim.country }, esim, noNetworks: true });
      return;
    }
    setResult({ dest: match, esim, ...rank(match.networks, match.coverageAvailable !== false) });
  };

  const goBack = () => { setResult(null); setError(''); setCountry(''); setMenuOpen(false); };

  // Android phone back button returns to the destination list instead of closing the app.
  useEffect(() => {
    if (!result) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
    return () => sub.remove();
  }, [result]);

  const POPULAR = [
    { flag: '\u{1F1F2}\u{1F1FD}', country: 'Mexico', grow: 1 },
    { flag: '\u{1F1E8}\u{1F1F7}', country: 'Costa Rica', grow: 1 },
    { flag: '\u{1F1E9}\u{1F1F4}', country: 'Dominican Republic', grow: 1.5 },
  ];
  const pickCountry = (country) => {
    pick({ country });
  };

  const pick = (x) => { setCountry(x.country); search(x.country); };
  const tripEsim = useMemo(() => (result ? chooseEsim(result.esim, tripKey) : null), [result, tripKey]);
  const carriers = roaming?.carriers || data.homeCarriers || [];
  const roamInfo = (country) => {
    const hit = Object.entries(roaming?.countries || {}).find(([c]) => normCountry(c) === normCountry(country));
    return hit ? hit[1][home] || null : null;
  };

  return (
    <View style={s.root}>
      <StatusBar style={t.statusBar} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 56 }} keyboardShouldPersistTaps="handled">
          <Image source={SUNRISE} style={s.sunrise} resizeMode="stretch" accessible={false} />
          <View style={s.header}>
            <Text style={s.title} accessibilityRole="header">Cell Finder</Text>
            <Text style={s.tagline}>Pick the right SIM before you land.</Text>
          </View>
          <View style={s.body}>
        <TextInput style={s.input} placeholder="Country" placeholderTextColor={t.placeholder} accessibilityLabel="Country" value={country} onChangeText={setCountry} onSubmitEditing={() => search()} />

        <Text style={s.fieldLabel}>Days in the country</Text>
        <TouchableOpacity style={s.select} onPress={() => setMenuOpen(!menuOpen)} accessibilityRole="button" accessibilityLabel={`Days in the country: ${tripLabel(tripKey)}`} accessibilityState={{ expanded: menuOpen }}>
          <Text style={s.selectText}>{tripLabel(tripKey)}</Text>
          <Text style={s.selectCaret}>{menuOpen ? '\u25B2' : '\u25BC'}</Text>
        </TouchableOpacity>
        {menuOpen ? (
          <View style={s.menu}>
            {TRIP_OPTIONS.map((o, i) => (
              <TouchableOpacity key={o.key} style={[s.menuItem, i < TRIP_OPTIONS.length - 1 && s.menuLine, o.key === tripKey && s.menuItemOn]} onPress={() => { setTripKey(o.key); setMenuOpen(false); }} accessibilityRole="button" accessibilityState={{ selected: o.key === tripKey }}>
                <Text style={[s.menuText, o.key === tripKey && s.menuTextOn]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {!result && (
          <View style={s.popWrap}>
            <Text style={s.fieldLabel}>Popular destinations</Text>
            <View style={s.popRow}>
              {POPULAR.map((p, i) => (
                <TouchableOpacity key={p.country} style={[s.popTile, { flexGrow: p.grow }, i < POPULAR.length - 1 && s.popGap]} onPress={() => pickCountry(p.country)} accessibilityRole="button" accessibilityLabel={p.country}>
                  <Text style={s.popFlag}>{p.flag}</Text>
                  <Text style={s.popName} numberOfLines={2}>{p.country}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
            <TouchableOpacity style={s.back} onPress={goBack} accessibilityRole="button" accessibilityLabel="Back to all destinations">
              <Text style={s.backText}>{'\u2039'} Back</Text>
            </TouchableOpacity>
            <Text style={s.dest} accessibilityRole="header">{result.dest.city ? `${result.dest.city}, ` : ''}{result.dest.country}</Text>
            {tripEsim ? <EsimCard s={s} t={t} e={tripEsim} tripKey={tripKey} /> : null}
            {result.esim && !tripEsim ? (
              <Text style={s.intro}>No travel eSIM in our data lasts {tripLabel(tripKey).toLowerCase()} here yet. Try a shorter stay or check the local SIM below.</Text>
            ) : null}
            {tripEsim ? (
              <Text style={[s.intro, { marginTop: 12 }]}>Best-coverage and best-value eSIM picks are coming soon. Until then, compare the network each plan uses.</Text>
            ) : null}
            {home ? <Roaming s={s} t={t} home={home} info={roamInfo(result.dest.country)} /> : null}
            {!result.noNetworks ? (
              <View>
                <Text style={s.sectionLabel}>Local SIM (buy on arrival)</Text>
                <Card s={s} label="Cheapest" tag="A" n={result.cheapest} />
                {result.coverageMissing ? (
                  <Text style={s.intro}>Coverage ratings for local networks here are coming soon, so only the cheapest is shown.</Text>
                ) : (
                  <View>
                    <Card s={s} label="Best coverage" tag="B" n={result.coverage} />
                    <Card s={s} label="Best overall value" tag="C" n={result.balanced} />
                  </View>
                )}
                <Text style={s.foot}>Network data: {data.updated}. Prices in USD for the entry tourist plan; verify with the carrier before buying.</Text>
              </View>
            ) : null}
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
          </View>
        </ScrollView>
      </SafeAreaView>
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
