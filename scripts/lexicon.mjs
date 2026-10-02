import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { openDatabase, migrate, importData, query, revise, validateDatabase, readEntry } from './lexicon/store.mjs';

const help = `Usage: npm run lexicon -- <command> [--db .lexicon/working.sqlite] [options]
  init / migrate                Apply versioned SQLite migrations
  import --file <JSON>          Import sources and entries as drafts (idempotent)
  query [--lemma|--surface|--pos <word>]  Show complete revisions and hashes
  revise --from <revisionId> --file <entry.json>  Create next draft from complete entry
  validate                      Check all revision content, hashes and references
  show --revision <revisionId>  Show one complete revision for later review
Stage 20B adds review/publish/export/rebuild; stage 20C adds client generation.
`;
try {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: Object.fromEntries(['db','file','lemma','surface','pos','from','revision'].map(k => [k, { type: 'string' }]).concat([['help', { type: 'boolean' }]])) });
  const [command] = positionals;
  if (values.help || !command) { console.log(help); }
  else {
    if (positionals.length !== 1 || !['init','migrate','import','query','revise','validate','show'].includes(command)) throw new Error('Unknown command; use --help');
    const required = key => { if (!values[key]) throw new Error(`--${key} required`); return values[key]; };
    const allowed = { init: [], migrate: [], import: ['file'], query: ['lemma','surface','pos'], revise: ['from','file'], validate: [], show: ['revision'] }[command];
    for (const key of Object.keys(values)) if (!['db','help',...allowed].includes(key)) throw new Error(`--${key} is not valid for ${command}`);
    const db = openDatabase(values.db ?? '.lexicon/working.sqlite', ['init','migrate'].includes(command));
    try {
      const result = command === 'init' || command === 'migrate' ? migrate(db)
        : command === 'import' ? importData(db, JSON.parse(readFileSync(required('file'), 'utf8')))
        : command === 'query' ? query(db, { lemma: values.lemma, surface: values.surface, partOfSpeech: values.pos })
        : command === 'revise' ? revise(db, required('from'), JSON.parse(readFileSync(required('file'), 'utf8')))
        : command === 'show' ? readEntry(db, required('revision')) : validateDatabase(db);
      console.log(JSON.stringify(result, null, 2));
    } finally { db.close(); }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
