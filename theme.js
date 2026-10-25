import { StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';

// Airport signage look: navy, signal yellow, Barlow type.
export const YELLOW = '#FFC20E';
export const NAVY = '#0A2540';

export const F = {
  regular: 'Barlow_400Regular',
  body: 'Barlow_500Medium',
  label: 'Barlow_600SemiBold',
  headMid: 'BarlowSemiCondensed_600SemiBold',
  head: 'BarlowSemiCondensed_700Bold',
};

export const THEMES = {
  dark: {
    bg: '#071B33', header: '#071B33', card: '#0E2D52', cardLine: 'transparent',
    field: '#0E2D52', fieldLine: '#27527F', text: '#EAF2FC', strong: '#FFFFFF', muted: '#9FB6D0',
    accent: '#6CB4FF', rule: '#1F4A7D', outline: '#27527F', chipLine: '#27527F', chipText: '#EAF2FC',
    chipBg: 'transparent', error: '#FF8A80', statusBar: 'light',
  },
  light: {
    bg: '#EEF3F9', header: NAVY, card: '#FFFFFF', cardLine: '#D5E0EE',
    field: '#FFFFFF', fieldLine: '#C5D3E6', text: NAVY, strong: NAVY, muted: '#4B6180',
    accent: '#0B5CAD', rule: '#D5E0EE', outline: '#9DB4D3', chipLine: '#0B5CAD', chipText: '#0B5CAD',
    chipBg: '#FFFFFF', error: '#B42318', statusBar: 'light',
  },
};

export const makeStyles = (t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    headerWrap: { backgroundColor: t.header },
    header: {
      paddingHorizontal: 20, paddingBottom: 24,
      paddingTop: 12 + (Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 0),
    },
    title: { fontFamily: F.head, fontSize: 34, lineHeight: 38, color: '#FFFFFF' },
    tagline: { fontFamily: F.body, fontSize: 16, lineHeight: 22, color: YELLOW, marginTop: 4 },
    body: { padding: 20, paddingBottom: 56 },
    input: {
      height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: t.fieldLine, backgroundColor: t.field,
      color: t.text, fontFamily: F.body, fontSize: 17, paddingHorizontal: 16, marginBottom: 12,
    },
    fieldLabel: { fontFamily: F.label, fontSize: 15, lineHeight: 20, color: t.muted, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
    chip: {
      height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: t.chipLine,
      backgroundColor: t.chipBg, marginRight: 8, marginBottom: 8, justifyContent: 'center',
    },
    chipOn: { backgroundColor: YELLOW, borderColor: YELLOW },
    chipText: { fontFamily: F.label, fontSize: 15, color: t.chipText },
    chipTextOn: { color: NAVY },
    button: { height: 56, borderRadius: 12, backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    buttonText: { fontFamily: F.head, fontSize: 19, color: NAVY },
    error: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: t.error, marginTop: 12 },
    dest: { fontFamily: F.head, fontSize: 25, lineHeight: 28, color: t.strong, marginTop: 28, marginBottom: 12 },
    intro: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: t.muted, marginBottom: 12 },
    card: {
      flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: t.card,
      borderWidth: 1, borderColor: t.cardLine, marginBottom: 12,
    },
    outlineCard: {
      flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 14, borderWidth: 1.5,
      borderColor: t.outline, marginBottom: 12,
    },
    badge: {
      width: 52, height: 52, borderRadius: 8, backgroundColor: YELLOW, alignItems: 'center',
      justifyContent: 'center', marginRight: 14,
    },
    badgeText: { fontFamily: F.head, fontSize: 32, color: NAVY, includeFontPadding: false },
    iconBox: {
      width: 52, height: 52, borderRadius: 8, borderWidth: 1.5, borderColor: t.accent, alignItems: 'center',
      justifyContent: 'center', marginRight: 14,
    },
    cardBody: { flex: 1 },
    label: { fontFamily: F.label, fontSize: 15, lineHeight: 20, color: t.muted },
    net: { fontFamily: F.head, fontSize: 26, lineHeight: 30, color: t.strong },
    plan: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: t.muted },
    priceCol: { alignItems: 'flex-end', marginLeft: 8 },
    price: { fontFamily: F.head, fontSize: 30, lineHeight: 32, color: t.strong },
    cov: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: t.accent },
    eRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    note: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: t.muted, marginTop: 8 },
    foot: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: t.muted, marginTop: 4 },
    sectionLabel: { fontFamily: F.label, fontSize: 15, lineHeight: 20, color: t.muted, marginTop: 28, paddingBottom: 6 },
    row: { minHeight: 60, justifyContent: 'center', borderTopWidth: 1, borderTopColor: t.rule, paddingVertical: 8 },
    rowMain: { fontFamily: F.headMid, fontSize: 21, lineHeight: 24, color: t.strong },
    rowLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    rowPrice: { fontFamily: F.head, fontSize: 22, lineHeight: 26, color: t.strong, marginLeft: 12 },
    rowSub: { fontFamily: F.body, fontSize: 15, lineHeight: 20, color: t.muted },
  });
