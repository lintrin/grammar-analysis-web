import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { openDatabase, migrate, importData, query, revise, validateDatabase, readEntry } from './lexicon/store.mjs';

import { review, publish, exportRelease, atomicWrite, rebuild, trustedRelease, validateWorkingReleases } from './lexicon/release.mjs';
import { verify, generateClient } from './lexicon/client.mjs';

const help = `Usage: npm run lexicon -- <command> [--db .lexicon/working.sqlite] [options]
  init / migrate                Apply versioned SQLite migrations
  import --file <JSON>          Import sources and entries as drafts (idempotent)
  query [--lemma|--surface|--pos <word>]  Show complete revisions and hashes
  revise --from <revisionId> --file <entry.json>  Create next draft from complete entry
  validate                      Check all revision content, hashes and references
  show --revision <revisionId>  Show one complete revision for later review
  review --revision <id> --hash <previewHash> --reviewer <name> --decision approve|reject
  publish --file <manifest.json> --out <release.json>
  export-release --version <version> --out <release.json>
  rebuild                       Restore the manifest-locked repository release into empty DB
  generate-client / verify      Generate or verify bundled client and analysis manifest
`;
try {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: Object.fromEntries(['db','file','lemma','surface','pos','from','revision','hash','reviewer','decision','out','version'].map(k => [k, { type: 'string' }]).concat([['help', { type: 'boolean' }]])) });
  const [command] = positionals;
  if (values.help || !command) { console.log(help); }
  else {
    if (positionals.length !== 1 || !['init','migrate','import','query','revise','validate','show','review','publish','export-release','rebuild','generate-client','verify'].includes(command)) throw new Error('Unknown command; use --help');
    const required = key => { if (!values[key]) throw new Error(`--${key} required`); return values[key]; };
    const allowed = { init: [], migrate: [], import: ['file'], query: ['lemma','surface','pos'], revise: ['from','file'], validate: [], show: ['revision'], review: ['revision','hash','reviewer','decision'], publish: ['file','out'], 'export-release': ['version','out'], rebuild: [], 'generate-client': [], verify: [] }[command];
    for (const key of Object.keys(values)) if (!['db','help',...allowed].includes(key)) throw new Error(`--${key} is not valid for ${command}`);
    if (command === 'verify' || command === 'generate-client') { console.log(JSON.stringify(command === 'verify' ? verify() : generateClient())); }
    else {
      const db = openDatabase(values.db ?? '.lexicon/working.sqlite', ['init','migrate'].includes(command));
      try {
        const result = command === 'init' || command === 'migrate' ? migrate(db)
          : command === 'import' ? importData(db, JSON.parse(readFileSync(required('file'), 'utf8')))
          : command === 'query' ? query(db, { lemma: values.lemma, surface: values.surface, partOfSpeech: values.pos })
          : command === 'revise' ? revise(db, required('from'), JSON.parse(readFileSync(required('file'), 'utf8')))
          : command === 'show' ? readEntry(db, required('revision')) : command === 'review' ? review(db,required('revision'),required('hash'),required('reviewer'),required('decision'))
          : command === 'publish' ? (() => { const out = required('out'); const r = publish(db,JSON.parse(readFileSync(required('file'),'utf8'))); atomicWrite(out,r); return r; })()
          : command === 'export-release' ? (() => { const r = exportRelease(db,required('version')); atomicWrite(required('out'),r); return r; })()
          : command === 'rebuild' ? (() => { const { release, manifest } = trustedRelease(); return rebuild(db,release,manifest.lexiconHash); })()
          : { ...validateDatabase(db), ...validateWorkingReleases(db) };
        console.log(JSON.stringify(result, null, 2));
      } finally { db.close(); }
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
