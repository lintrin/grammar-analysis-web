"""33E independent human slots. Source-only arithmetic and exclusion checks; no analyzer imports."""
import json,re,hashlib
from pathlib import Path
baseline=json.loads(Path('tests/baselines/stage33-development.json').read_text())
old={r['input'] for r in baseline['inputs']};fixtures=[]
normalize=lambda s:re.sub(r'\s+',' ',s.lower()).strip()
if Path('tests/baselines/stage33-browser-inputs.json').exists():
 old.update(normalize(r['input']) for r in json.loads(Path('tests/baselines/stage33-browser-inputs.json').read_text())['inputs'])
fields=['purpose','pattern','complexity','tense','modal','questionType','aspect','voice']
def span(text,part,start=0):
 a=text.index(part,start);return dict(start=a,end=a+len(part))
def failure(code='unsupported-structure',status='unsupported',ranges=None,clause=None):
 reason=dict(code=code,ranges=ranges or [])
 if clause:reason['clauseIndex']=clause
 return dict(status=status,**{f:None for f in fields},nodes=[],reasons=[reason],corrections=[])
def answer(text,cat,subject,verb,comp,tense='present',sa=(),ca=()):
 q={'yes-no':'yes-no','where':'wh-complement'}.get(cat)
 e=dict(status='complete',purpose='interrogative' if q else 'declarative',pattern='SVC',complexity='simple',tense=tense,modal=None,questionType=q,aspect='simple',voice='active',nodes=[],reasons=[],corrections=[])
 def node(role,part,rule,parent=None,start=0):
  key=str(len(e['nodes']));e['nodes'].append(dict(key=key,parentKey=parent,role=role,implicit=False,ranges=[span(text,part,start)],ruleId=rule));return key
 vp=text.index(verb,6 if cat=='where' else 0 if cat=='yes-no' else len(subject))
 sp=text.index(subject,vp+len(verb) if q else 0)
 s=node('subject',subject,'SVC-LOCATION-001',start=sp)
 for a in sa:node('attribute',a,'SVC-LOCATION-001',s,sp)
 node('verb',verb,'QUESTION-BE-LOCATION-001' if q else 'NEGATIVE-BE-LOCATION-001' if cat=='negative' else 'SVC-LOCATION-001',start=vp)
 cp=0 if cat=='where' else vp+len(verb)
 c=node('complement',comp,'WH-COMPLEMENT-001' if cat=='where' else 'SVC-LOCATION-001',start=cp)
 for a in ca:node('attribute',a,'SVC-LOCATION-001',c,text.index(comp,cp))
 return e
def add(cat,args,kind='correct',fid=None):
 text,*slots=args;fid=fid or f'33e-{cat}-{sum(f["kind"]==kind and f["category"]==cat for f in fixtures)+1:02}'
 fixtures.append(dict(id=fid,category=cat,kind=kind,input=text,expected=answer(text,cat,*slots)));return fixtures[-1]
# Ten distinct full answers per structure. PP pairs and modifiers are chosen from the authored scope.
rows={
'affirmative':[
('Her clean bag is in our green car.','Her clean bag','is','in our green car','present',('clean',),('green',)),
('Your tired workers were in those empty buses.','Your tired workers','were','in those empty buses','past',('tired',),('empty',)),
('Our red umbrella is on this short table.','Our red umbrella','is','on this short table','present',('red',),('short',)),
('The hungry mouse was on her new chair.','The hungry mouse','was','on her new chair','past',('hungry',),('new',)),
('Those blue gifts are under our tall tables.','Those blue gifts','are','under our tall tables','present',('blue',),('tall',)),
('A quiet baby was under your old chairs.','A quiet baby','was','under your old chairs','past',('quiet',),('old',)),
('Our calm artist is near these clean tables.','Our calm artist','is','near these clean tables','present',('calm',),('clean',)),
('Their old letters were near that small chair.','Their old letters','were','near that small chair','past',('old',),('small',)),
('I am near your beautiful cars.','I','am','near your beautiful cars','present',(),('beautiful',)),
('  YOU  ARE  NEAR  OUR  RED  BUSES  ','YOU','ARE','NEAR  OUR  RED  BUSES','present',(),('RED',))],
'negative':[
('His new picture is not in her clean bus.','His new picture','is not','in her clean bus','present',('new',),('clean',)),
("Our quiet cousins weren't in the small cars.",'Our quiet cousins',"weren't",'in the small cars','past',('quiet',),('small',)),
('Your beautiful apples aren’t on these old tables.','Your beautiful apples','aren’t','on these old tables','present',('beautiful',),('old',)),
("The tired uncle wasn't on that blue chair.",'The tired uncle',"wasn't",'on that blue chair','past',('tired',),('blue',)),
('I am not under your clean table.','I','am not','under your clean table','present',(),('clean',)),
('You were not under our short chairs.','You','were not','under our short chairs','past',(),('short',)),
("The angry farmer isn't near these empty buses.",'The angry farmer',"isn't",'near these empty buses','present',('angry',),('empty',)),
('These hungry mice weren’t near her green car.','These hungry mice','weren’t','near her green car','past',('hungry',),('green',)),
('A sad singer is not near their tall table','A sad singer','is not','near their tall table','present',('sad',),('tall',)),
('  OUR  GOOD  FRIENDS  ARE  NOT  NEAR  HIS  NEW  CHAIRS.  ','OUR  GOOD  FRIENDS','ARE  NOT','NEAR  HIS  NEW  CHAIRS','present',('GOOD',),('NEW',))],
'yes-no':[
('Is your good friend in our old bus?','your good friend','Is','in our old bus','present',('good',),('old',)),
('Were their green umbrellas in these clean cars?','their green umbrellas','Were','in these clean cars','past',('green',),('clean',)),
('Are his blue pens on your short tables?','his blue pens','Are','on your short tables','present',('blue',),('short',)),
('Was our hungry dancer on that empty chair?','our hungry dancer','Was','on that empty chair','past',('hungry',),('empty',)),
('Am I under those beautiful tables?','I','Am','under those beautiful tables','present',(),('beautiful',)),
('Were you under their green chairs?','you','Were','under their green chairs','past',(),('green',)),
('Is the busy doctor near her new table?','the busy doctor','Is','near her new table','present',('busy',),('new',)),
('Were these small eggs near our tall chairs?','these small eggs','Were','near our tall chairs','past',('small',),('tall',)),
('Is his clean tooth near your red cars','his clean tooth','Is','near your red cars','present',('clean',),('red',)),
('  ARE  OUR  YOUNG  ACTORS  NEAR  THOSE  BIG  BUSES?  ','OUR  YOUNG  ACTORS','ARE','NEAR  THOSE  BIG  BUSES','present',('YOUNG',),('BIG',))],
'where':[
('Where is her tired aunt?','her tired aunt','is','Where','present',('tired',)),
('Where were our hungry neighbors?','our hungry neighbors','were','Where','past',('hungry',)),
('Where are those clean teeth?','those clean teeth','are','Where','present',('clean',)),
('Where was your short umbrella?','your short umbrella','was','Where','past',('short',)),
('Where is a calm doctor?','a calm doctor','is','Where','present',('calm',)),
('Where were their beautiful women?','their beautiful women','were','Where','past',('beautiful',)),
('Where are his busy students?','his busy students','are','Where','present',('busy',)),
('Where was this empty window?','this empty window','was','Where','past',('empty',)),
('Where is our useful gift','our useful gift','is','Where','present',('useful',)),
('  WHERE  ARE  YOUR  SAD  CHILDREN?  ','YOUR  SAD  CHILDREN','ARE','WHERE','present',('SAD',))]}
for cat,group in rows.items():
 for args in group:add(cat,args)
# Three exact single replacements per structure; corrected full inputs are independent too.
errors=[
('affirmative','The quiet mice is near your green bus.','is','are','The quiet mice','are','near your green bus','present',('quiet',),('green',)),
('affirmative','I were in their empty car.','were','was','I','was','in their empty car','past',(),('empty',)),
('affirmative','Your busy aunt were under my new table.','were','was','Your busy aunt','was','under my new table','past',('busy',),('new',)),
('negative',"Our green bags isn't under those short chairs.","isn't","aren't",'Our green bags',"aren't",'under those short chairs','present',('green',),('short',)),
('negative','The calm neighbor weren’t on your big table.','weren’t','wasn’t','The calm neighbor','wasn’t','on your big table','past',('calm',),('big',)),
('negative','You is not near her clean chairs.','is','are','You','are not','near her clean chairs','present',(),('clean',)),
('yes-no','Is those tired singers in our red buses?','Is','Are','those tired singers','Are','in our red buses','present',('tired',),('red',)),
('yes-no','Was you near my empty bus?','Was','Were','you','Were','near my empty bus','past',(),('empty',)),
('yes-no','Were the small orange under our green chair?','Were','Was','the small orange','Was','under our green chair','past',('small',),('green',)),
('where','Where is your quiet uncles?','is','are','your quiet uncles','are','Where','present',('quiet',),()),
('where','Where were her angry mother?','were','was','her angry mother','was','Where','past',('angry',),()),
('where','Where was those old feet?','was','were','those old feet','were','Where','past',('old',),())]
for i,(cat,text,wrong,replacement,subject,verb,comp,tense,sa,ca) in enumerate(errors,1):
 q=span(text,wrong,6 if cat=='where' else 0 if cat=='yes-no' else len(subject));control_input=text[:q['start']]+replacement+text[q['end']:]
 control=add(cat,(control_input,subject,verb,comp,tense,sa,ca),'control',f'33e-control-{i:02}')
 e=failure('form-mismatch','partial',[q] if "'" in wrong or '’' in wrong else [])
 e['corrections']=[dict(ruleId='AGREEMENT-001',edits=[dict(range=q,expected=wrong,replacement=replacement)])]
 fixtures.append(dict(id=f'33e-error-{i:02}',category=cat,kind='error',input=text,controlId=control['id'],expected=e))
boundaries=[
('Her quiet cousin is near the satellite.','unknown-word','satellite'),
('Where were the blue robots?','unknown-word','robots'),
('Our red bag is in that short chair.','unsupported-structure'),
('His clean pen is on your big bus.','unsupported-structure'),
('My old umbrella was under their red car.','unsupported-structure'),
('Our calm doctor is near her empty window.','unsupported-structure'),
('Your green pen is under chair.','unsupported-structure'),
('Her tired uncle was near an buses.','unsupported-structure'),
('Those blue eggs are on this tables.','unsupported-structure'),
('Our calm artist is under her.','unsupported-structure'),
('His short pencil is on that new table.','unknown-word','pencil'),
('Your useful gift is near our green car today.','unsupported-structure'),
('Their old picture can be on my short chair.','unsupported-structure'),
('Our clean bags will be under those big tables.','unsupported-structure'),
('Her quiet aunt has been in that empty bus.','unsupported-structure'),
('His red picture is being near these cars.','unsupported-structure'),
('Our old bag is kept under your clean chair.','unsupported-structure'),
('Where your tired mother was?','unsupported-structure'),
('Where is her calm uncle near the bus?','unsupported-structure'),
('Are our new pens not on the chair?','unsupported-structure'),
('Why was their hungry mouse?','unsupported-structure'),
('Our clean bag is under your table and she sleeps.','unsupported-structure',None,1),
('Where are the clean bags.','punctuation'),
('Her tired aunt was on my blue chair..','punctuation',None,None,'invalid')]
for i,(text,code,*extra) in enumerate(boundaries,1):
 word=extra[0] if extra else None;clause=extra[1] if len(extra)>1 else None;status=extra[2] if len(extra)>2 else 'unsupported'
 fixtures.append(dict(id=f'33e-boundary-{i:02}',category='boundary',kind='boundary',input=text,expected=failure(code,status,[span(text,word)] if word else [],clause)))
assert len(fixtures)==88
unique=set()
for f in fixtures:
 key=normalize(f['input']);assert key not in old,f'Prior source reused before execution: {f["input"]}';assert key not in unique,f'Duplicate independent input: {f["input"]}';unique.add(key)
payload=dict(stage=33,phase='33E',status='human-fixed-before-first-analysis',baselineHash=baseline['contentHash'],authorship='New manually chosen grammatical slots, exact UTF-16 spans, rules and edits; source-only arithmetic. 40 correct + 12 errors + 12 complete controls + 24 refusals. All normalized inputs excluded from frozen historical/development/UI/docs corpus.',fixtures=fixtures)
p=Path('tests/fixtures/stage33-acceptance.json')
raw=(json.dumps(payload,ensure_ascii=False,indent=2)+'\n').encode()
if p.exists():assert p.read_bytes()==raw,'Do not rewrite independent answers after execution'
else:p.write_bytes(raw)
p.with_suffix('.sha256').write_text(hashlib.sha256(raw).hexdigest()+'\n')
print(json.dumps(dict(fixtures=len(fixtures),sha256=hashlib.sha256(raw).hexdigest())))
