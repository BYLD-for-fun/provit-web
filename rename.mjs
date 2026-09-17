/*
 * Renames the app across this site in one pass.
 *
 *   node rename.mjs Ante --dry-run    show what would change, touch nothing
 *   node rename.mjs Ante              do it
 *
 * The current name is read from package.json (`name` minus the "-web" suffix) rather than
 * hardcoded, so this is repeatable: run it again later and it renames from whatever the site
 * says now. Default is --dry-run off, but run the dry pass first; a rename after the first
 * deploy leaves the domain, the Open Graph cache and every shared link carrying the old name.
 *
 * It does NOT touch: the directory name, the git remote, the domain, config.js, or the app repo.
 * Those are separate deliberate steps -- see README.
 */
import { readFile, writeFile } from 'node:fs/promises';

const FILES = [
  'index.html',
  'styles.css',
  'script.js',
  'config.example.js',
  'google-apps-script.gs',
  'build-scripts/inject-env.js',
  'package.json',
  'README.md',
  'vercel.json',
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const next = args.find((value) => !value.startsWith('--'));

if (!next || !/^[A-Za-z][A-Za-z0-9]{1,28}$/.test(next)) {
  console.error('Usage: node rename.mjs <NewName> [--dry-run]');
  process.exit(1);
}

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const current = pkg.name.replace(/-web$/, '');
const OLD = current.charAt(0).toUpperCase() + current.slice(1);

if (OLD.toLowerCase() === next.toLowerCase()) {
  console.error(`Already named ${OLD}. Nothing to do.`);
  process.exit(1);
}

/** Each casing is replaced independently, longest-distinct first, so no pass eats another's input. */
const forms = [
  [OLD.toUpperCase(), next.toUpperCase()],
  [OLD.toLowerCase(), next.toLowerCase()],
  [OLD, next],
];

console.log(`${dryRun ? 'Dry run: ' : ''}${OLD} -> ${next}\n`);
let total = 0;

for (const file of FILES) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    console.log(`skip   ${file} (absent)`);
    continue;
  }
  let hits = 0;
  let updated = text;
  for (const [from, to] of forms) {
    const parts = updated.split(from);
    hits += parts.length - 1;
    updated = parts.join(to);
  }
  if (!hits) {
    console.log(`clean  ${file}`);
    continue;
  }
  total += hits;
  if (!dryRun) await writeFile(file, updated);
  console.log(`${dryRun ? 'would ' : 'update'} ${file} (${hits})`);
}

console.log(`\n${dryRun ? 'Would replace' : 'Replaced'} ${total} occurrences.`);
if (!dryRun) {
  console.log('Still to do by hand:');
  console.log('  - rename this directory and the git remote');
  console.log('  - the domain and its DNS');
  console.log('  - the app repo: bundle id, App Group, URL scheme, extension ids, copy');
}
