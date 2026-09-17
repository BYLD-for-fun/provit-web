# Provit — marketing site and waitlist

Single static page. No framework, no build step beyond minification, no runtime dependencies.
Same shape as `facescan-signup`: hand-written HTML/CSS/JS, a Google Apps Script backing the
waitlist, Vercel for hosting.

```
index.html              the page
styles.css              palette and type lifted from the app (src/ui/theme.tsx)
script.js               waitlist submission for both forms
config.example.js       copy to config.js and add your endpoint
google-apps-script.gs   paste into a Sheet-bound Apps Script project
build-scripts/          injects WAITLIST_URL at build time
rename.mjs              one-pass rename when the app's name is settled
```

## Running it locally

```sh
npm install
cp config.example.js config.js     # then paste your Apps Script URL into it
npm run dev                        # serves the working directory at :3000
```

`npm run build` produces `public/`, which is what Vercel deploys. `npm run serve` previews that
built output.

## The waitlist

1. Create a Google Sheet.
2. Extensions → Apps Script. Replace the contents with `google-apps-script.gs`.
3. Deploy → New deployment → **Web app**, with **Execute as: Me** and **Who has access: Anyone**.
4. Copy the `/exec` URL into `config.js` locally, and into Vercel as the `WAITLIST_URL`
   environment variable.

Signups land in a `Waitlist` sheet with the received time, email, source hostname and the
client's own timestamp. Duplicate emails are accepted silently rather than shown as an error —
being on the list twice is not a problem worth surfacing to someone.

**"Who has access: Anyone" makes the endpoint world-writable.** That is unavoidable: the browser
posts without credentials. Two consequences worth knowing:

- Anyone who reads the page source can find the URL and post to it. There is no hardcoded
  fallback in `script.js` for exactly this reason, but the built `config.js` still ships it. If it
  gets abused, redeploy the Apps Script for a new URL and change one Vercel env var.
- **Treat the sheet as untrusted input.** Never paste a cell into a shell, a formula or an HTML
  page without escaping it.

There is no spam protection yet. If the form starts attracting bots, the usual next step is a
Cloudflare Turnstile or reCAPTCHA check — say the word and it is a small addition on both sides.

## Deploying

Vercel project → import this repo → it picks up `vercel.json` (build command, output directory,
security headers). Add `WAITLIST_URL` to the environment variables before the first deploy, or
the build fails deliberately rather than shipping a form that silently drops signups.

For a custom domain, add it in the Vercel dashboard and point DNS there. `facescan-signup` uses a
`CNAME` file; that is a GitHub Pages convention and is not needed on Vercel.

## The name

The site says **Provit** throughout because that is the app's name today. Once the new name is
decided:

```sh
node rename.mjs Provit
```

It rewrites every occurrence across the source files and prints what it changed. Do this **before
the first deploy** — afterwards the domain, the Open Graph cache and every shared link carry the
old name.

It does not touch the directory name, the git remote, the domain, or the app repo. The app-side
rename is larger: bundle identifier, App Group, URL scheme, the two extension identifiers, and
user-facing copy.

## What the page claims

Everything described is built in the app today: the locked photo stake, the app lockout stake,
username friend requests, server-timed deadlines, corrections and withdrawals, and account
deletion.

Deliberately not mentioned, because it is not shipped:

- the payment / Venmo stake, which lives on another branch
- sharing a revealed photo to an Instagram story, which is built but unverified on a device

The footer says "Not released yet" for the same reason. Keep this section honest as features land
— a waitlist page that oversells is the fastest way to lose the people who join from it.
