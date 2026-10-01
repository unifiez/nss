// Verifies theme derivation math and session token round-tripping.
//   npx tsx lib/verify.ts     (or run through node --experimental-strip-types)

import { derivePalette, normalizeHex } from "./theme.ts";
import {
  createSessionToken,
  peekSession,
  verifySessionToken,
  verifyCredentials,
} from "./session-token.ts";
import { toHref, profileLinks } from "./types.ts";
import {
  sanitizeUsername,
  suggestUsername,
  usernameProblem,
  USERNAME_MAX,
} from "./username.ts";

let failures = 0;
function check(label: string, condition: boolean, extra?: unknown) {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || extra === undefined ? "" : ` -> ${JSON.stringify(extra)}`}`);
}

console.log("--- hex normalisation ---");
check("long form", normalizeHex("#0038A8") === "#0038a8");
check("short form expands", normalizeHex("#abc") === "#aabbcc");
check("bare hex", normalizeHex("0038A8") === "#0038a8");
check("rejects junk", normalizeHex("nope") === null);
check("rejects empty", normalizeHex("") === null);

console.log("\n--- palette derivation ---");
const blue = derivePalette("#0038a8");
console.log(blue);
check("accent kept as chosen", blue.accent === "#0038a8");
check("ink is near-black", /^#[0-4][0-9a-f]{5}$/.test(blue.ink), blue.ink);
check("bg is near-white", /^#[ef][0-9a-f]{5}$/.test(blue.bg), blue.bg);
check("slate is mid tone", /^#[0-9a-f]{6}$/.test(blue.slate));
check("line is lighter than slate", blue.line > blue.slate);

const red = derivePalette("#dc2626");
const green = derivePalette("#16a34a");
const purple = derivePalette("#7c3aed");
console.log("\nred:  ", red);
console.log("green:", green);
console.log("purp: ", purple);
check("different accents stay distinct", red.accent !== green.accent && green.accent !== purple.accent);
check("red bg differs from green bg", red.bg !== green.bg);
check("red ink differs from green ink", red.ink !== green.ink);
check("invalid falls back to default", derivePalette("nonsense").accent === "#0038a8");
check("null falls back to default", derivePalette(null).accent === "#0038a8");

// Neutrals should inherit the accent hue, so a red theme reads warm, not grey.
function hue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return -1;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
check(
  "red ink keeps the red hue (warm, not grey)",
  hueGap(hue(red.ink), hue(red.accent)) < 12,
  { inkHue: hue(red.ink), accentHue: hue(red.accent) },
);
check(
  "green bg keeps the green hue",
  hueGap(hue(green.bg), hue(green.accent)) < 12,
  { bgHue: hue(green.bg), accentHue: hue(green.accent) },
);
function lightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}
for (const [name, p] of Object.entries({ blue, red, green, purple })) {
  check(
    `${name}: accentDark is darker than accent`,
    lightness(p.accentDark) < lightness(p.accent) && lightness(p.accentDark) > 0.08,
    { accentDark: p.accentDark, accent: p.accent },
  );
  check(`${name}: accentDark keeps the accent hue`, hueGap(hue(p.accentDark), hue(p.accent)) < 6);
  // `wash` is the hover background: it must read as a visible tint against the
  // page background, i.e. slightly darker than bg but still pale.
  check(
    `${name}: wash is a visible tint between bg and line`,
    lightness(p.bg) > lightness(p.wash) && lightness(p.wash) > lightness(p.line),
    { bg: p.bg, wash: p.wash, line: p.line },
  );
  check(`${name}: bg is lighter than ink`, lightness(p.bg) > lightness(p.ink));
}

console.log("\n--- link normalisation ---");
check("bare email gets mailto", toHref("email", "a@b.com") === "mailto:a@b.com");
check("existing mailto untouched", toHref("email", "mailto:a@b.com") === "mailto:a@b.com");
check("phone strips spaces", toHref("phone", "+91 90000 00000") === "tel:+919000000000");
check("bare handle gets https", toHref("instagram", "insta.com/x") === "https://insta.com/x");
check("full url untouched", toHref("linkedin", "https://li.com/x") === "https://li.com/x");
check("empty yields empty", toHref("email", "  ") === "");

const links = profileLinks({
  email: "a@b.com",
  phone: "",
  instagram: "insta.com/x",
  linkedin: "",
});
check("dock drops empty fields", links.length === 2, links.map((l) => l.icon));
check("instagram marked external", links.find((l) => l.icon === "instagram")?.external === true);
check("email not external", links.find((l) => l.icon === "email")?.external === false);

console.log("\n--- session tokens ---");
process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "hunter2";

const token = createSessionToken("admin");
check("verifies a good token", verifySessionToken(token)?.username === "admin");
check("peek sees a good token", peekSession(token)?.username === "admin");
check("rejects garbage", verifySessionToken("garbage") === null);
check("rejects undefined", verifySessionToken(undefined) === null);

const [body, sig] = token.split(".");
const tampered = `${body}.${sig.slice(0, -2)}xx`;
check("rejects tampered signature", verifySessionToken(tampered) === null);
const swapped = `${encodeURIComponent("root")}.${token.split(".")[1]}.${sig}`;
check("rejects swapped username", verifySessionToken(swapped) === null);

process.env.SESSION_SECRET = "short";
check("rejects when secret too short", verifySessionToken(token) === null);
process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef";

check("correct credentials pass", verifyCredentials("admin", "hunter2"));
check("wrong password fails", !verifyCredentials("admin", "nope"));
check("wrong username fails", !verifyCredentials("root", "hunter2"));

process.env.ADMIN_PASSWORD = "";
check("fails closed when unconfigured", !verifyCredentials("admin", ""));

console.log("\n--- username slugs ---");
check("lowercases and dashes", sanitizeUsername("Yashwant Singh") === "yashwant-singh");
check("strips accents", sanitizeUsername("José Álvarez") === "jose-alvarez");
check("collapses punctuation runs", sanitizeUsername("A__B   C!!") === "a-b-c");
check("trims leading and trailing dashes", sanitizeUsername("--bob--") === "bob");
check("underscores become dashes, digits survive", sanitizeUsername("a_b2") === "a-b2");
check("empty input stays empty", sanitizeUsername("!!!") === "");
check(
  "caps length without a trailing dash",
  !sanitizeUsername("x".repeat(USERNAME_MAX + 10)).endsWith("-"),
  sanitizeUsername("x".repeat(USERNAME_MAX + 10)).length,
);
check("sanitising twice is stable", (() => {
  const once = sanitizeUsername("Yashwant  Singh!!");
  return sanitizeUsername(once) === once;
})());

check("accepts a good slug", usernameProblem("yashwant-singh") === null);
check("rejects a short slug", usernameProblem("ab") !== null);
check("rejects a leading digit", usernameProblem("2cool") !== null);
check("rejects an empty slug", usernameProblem("") !== null);
check("rejects reserved admin", usernameProblem("admin") !== null);
check("rejects reserved api", usernameProblem("api") !== null);
check("rejects underscores the sanitiser would strip", usernameProblem("a_b") !== null);
check("allows a longer name than the route", usernameProblem("login-button") === null);

check("suggests from a full name", suggestUsername("Yashwant Singh") === "yashwant-singh");
check("suggestion matches typing the full name", (() => {
  const name = "Yashwant Kumar Singh";
  return suggestUsername(name) === sanitizeUsername(name);
})());
check("short name borrows a second word", suggestUsername("Li Wei") === "li-wei");
check("strips accents in a suggestion", suggestUsername("José Álvarez") === "jose-alvarez");
check("avoids suggesting a reserved word", suggestUsername("Admin") === "admin-nss");
check("returns empty for a nonsense name", suggestUsername("***") === "");
check("drops trailing words rather than cutting mid-word", (() => {
  const name = "alexander benjamin christopher darcy";
  const suggested = suggestUsername(name).split("-");
  // Every piece must be an intact leading word of the name, never a fragment.
  return suggested.every((word, i) => word === name.split(" ")[i]);
})(), suggestUsername("alexander benjamin christopher darcy"));

check("a one-letter name is flagged rather than accepted", usernameProblem(suggestUsername("Li")) !== null);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
