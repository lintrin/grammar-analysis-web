"""Human annotations and frozen range arithmetic only. Never import or run grammar rules."""
import json, hashlib, re
from pathlib import Path
baseline=json.loads(Path('tests/baselines/stage32-development.json').read_text())
previous={x['input'] for x in baseline['inputs']}
fixtures=[]
def empty(status='unsupported',code='unsupported-structure',ranges=None,index=None):
 r={'code':code,'ranges':ranges or []}
 if index:r['clauseIndex']=index
 return dict(status=status,purpose=None,pattern=None,complexity=None,tense=None,modal=None,questionType=None,aspect=None,voice=None,nodes=[],reasons=[r],corrections=[])
def full(pattern='SV',tense='present',modal=None,aspect='simple',question=None):
 return dict(status='complete',purpose='interrogative' if question else 'declarative',pattern=pattern,complexity='simple',tense=None if modal else tense,modal=modal,questionType=question,aspect=aspect,voice='active',nodes=[],reasons=[],corrections=[])
def ranges(text,parts):
 # Fragments are manually supplied, original offsets calculated without tokenization.
 result=[];cursor=0
 for p in parts:
  start=text.index(p,cursor);end=start+len(p);result.append({'start':start,'end':end});cursor=end
 return result
attrs=set('angry blue busy calm clean empty green happy hungry quiet red sad short tall tired beautiful big good kind new old small useful young'.split())
def node(e,text,role,parts,rule,parent=None,attributes=False):
 key=str(len(e['nodes']));rs=ranges(text,parts)
 e['nodes'].append(dict(key=key,parentKey=parent,role=role,implicit=False,ranges=rs,ruleId=rule))
 if attributes:
  for q in rs:
   for m in re.finditer(r'\b\w+\b',text[q['start']:q['end']]):
    if m.group().lower() in attrs:node(e,text,'attribute',[text[q['start']+m.start():q['start']+m.end()]],rule,key)
 return key
def sentence(s,v,tail='',pattern='SV',tense='present',modal=None,aspect='simple',question=False,negative=False,wont=False):
 # Explicit authored role slots. v may have two interrogative segments.
 if isinstance(v,list):text=f'{v[0]} {s} {v[1]}'
 else:text=f'{s} {v}'
 text+=(' '+tail if tail else '')+('?' if question else '.')
 e=full(pattern,tense,modal,aspect,'yes-no' if question else None)
 rule=f'PREDICATE-{aspect.upper()}-ACTIVE' if aspect!='simple' else pattern+'-001'
 vr=rule
 if modal=='will':vr='QUESTION-WILL-001' if question else 'NEGATIVE-WILL-001' if negative or wont else 'MODAL-WILL-001'
 if modal=='can':vr='MODAL-CAN-001'
 if question and not modal and aspect=='simple':vr='QUESTION-DO-001'
 if negative and not modal and aspect=='simple':vr='NEGATIVE-DO-001'
 node(e,text,'subject',[s],rule,attributes=True);node(e,text,'verb',v if isinstance(v,list) else [v],vr)
 if tail:
  if pattern=='SVOO':
   # Every authored SVOO tail uses 'him' followed by an explicit noun phrase.
   node(e,text,'indirectObject',['him'],rule);node(e,text,'object',[tail[4:]],rule,attributes=True)
  elif pattern=='SVOC':
   o,c=tail.rsplit(' ',1);node(e,text,'object',[o],rule,attributes=True);node(e,text,'complement',[c],rule)
  else:node(e,text,'complement' if pattern=='SVC' else 'object',[tail],rule,attributes=pattern!='SVC' or ' ' in tail)
 return text,e
def add(category,text,e,kind='correct',abilities=None,**extra):
 normalized=text.lower();normalized=re.sub(r'\s+',' ',normalized).strip()
 assert normalized not in previous,('historical reuse',text)
 assert not any(re.sub(r'\s+',' ',f['input'].lower()).strip()==normalized for f in fixtures),('duplicate',text)
 f=dict(id=f'{category}-{1+sum(x["category"]==category for x in fixtures):02}',category=category,kind=kind,input=text,abilities=abilities or [category],expected=e,**extra);fixtures.append(f);return f
# 30 will corrects, five patterns, negatives, both apostrophes, split predicates and four clause frames.
subjects=['Our young doctor','Their kind teacher','The busy nurse','Our quiet neighbor','Their old artist']
configs=[('SV','sleep',''),('SVO','read','the small letter'),('SVC','be','calm'),('SVOO','give','him a blue picture'),('SVOC','keep','the new window clean')]
for pattern,base,tail in configs:
 for i,style in enumerate(['positive','negative','question','ascii','curly']):
  s=subjects[i];negative=style!='positive' and style!='question'
  v=["Will",base] if style=='question' else ('will '+base if style=='positive' else 'will not '+base if style=='negative' else ("won't " if style=='ascii' else 'won’t ')+base)
  text,e=sentence(s if style!='question' else s[0].lower()+s[1:],v,tail,pattern,modal='will',question=style=='question',negative=negative)
  add('will',text,e)
def clause(text,left,right,relation):
 # Whole-clause slots plus explicit internal answers; connector consumes original comma where present.
 lt,le=left;rt,re_=right;e=full();e.update(pattern=None,complexity='compound' if relation in ['and','but'] else 'complex',tense=None,modal=None,aspect=None,voice=None)
 rule={'and':'COMPOUND-001','but':'COMPOUND-001','because':'BECAUSE-001','if':'IF-001'}[relation]
 for i,(ct,ce) in enumerate([left,right]):
  key=node(e,text,'clause',[ct],rule);e['nodes'][-1]['clause']=dict(kind='independent' if relation in ['and','but'] else 'subordinate' if (i==0)==(relation=='if') else 'main',**{k:ce[k] for k in ['purpose','pattern','tense','modal','questionType','aspect','voice']})
  offset=text.index(ct);mapping={n['key']:str(len(e['nodes'])+j) for j,n in enumerate(ce['nodes'])}
  for n in ce['nodes']:
   p=n['parentKey'];e['nodes'].append({**n,'key':mapping[n['key']],'parentKey':key if p is None else mapping[p],'ranges':[{'start':q['start']+offset,'end':q['end']+offset} for q in n['ranges']]})
 parts=['If',','] if relation=='if' else [relation];k=node(e,text,'connector',parts,rule);e['nodes'][-1]['relation']={'and':'addition','but':'contrast','because':'cause','if':'condition'}[relation];return e
for relation in ['and','but','because','if']:
 a,ae=sentence('Our tall dancer','smiles');b,be=sentence('their young driver','will open','the small door','SVO',modal='will')
 a=a[:-1];b=b[:-1];text=f'If {a[0].lower()+a[1:]}, {b}.' if relation=='if' else f'{a} {relation} {b}.'
 if relation=='if':a=a[0].lower()+a[1:]
 add('will',text,clause(text,(a,ae),(b,be),relation))
text,e=sentence('Our happy uncle','will hit','the old table','SVO',modal='will');add('will',text,e)
# 20 locations: every listed verb, under only sleep/wait. Phrase attribute is a child of the full PP.
location_specs=[('sleep','will sleep','under the big chair'),('work','will work','near the new bus'),('walk','will walk','in the old car'),('run','will run','on the small table'),('dance','will dance','near the blue door'),('wait','will wait','under the green umbrella'),('sleep','will not sleep','in the empty bus'),('wait','will not wait','on the red chair'),('sleep','is sleeping','near the new table'),('work','is working','in the quiet car'),('walk','is walking','near the big window'),('run','is running','on the clean table'),('dance','was dancing','near the old chair'),('wait','was waiting','under the small umbrella'),('sleep',['Does','sleep'],'on the new chair'),('work',['Did','work'],'near the green bus'),('walk',['Will','walk'],'near the tall table'),('run',['Will','run'],'in the big car'),('dance','dances','on the old table'),('wait','waits','near the empty chair')]
for i,(lemma,v,pp) in enumerate(location_specs):
 s=['Our young singer','Their quiet doctor','The kind artist','Our busy nurse'][i%4];q=isinstance(v,list);s=s[0].lower()+s[1:] if q else s
 modal='will' if ('will' in v.lower() if isinstance(v,str) else v[0]=='Will') else None;aspect='progressive' if isinstance(v,str) and ('is ' in v or 'was ' in v) else 'simple';tense='past' if (isinstance(v,str) and v.startswith('was')) or (q and v[0]=='Did') else 'present'
 text,e=sentence(s,v,modal=modal,aspect=aspect,tense=tense,question=q,negative=isinstance(v,str) and 'not' in v);text=text[:-1]+' '+pp+text[-1];node(e,text,'adverbial',[pp],'LOCATION-001',attributes=True)
 add('location',text,e,abilities=['location','will'] if modal else ['location'])
# 30 WH: explicitly distinguish role of the fronted word and finite predicate.
def wh(word,s,aux,base,obj='',role='adverbial',pattern='SV',tense='present'):
 if role=='subject':
  verb=(aux+' '+base) if aux else base;text=f'{word} {verb}'+(' '+obj if obj else '')+'?';e=full(pattern,tense,'will' if aux=='will' else None,question='wh-subject');node(e,text,'subject',[word],'WH-SUBJECT-001');node(e,text,'verb',[verb],'MODAL-WILL-001' if aux=='will' else pattern+'-001')
 else:
  text=f'{word} {aux} {s} {base}'+(' '+obj if obj else '')+'?';e=full(pattern,'past' if aux=='did' else tense,'will' if aux=='will' else None,question='wh-'+('object' if role=='object' else 'adverbial'));node(e,text,role,[word],'WH-'+role.upper()+'-001');node(e,text,'verb',[aux,base],'QUESTION-WILL-001' if aux=='will' else 'QUESTION-DO-001');node(e,text,'subject',[s],pattern+'-001',attributes=True)
 if obj:node(e,text,'object',[obj],pattern+'-001',attributes=True)
 return text,e
for i,(word,base,obj,pattern) in enumerate([('Where','sleep','','SV'),('Where','work','','SV'),('Where','walk','','SV'),('When','read','','SV'),('Why','write','','SV'),('When','open','the blue door','SVO'),('Why','close','the new window','SVO'),('When','eat','the red apple','SVO'),('Why','buy','a small gift','SVO'),('Where','wait','','SV')]):
 text,e=wh(word,'our young farmer','will' if i<6 else 'did',base,obj,pattern=pattern);add('wh',text,e,abilities=['wh']+(['will'] if i<6 else [])+(['multiframe'] if i in [3,4] else []))
for i,(word,base) in enumerate([('What','read'),('Who','see'),('What','write'),('What','open'),('Who','meet'),('What','eat'),('What','close'),('Who','help'),('What','carry'),('What','draw')]):
 text,e=wh(word,'their kind nurse','will' if i<6 else 'does',base,role='object',pattern='SVO');add('wh',text,e,abilities=['wh']+(['will'] if i<6 else []))
for i,(word,base,obj,pattern) in enumerate([('Who','reads','the blue letter','SVO'),('Who','writes','a quiet letter','SVO'),('What','opens','the green window','SVO'),('What','closes','the red door','SVO'),('Who','eats','the small orange','SVO'),('Who','buys','a new toy','SVO'),('Who','read','a good letter','SVO'),('What','open','the big door','SVO'),('Who','write','the new book','SVO'),('Who','eat','','SV')]):
 text,e=wh(word,'','will' if i>=6 else '',base,obj,'subject',pattern);add('wh',text,e,abilities=['wh']+(['will'] if i>=6 else [])+(['multiframe'] if i==9 else []))
# Five second frames, 3 new-frame and one original SVO control per lemma.
for lemma,third,ing,subject,obj in [('eat','eats','eating','Our old doctor','a green apple'),('read','reads','reading','Our calm artist','a small book'),('write','writes','writing','Their busy farmer','the blue letter'),('open','opens','opening','The big window','the old door'),('close','closes','closing','The green door','the new window')]:
 for v,aspect,modal in [(third,'simple',None),('is '+ing,'progressive',None),('will not '+lemma,'simple','will')]:
  text,e=sentence(subject,v,aspect=aspect,modal=modal,negative=modal is not None);add('multiframe',text,e,abilities=['multiframe']+(['will'] if modal else []))
 text,e=sentence('Their young doctor','is '+ing,obj,'SVO',aspect='progressive');add('multiframe',text,e)
# 20 exact single replacements and independent complete control answers.
for i,(lemma,third) in enumerate([('sleep','sleeps'),('give','gives'),('keep','keeps'),('read','reads'),('be','is')]):
 pattern=['SV','SVOO','SVOC','SVO','SVC'][i];tail=['','him a small umbrella','the green window clean','a red book','happy'][i]
 control,e=sentence('Their quiet aunt','will '+lemma,tail,pattern,modal='will');c=add('control',control,e,kind='control',abilities=['will'])
 wrong=control.replace('will '+lemma,'will '+third);pos=wrong.index(third,wrong.index('will')+5);er=empty('partial','form-mismatch');er['corrections']=[{'ruleId':'MODAL-BASE-001','edits':[{'range':{'start':pos,'end':pos+len(third)},'expected':third,'replacement':lemma}]}];add('safe',wrong,er,'error',controlId=c['id'])
for i,(lemma,third,pp) in enumerate([('sleep','sleeps','under the new umbrella'),('work','works','near the blue bus'),('walk','walks','in the big car'),('dance','dances','on the clean table'),('wait','waits','under the old chair')]):
 control,e=sentence('Their happy cousin',third);control=control[:-1]+' '+pp+'.';node(e,control,'adverbial',[pp],'LOCATION-001',attributes=True);c=add('control',control,e,'control',abilities=['location'])
 wrong=control.replace(third,lemma);er=empty('partial','form-mismatch');p=wrong.index(lemma);er['corrections']=[{'ruleId':'AGREEMENT-001','edits':[{'range':{'start':p,'end':p+len(lemma)},'expected':lemma,'replacement':third}]}];add('safe',wrong,er,'error',controlId=c['id'])
for word,lemma,third,role in [('Where','work','works','adverbial'),('When','write','writes','adverbial'),('Why','read','reads','adverbial'),('What','close','closes','object'),('Who','help','helps','object')]:
 pattern='SVO' if role=='object' else 'SV';control,e=wh(word,'the quiet aunt','will',lemma,role=role,pattern=pattern);c=add('control',control,e,'control',abilities=['will','wh']);wrong=control.replace(lemma+'?',third+'?');p=wrong.rindex(third);er=empty('partial','form-mismatch');er['corrections']=[{'ruleId':'MODAL-BASE-001','edits':[{'range':{'start':p,'end':p+len(third)},'expected':third,'replacement':lemma}]}];add('safe',wrong,er,'error',controlId=c['id'])
for lemma,third,s in [('eat','eats','Our hungry uncle'),('read','reads','Our young aunt'),('write','writes','Their old nurse'),('open','opens','The clean window'),('close','closes','The blue door')]:
 control,e=sentence(s,third);c=add('control',control,e,'control',abilities=['multiframe']);wrong=control.replace(third,lemma);p=wrong.index(lemma);er=empty('partial','form-mismatch');er['corrections']=[{'ruleId':'AGREEMENT-001','edits':[{'range':{'start':p,'end':p+len(lemma)},'expected':lemma,'replacement':third}]}];add('safe',wrong,er,'error',controlId=c['id'])
# 20 refusals: unknowns, temporal homographs, dependent errors, incomplete and wrong-order slots.
for word in ['planet','castle','guitar','river','station']:
 text=f'Our quiet doctor will read the {word}.';p=text.index(word);add('no-auto',text,empty(code='unknown-word',ranges=[{'start':p,'end':p+len(word)}]),'refusal')
for lemma,obj in [('read','the blue book'),('cut','the old letter'),('hit','the green door')]:add('no-auto',f'Our calm neighbor {lemma} {obj}.',empty('ambiguous','ambiguous'),'refusal')
for text in ['Our quiet doctor will sleeps the book.','Our kind aunt will gives the new door clean.','Our young farmer will keeps him a blue letter.','Our old nurse will give him.','Our busy artist will keep the door.','Will our young aunt not sleep?','Where our quiet uncle does work?','What their busy doctor will read?','Our old teacher will read the.','Our young nurse will sleep yesterday.','Our calm cousin will write the letter yesterday.','Who read the blue picture?']:
 code='form-mismatch' if text.endswith('yesterday.') else 'ambiguous' if text.startswith('Who read') else 'unsupported-structure';status='ambiguous' if code=='ambiguous' else 'unsupported';add('no-auto',text,empty(status,code),'refusal')
# 20 scope contrasts fixed directly from the 27–30 matrices, no suggested rewrite.
for text in ['Our quiet aunt will be sleeping.','Our quiet aunt will have slept.','Our quiet aunt will be given a book.','Our busy uncle will have a book.','Our busy uncle will be reading the letter.','Our quiet doctor works under the blue table.','Our young dancer dances under the new chair.','Our young driver runs under the old bus.','Our quiet artist walks under the green umbrella.','Our quiet doctor has slept near the new table.','Our calm nurse reads near the blue door.','Our old teacher sees the girl near the red window.','Our kind artist is near the empty chair.','Where will our old nurse sleep near the door?','When will our young artist read the book today?','Why has our busy cousin read the book?','What will our calm uncle give him?','Who is our quiet artist seeing?','Our old doctor has been reading.','Our green door has been opening.']:
 add('boundary',text,empty(),'boundary')
assert len([f for f in fixtures if f['kind']=='correct'])==100
assert len(fixtures)==180
assert len([f for f in fixtures if f['kind']=='correct' and len(f['abilities'])>1])>=25
payload={'status':'human-fixed-before-first-analysis','authorship':'Authored explicit grammatical slots, rule IDs, classifications, rejection reasons and edits; arithmetic converts fragments to original UTF-16 positions. No analyzer imported or executed. Controls are independently checked, additional to the 100 corrects.','baselineHash':baseline['contentHash'],'fixtures':fixtures}
Path('tests/fixtures/stage32-acceptance.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
print('Fixed:',len(fixtures),'cross-capability correct:',sum(f['kind']=='correct' and len(f['abilities'])>1 for f in fixtures))
