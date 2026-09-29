/**
 * Derives a full palette from a single main colour so the whole site can be
 * re-skinned by changing one hex value.
 *
 * The neutral tones reuse the main colour's hue at a low saturation, which is
 * what keeps paper, ink and slate looking related to the accent instead of
 * looking like plain grey next to a strongly coloured page.
 */

export type Palette = {
  /** The main colour, exactly as chosen. */
  accent: string;
  /** Hover / pressed state for the accent. */
  accentDark: string;
  /** Very pale wash of the accent, for selection states. */
  wash: string;
  /** Near-black text, tinted with the accent hue. */
  ink: string;
  /** Muted mid grey used for secondary text. */
  slate: string;
  /** Page background. */
  bg: string;
  /** Hairline borders. */
  line: string;
};

export const DEFAULT_MAIN_COLOR = "#0038a8";

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Accepts `#abc`, `abc`, `#aabbcc` and returns lowercase `#rrggbb`. */
export function normalizeHex(input: string): string | null {
  const match = HEX_RE.exec(input.trim());
  if (!match) return null;
  let hex = match[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hex}`;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return [0, 0, l * 100];

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (n: number) => clamp(Math.round(n * 255), 0, 255);
  return rgbToHex(to(f(0)), to(f(8)), to(f(4)));
}

/**
 * Build the palette. Falls back to the default blue when handed anything that
 * is not a hex colour, so a bad value can never blank out the page.
 */
export function derivePalette(mainColor: string | null | undefined): Palette {
  const base = normalizeHex(mainColor ?? "") ?? DEFAULT_MAIN_COLOR;
  const [h, s, l] = rgbToHsl(...hexToRgb(base));

  // Neutrals borrow the accent hue but at a fraction of its saturation.
  const neutralS = clamp(s * 0.17, 6, 34);

  return {
    accent: base,
    // Keep a decent amount of the accent's own lightness so the hover state
    // stays recognisably the same colour instead of collapsing to black.
    accentDark: hslToHex(h, s, clamp(l * 0.75, 18, 40)),
    wash: hslToHex(h, clamp(s * 0.5, 8, 60), 95),
    ink: hslToHex(h, neutralS, 6),
    slate: hslToHex(h, neutralS, 35),
    bg: hslToHex(h, neutralS, 98),
    line: hslToHex(h, neutralS, 88),
  };
}

/** CSS custom properties consumed by the Tailwind `brand-*` colour aliases. */
export function paletteToCssVars(palette: Palette): React.CSSProperties {
  return {
    "--brand-accent": palette.accent,
    "--brand-accent-dark": palette.accentDark,
    "--brand-wash": palette.wash,
    "--brand-ink": palette.ink,
    "--brand-slate": palette.slate,
    "--brand-bg": palette.bg,
    "--brand-line": palette.line,
  } as React.CSSProperties;
}
