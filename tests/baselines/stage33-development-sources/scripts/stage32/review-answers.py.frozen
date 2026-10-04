"""Explicit human review against earlier published scope, not analyzer-derived answers."""
import json,hashlib
from pathlib import Path
p=Path('tests/fixtures/stage32-acceptance.json');d=json.loads(Path('tests/fixtures/stage32-acceptance-initial.json').read_text());fs=d['fixtures'];review=[]
# Ranges: LOCATION child must be inside its parent PP. Find the second 'quiet' within that manually fixed parent.
f=next(f for f in fs if f['id']=='location-10');child=next(n for n in f['expected']['nodes'] if n['role']=='attribute' and n['ruleId']=='LOCATION-001');parent=next(n for n in f['expected']['nodes'] if n['key']==child['parentKey']);p0=parent['ranges'][0]['start'];start=f['input'].index('quiet',p0);child['ranges']=[{'start':start,'end':start+5}];review.append({'ids':['location-10'],'basis':'Attribute quiet in in the quiet car belongs to the location parent, not the earlier subject. Correct only arithmetic; input/role/parent unchanged.'})
# Complete single-subject past analyses fixed from the original role slots, as documented in stage21 and stage30.
# Import the human author functions without executing or re-writing its authored corpus.
namespace={};source=Path('scripts/stage32/author-answers.py').read_text();exec(source[:source.index('# 30 will corrects')],namespace);sentence=namespace['sentence'];wh=namespace.get('wh')
for fid,s,v,obj,pat in [('safe-17','Our young aunt','read','','SV'),('no-auto-06','Our calm neighbor','read','the blue book','SVO'),('no-auto-07','Our calm neighbor','cut','the old letter','SVO'),('no-auto-08','Our calm neighbor','hit','the green door','SVO'),('no-auto-20','Who','read','the blue picture','SVO')]:
 f=next(f for f in fs if f['id']==fid);text,e=sentence(s,v,obj,pat,tense='past');assert text[:-1]==f['input'][:-1]
 if fid=='no-auto-20':e['purpose']='interrogative';e['questionType']='wh-subject';e['nodes'][0]['ruleId']='WH-SUBJECT-001'
 f.update(category='reviewed',kind='reviewed',expected=e);f.pop('controlId',None)
review.append({'ids':['safe-17','no-auto-06','no-auto-07','no-auto-08','no-auto-20'],'basis':'Stage21 explicitly fixes She read as past and They read as ambiguous. Stage30 preserved an identical read correction draft error. Singular third-person (including default who) requires reads/cuts/hits for present; the bare homographic form here has only the past interpretation. Retain all original inputs with complete manually annotated past answers, add genuine error/plural ambiguity cases without counting these originals toward the 100/60.'})
# Original control stays. Add a new independent control/error instead of replacing or deleting either sentence.
text,e=sentence('our young aunt',['Does','read'],question=True);c=dict(id='control-21',category='control',kind='control',input=text,abilities=['multiframe'],expected=e);fs.append(c)
wrong=text.replace('read?','reads?');p0=wrong.index('reads');e=namespace['empty']('partial','form-mismatch');e['corrections']=[{'ruleId':'DO-BASE-001','edits':[{'range':{'start':p0,'end':p0+5},'expected':'reads','replacement':'read'}]}];fs.append(dict(id='safe-21',category='safe',kind='error',input=wrong,abilities=['multiframe'],expected=e,controlId=c['id']))
for i,(lemma,obj) in enumerate([('read','the blue book'),('cut','the old letter'),('hit','the green door'),('read','the old picture')]):
 fs.append(dict(id=f'no-auto-{21+i}',category='no-auto',kind='refusal',input=f'Our calm neighbors {lemma} {obj}.',abilities=['no-auto'],expected=namespace['empty']('ambiguous','ambiguous')))
d['review']='Initial byte snapshot retained. R1 changes only documented human grammar/arithmetic mistakes, keeps every original input, adds independent replacement coverage. Unsupported malformed What + NP + will question expectation remains fixed.'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');h=hashlib.sha256(p.read_bytes()).hexdigest();Path('tests/fixtures/stage32-acceptance.sha256').write_text(h+'\n')
Path('tests/fixtures/stage32-answer-review.json').write_text(json.dumps({'initialHash':Path('tests/fixtures/stage32-acceptance-initial.sha256').read_text().strip(),'revisedHash':h,'changes':review,'firstRun':{'assertions':203,'passed':196,'failed':7,'classificationMistakes':5,'arithmeticMistakes':1,'implementationDiagnostic':1}},ensure_ascii=False,indent=2)+'\n');print(h,len(fs))
