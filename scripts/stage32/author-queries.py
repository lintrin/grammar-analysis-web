"""Human-selected queries, mechanical IDs/forms from the reviewed immutable release; no query/analyzer imports."""
import json,hashlib
from pathlib import Path
s=json.load(open('lib/grammar/generated/lexicon.json'));ex=json.load(open('data/grammar/query-examples.json'))['examples'];old=json.load(open('tests/fixtures/stage31-queries.json'))['fixtures'];qs=[]
for i,q in enumerate(['given','chosen','drew','swum','taught','told','bought','left','met','sent','held','broken','built','forgotten','lent','lost','risen','sold','stood','understood']):
 rows=[e for e in s['entries'] if e['partOfSpeech']=='verb' and any(f['surface']==q for f in e['forms'])];assert len(rows)==1,q
 e=rows[0];assert not any(f['query'].lower().strip()==q and f['pos']=='verb' for f in old)
 qs.append({'id':f'query-{i+1:02}','query':q,'pos':'verb','ids':[e['id']],'formKinds':[f['kind'] for f in e['forms'] if f['surface']==q],'patterns':[f['pattern'] for f in e['frames']],'example':next(x['text'] for x in ex if x['entryId']==e['id']),'workflow':['keyboard-search','filter','inspect-forms-and-frame','show-source','insert-reviewed-example','clear-old-result','focus-editor','explicit-analyze']})
p={'status':'human-fixed-before-first-query','authorship':'20 new inflected-surface plus verb-filter workflows, expected identity/forms/frames from the audited release. Reviewed teaching insertions exercise UI only and are not independent grammar inputs.','fixtures':qs}
Path('tests/fixtures/stage32-queries.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
for name in ['acceptance','queries']:
 b=Path(f'tests/fixtures/stage32-{name}.json').read_bytes();h=hashlib.sha256(b).hexdigest();Path(f'tests/fixtures/stage32-{name}.sha256').write_text(h+'\n');print(name,h)
