/**
 * Mettle design tokens: forged metal, dark and premium.
 *
 * The palette is built around one idea: cold steel that has been through heat.
 * Ember is the only warm colour in the resting state, so it always reads as
 * "the thing to do next". Verdict colours borrow from real tempering colours
 * (straw, then blue) so the metaphor holds up under inspection.
 *
 * Pure data. No react-native imports, so this is safe to unit test.
 */

export const palette = {
  /** Deepest ground. The forge before it is lit. */
  void: '#0A0A0C',
  surface: '#141418',
  surfaceRaised: '#1C1C22',
  surfaceHigh: '#24242C',

  hairline: '#2A2A33',
  border: '#33333E',

  /** Primary text. Cooled steel, never pure white. */
  silver: '#E9E9EF',
  steel: '#9A9AA8',
  slag: '#63636F',

  /** Brand accent. Hot metal. Reserved for the single dominant action. */
  ember: '#F2542D',
  emberBright: '#FF6B44',
  emberDim: '#8C3220',
  emberWash: 'rgba(242, 84, 45, 0.12)',

  /** Verdicts, drawn from steel tempering colours. */
  tempered: '#7FB2E5',
  temperedWash: 'rgba(127, 178, 229, 0.12)',
  bending: '#E9B44C',
  bendingWash: 'rgba(233, 180, 76, 0.12)',
  brittle: '#C4433A',
  brittleWash: 'rgba(196, 67, 58, 0.12)',

  /** The four virtues. */
  wisdom: '#7FB2E5',
  courage: '#F2542D',
  temperance: '#56B89A',
  justice: '#B98CD9',

  black: '#000000',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Weighty typography. Display sizes are tight-tracked so headlines read as
 * struck rather than typed.
 */
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  /** Uppercase eyebrow labels. Always pair with letterSpacing. */
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2 },
} as const;

export type VerdictKey = 'tempered' | 'bending' | 'brittle';
export type VirtueKey = 'wisdom' | 'courage' | 'temperance' | 'justice';

export const verdictColor: Record<VerdictKey, { fg: string; wash: string }> = {
  tempered: { fg: palette.tempered, wash: palette.temperedWash },
  bending: { fg: palette.bending, wash: palette.bendingWash },
  brittle: { fg: palette.brittle, wash: palette.brittleWash },
};

export const virtueColor: Record<VirtueKey, string> = {
  wisdom: palette.wisdom,
  courage: palette.courage,
  temperance: palette.temperance,
  justice: palette.justice,
};

export const virtueLabel: Record<VirtueKey, string> = {
  wisdom: 'Wisdom',
  courage: 'Courage',
  temperance: 'Temperance',
  justice: 'Justice',
};
