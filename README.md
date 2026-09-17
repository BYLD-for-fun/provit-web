# Provit — marketing site and waitlist

Single static page. No framework, no build step beyond minification, no runtime dependencies.
Same shape as `facescan-signup`: hand-written HTML/CSS/JS, a Google Apps Script backing the
waitlist, GitHub Pages for hosting.

```
index.html              the page
styles.css              palette and type lifted from the app (src/ui/theme.tsx)
script.js               waitlist submission for both forms
config.example.js       copy to config.js and add your endpoint
google-apps-script.gs   paste into a Sheet-bound Apps Script project
build-scripts/          injects WAITLIST_URL at build time
.github/workflows/      builds and publishes to GitHub Pages
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
  gets abused, redeploy the Apps Script for a new URL and change one repository secret.
- **Treat the sheet as untrusted input.** Never paste a cell into a shell, a formula or an HTML
  page without escaping it.

There is no spam protection yet. If the form starts attracting bots, the usual next step is a
Cloudflare Turnstile or reCAPTCHA check — say the word and it is a small addition on both sides.

## Deploying

GitHub Pages is the live host. `.github/workflows/deploy.yml` builds on every push to `master`
and publishes `public/` through the Pages artifact, so nothing built is committed.

First-time setup:

1. Push the repo to GitHub.
2. Settings → Pages → **Source: GitHub Actions**.
3. Settings → Secrets and variables → Actions → **New repository secret**, named
   `WAITLIST_URL`, holding the Apps Script `/exec` URL. A repository *variable* of the same
   name works too. It must be repository-scoped: a secret attached to the `github-pages`
   environment is invisible to the build job, since only the deploy job runs there.
4. Push, or run the workflow from the Actions tab. The run summary links the live URL.

Do step 3 before the first run: without it the build exits non-zero on purpose rather than
shipping a form that drops every signup.

The site is served from `https://<user>.github.io/<repo>/` unless a custom domain or a
`<user>.github.io` repo name is used. Every asset path in `index.html` is relative, so the
subpath works as-is.

For a custom domain, add it in Settings → Pages and point DNS there. Pages then writes a `CNAME`
file into the branch it serves; with an Actions deploy the domain setting is enough and no file
needs committing.

`vercel.json` is left in place and still works if the project is ever imported there — that path
wants `WAITLIST_URL` as a Vercel environment variable instead of a repo secret. One difference
matters: Vercel sends real security headers, and **Pages cannot send any**. The CSP is restated
as a `<meta>` tag in `index.html` to cover most of it, but `X-Frame-Options` and
`frame-ancestors` have no meta equivalent and are unavailable on Pages.

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
