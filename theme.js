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

// One look for both phone settings: magenta background, white text, sunrise glow at the top.
export const MAGENTA = '#C2007A'; // white text on it passes the 4.5:1 contrast check (5.9:1)
const MAGENTA_LOOK = {
  bg: MAGENTA, header: 'transparent', card: 'rgba(52,0,36,0.40)', cardLine: 'rgba(255,255,255,0.28)',
  field: 'rgba(52,0,36,0.42)', fieldLine: 'rgba(255,255,255,0.50)', text: '#FFFFFF', strong: '#FFFFFF',
  muted: 'rgba(255,255,255,0.90)', accent: '#FFE08A', rule: 'rgba(255,255,255,0.30)',
  outline: 'rgba(255,255,255,0.55)', chipLine: 'rgba(255,255,255,0.75)', chipText: '#FFFFFF',
  chipBg: 'transparent', error: '#FFF3B0', statusBar: 'light', placeholder: 'rgba(255,255,255,0.78)',
};
export const THEMES = { dark: MAGENTA_LOOK, light: MAGENTA_LOOK };

export const makeStyles = (t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    headerWrap: { backgroundColor: t.header },
    header: {
      alignItems: 'center',
      paddingHorizontal: 20, paddingBottom: 112,
      paddingTop: 12 + (Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 0),
    },
    title: { textAlign: 'center', fontFamily: F.head, fontSize: 34, lineHeight: 38, color: '#FFFFFF' },
    tagline: { textAlign: 'center', fontFamily: F.body, fontSize: 16, lineHeight: 22, color: '#FFFFFF', marginTop: 4 },
    body: { padding: 20, paddingBottom: 56 },
    input: {
      height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: t.fieldLine, backgroundColor: t.field,
      color: t.text, fontFamily: F.body, fontSize: 17, paddingHorizontal: 16, marginBottom: 12,
    },
    select: {
      height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: t.fieldLine, backgroundColor: t.field,
      paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    selectText: { fontFamily: F.body, fontSize: 17, color: t.text },
    selectCaret: { fontSize: 13, color: t.text },
    menu: { borderRadius: 12, borderWidth: 1.5, borderColor: t.fieldLine, backgroundColor: 'rgba(52,0,36,0.92)', marginTop: -6, marginBottom: 12, overflow: 'hidden' },
    menuItem: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' },
    menuLine: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.25)' },
    menuItemOn: { backgroundColor: YELLOW },
    menuText: { fontFamily: F.body, fontSize: 17, color: t.text },
    menuTextOn: { color: NAVY },
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
    popWrap: { marginTop: 4, marginBottom: 12 },
    popRow: { flexDirection: 'row' },
    popTile: {
      flexBasis: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 8, borderRadius: 10,
      borderWidth: 1.5, borderColor: t.outline, backgroundColor: t.card,
    },
    popGap: { marginRight: 8 },
    popFlag: { fontSize: 20, marginRight: 6 },
    popName: { flex: 1, fontFamily: F.label, fontSize: 14, lineHeight: 16, color: t.strong },
    sunrise: { position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: 1170 / 960 },
    linkBtn: {
      alignSelf: 'flex-start', minHeight: 44, borderRadius: 22, backgroundColor: YELLOW, justifyContent: 'center',
      paddingHorizontal: 18, marginTop: 12,
    },
    linkBtnText: { fontFamily: F.head, fontSize: 17, color: NAVY },
    linkNote: { fontFamily: F.regular, fontSize: 12, lineHeight: 16, color: t.muted, marginTop: 6 },
    rowLink: { fontFamily: F.label, fontSize: 14, lineHeight: 18, color: t.accent, marginTop: 2 },
    back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 16, paddingRight: 16 },
    backText: { fontFamily: F.label, fontSize: 17, color: t.accent },
    dest: { fontFamily: F.head, fontSize: 25, lineHeight: 28, color: t.strong, marginTop: 4, marginBottom: 12 },
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
