"""New query workflows authored before behavior execution. Audited identities and teaching texts only."""
import json,hashlib
from pathlib import Path
baseline=json.loads(Path('tests/baselines/stage33-development.json').read_text())
rows=[]
for word,entry,frames,uses,example,pattern,heads,verbs in [
 ('am','function-word:auxiliary:am',['location','primary'],['finite-be'],'I am kind.','SVC',None,None),
 ('was','function-word:auxiliary:was',['location','primary'],['finite-be'],'The book was near the bus.','SVC',None,None),
 ('where','function:question:where',[],['wh-adverbial','wh-complement'],'Where is the book?','SVC',None,None),
 ('in','function:location:in',[],['location-preposition'],'The book is in the car.','SVC',['bus','car'],['dance','run','sleep','wait','walk','work']),
 ('on','function:location:on',[],['location-preposition'],'She sleeps on the chair.','SV',['chair','table'],['dance','run','sleep','wait','walk','work']),
 ('under','function:location:under',[],['location-preposition'],'She sleeps under the table.','SV',['chair','table'],['sleep','wait']),
 ('near','function:location:near',[],['location-preposition'],'The book is near the bus.','SVC',['bus','car','chair','table'],['dance','run','sleep','wait','walk','work']),
 ('satellite',None,[],[],None,None,None,None),
]:
 rows.append(dict(id=f'33e-query-{len(rows)+1:02}',query=word,filters=['noun','function-word'] if entry else ['function-word','all'],expectedIds=[entry] if entry else [],frameIds=frames,uses=uses,heads=heads,legacyVerbs=verbs,example=example,exampleExpectedStatus='complete' if entry else None,examplePattern=pattern,actions=['mismatched-filter-empty','switch-filter','inspect-scoped-uses','inspect-version-and-source']+(['insert-reviewed-example','editor-focus','old-result-cleared','explicit-analyze'] if entry else ['unlisted-not-spelling-error','no-online-lookup'])))
payload=dict(stage=33,phase='33E',status='human-fixed-before-first-query',baselineHash=baseline['contentHash'],independence='Eight new workflows use an empty mismatched POS filter followed by a target filter transition and scope/source/example inspection. Workflow signature is normalized word + ordered filters + ordered actions; words may recur because required capability families are fixed. Reviewed UI insertions are historical teaching regressions, never independent grammar samples.',fixtures=rows)
p=Path('tests/fixtures/stage33-queries.json');raw=(json.dumps(payload,ensure_ascii=False,indent=2)+'\n').encode()
if p.exists():assert p.read_bytes()==raw,'Do not rewrite query expectations after execution'
else:p.write_bytes(raw)
p.with_suffix('.sha256').write_text(hashlib.sha256(raw).hexdigest()+'\n')
print(json.dumps(dict(queries=len(rows),sha256=hashlib.sha256(raw).hexdigest())))
