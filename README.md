# NSS Profiles

Next.js 16 app that turns the original static card design into a
database-backed profile system: one public card per person, an admin panel to
manage them, and a QR code per profile.

## Routes

| Route | Purpose |
|---|---|
| `/` | Grid of every profile. Each tile shows its QR code. |
| `/u/[id]` | Public single-profile card. This is what a QR scan opens. |
| `/admin/login` | Credential login. |
| `/admin` | Dashboard: create, edit, delete profiles, set theme colours. |
| `/api/photo/[id]` | Serves the PNG stored on a profile document. |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the blanks
npm run dev
```

### Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string. Pages show a setup notice while blank. |
| `MONGODB_DB` | Database name (default `nss_profiles`). |
| `ADMIN_USERNAME` | Admin login. |
| `ADMIN_PASSWORD` | Admin password. |
| `SESSION_SECRET` | Signs the session cookie. Minimum 16 characters. |
| `NEXT_PUBLIC_SITE_URL` | Origin encoded into QR codes. Set this in production. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Admin login is **disabled** until `ADMIN_USERNAME`, `ADMIN_PASSWORD` and
`SESSION_SECRET` are all set — it fails closed rather than falling open.

## Photos

Photos are stored as base64 PNG inside the profile document, so there is no
separate storage service to configure. That is comfortable up to a few hundred
images; at that scale move to Vercel Blob or S3 and swap `app/api/photo/[id]`
for a redirect.

Upload flow: the person removes their own background, then uploads the
transparent PNG. The browser downscales to 900px on the long edge before
sending, which keeps documents small.

## Theming

Each profile stores one `mainColor`. Everything else is derived from it in
`lib/theme.ts`:

| Token | Derivation |
|---|---|
| `accent` | the chosen colour, unchanged |
| `accentDark` | same hue and saturation, darker |
| `wash` | pale tint, used for hover states |
| `ink` | accent hue at ~17% saturation, near-black |
| `slate` | accent hue at ~17% saturation, mid grey |
| `bg` | accent hue at ~17% saturation, near-white |
| `line` | accent hue at ~17% saturation, hairline |

Neutrals borrow the accent's hue, which is why a red profile's background reads
warm rather than plain grey.

The admin panel sets a site-wide default for new profiles, and any individual
profile can override it. Palettes are applied by scoping CSS custom properties
(`components/theme-scope.tsx`), so differently themed profiles coexist on one
page.

## Verifying

```bash
npm run verify      # theme maths, link normalisation, session tokens
npm run verify:db   # data layer against a real MongoDB
npm run lint
npm run build
```

`verify:db` needs `MONGODB_URI` pointed at a throwaway database; it drops the
test database on the way out.
