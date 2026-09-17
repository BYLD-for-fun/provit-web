/*
 * Writes public/config.js from the environment at build time.
 *
 * config.js is gitignored, so it does not exist on a CI builder. Set WAITLIST_URL in the Vercel
 * project's environment variables; locally, config.js is read instead so `npm run dev` works
 * without setting anything.
 *
 * The endpoint is not a secret in the cryptographic sense -- it ships to every visitor either
 * way -- but keeping it out of git means it can be rotated by changing one env var instead of
 * rewriting history.
 */
const fs = require('node:fs');
const path = require('node:path');

const out = path.join(__dirname, '..', 'public', 'config.js');
const local = path.join(__dirname, '..', 'config.js');

let url = process.env.WAITLIST_URL || '';

if (!url && fs.existsSync(local)) {
  const match = /WAITLIST_URL:\s*['"]([^'"]*)['"]/.exec(fs.readFileSync(local, 'utf8'));
  url = match ? match[1] : '';
}

if (!url) {
  // A build that silently ships an unconfigured form loses every signup it receives.
  console.error(
    'inject-env: WAITLIST_URL is not set and config.js has no value.\n' +
      'Set WAITLIST_URL in the build environment, or copy config.example.js to config.js.',
  );
  process.exit(1);
}

if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) {
  console.error(`inject-env: WAITLIST_URL does not look like an Apps Script endpoint: ${url}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
  out,
  `window.SHAMAC_CONFIG = { WAITLIST_URL: ${JSON.stringify(url)} };\n`,
  'utf8',
);
console.log('inject-env: wrote public/config.js');
