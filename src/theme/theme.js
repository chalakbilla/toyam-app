// Toyam design tokens.
//
// Palette is lifted straight from the reference photograph: a dusk field of
// lavender, a warm haze of backlight, dark treeline shadow, and soft cream
// mist. Nothing here is a generic "dark mode" palette — every value maps to
// something in that image.

export const colors = {
  // treeline / deepest shadow — used for the base background
  treeline: '#1B1420',
  treelineDeep: '#120D16',

  // the warm gap of light the couple is walking into
  hazeGold: '#E7C79C',
  hazeGoldSoft: '#F3DFC1',

  // the lavender field itself
  lavender: '#B9A4CE',
  lavenderMuted: '#8E7AA6',
  lavenderDeep: '#5B4A72',

  // cream mist or fog
  mist: '#F1E8DD',

  // ink for text on light surfaces
  ink: '#241A2C',

  // functional
  success: '#8FBF9F',
  danger: '#E1927E',
  warning: '#E7C79C',

  overlay: 'rgba(18, 13, 22, 0.55)',
  cardGlass: 'rgba(241, 232, 221, 0.08)',
  cardGlassBorder: 'rgba(241, 232, 221, 0.16)',
  white: '#FFFFFF',
};

// Background gradient stops, top to bottom — treeline into haze into field.
export const backgroundGradient = [
  colors.treelineDeep,
  colors.treeline,
  colors.lavenderDeep,
];

export const heroGradient = [colors.treeline, colors.lavenderDeep, colors.hazeGold];

export const fonts = {
  display: 'CormorantGaramond_600SemiBold',
  displayItalic: 'CormorantGaramond_600SemiBold_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
};

export const type = {
  wordmark: { fontFamily: fonts.display, fontSize: 46, color: colors.mist, letterSpacing: 1 },
  h1: { fontFamily: fonts.display, fontSize: 32, color: colors.mist },
  h2: { fontFamily: fonts.display, fontSize: 24, color: colors.mist },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.lavender, letterSpacing: 0.3 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.mist, lineHeight: 21 },
  bodyMuted: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(241, 232, 221, 0.6)', lineHeight: 20 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
