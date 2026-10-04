"""Human role slots and exact text arithmetic. No analyzer or tokenizer imports.
Run only to reproduce the original 33A artifacts; never fix expectations from outputs.
"""
import json
import hashlib
import re
from pathlib import Path

OUT = Path('tests/fixtures')
fixtures = []
fields = ['purpose', 'pattern', 'complexity', 'tense', 'modal', 'questionType', 'aspect', 'voice']

def failed(code='unsupported-structure', status='unsupported', ranges=None, clause=None):
    reason = dict(code=code, ranges=ranges or [])
    if clause is not None:
        reason['clauseIndex'] = clause
    return dict(status=status, **{f: None for f in fields}, nodes=[], reasons=[reason], corrections=[])

def span(text, fragment, start=0):
    a = text.index(fragment, start)
    # All authored material is ASCII or BMP apostrophe; these are UTF-16 offsets too.
    return dict(start=a, end=a + len(fragment))

def complete(text, category, subject, verb, complement, tense='present', subject_attrs=(), complement_attrs=()):
    question = {'yes-no': 'yes-no', 'where': 'wh-complement'}.get(category)
    e = dict(status='complete', purpose='interrogative' if question else 'declarative', pattern='SVC', complexity='simple', tense=tense, modal=None, questionType=question, aspect='simple', voice='active', nodes=[], reasons=[], corrections=[])
    def node(role, fragment, rule, parent=None, offset=0):
        key = str(len(e['nodes']))
        e['nodes'].append(dict(key=key, parentKey=parent, role=role, implicit=False, ranges=[span(text, fragment, offset)], ruleId=rule))
        return key
    # Slots are hand annotated: no grammar engine, inferred phrase boundary or guessed role.
    subject_offset = text.index(verb, len(complement) if category == 'where' else 0) + len(verb) if question else 0
    subject_start = text.index(subject, subject_offset)
    s = node('subject', subject, 'SVC-LOCATION-001', offset=subject_start)
    for a in subject_attrs:
        node('attribute', a, 'SVC-LOCATION-001', s, subject_start)
    vr = 'QUESTION-BE-LOCATION-001' if question else 'NEGATIVE-BE-LOCATION-001' if category == 'negative' else 'SVC-LOCATION-001'
    vpos = 6 if category == 'where' else 0 if category == 'yes-no' else text.index(subject) + len(subject)
    node('verb', verb, vr, offset=vpos)
    c = node('complement', complement, 'WH-COMPLEMENT-001' if category == 'where' else 'SVC-LOCATION-001', offset=0 if category == 'where' else text.index(verb, vpos) + len(verb))
    for a in complement_attrs:
        node('attribute', a, 'SVC-LOCATION-001', c, text.index(complement, text.index(verb, vpos) + len(verb)))
    return e

def add(category, text, subject, verb, complement, tense='present', subject_attrs=(), complement_attrs=(), kind='correct'):
    f = dict(id=f'33-{category}-{1+sum(f["category"] == category and f["kind"] == kind for f in fixtures):02}' + ('-control' if kind == 'control' else ''), category=category, kind=kind, input=text, expected=complete(text, category, subject, verb, complement, tense, subject_attrs, complement_attrs))
    fixtures.append(f)
    return f

# Twelve distinct, manually specified full answers in each of four structures.
for args in [
 ('The book is on the table.', 'The book', 'is', 'on the table'),
 ('I am in a car.', 'I', 'am', 'in a car'),
 ('You are in the blue bus.', 'You', 'are', 'in the blue bus', 'present', (), ('blue',)),
 ('He was on a chair.', 'He', 'was', 'on a chair', 'past'),
 ('She is under the tall table.', 'She', 'is', 'under the tall table', 'present', (), ('tall',)),
 ('We were under the chairs.', 'We', 'were', 'under the chairs', 'past'),
 ('They are near a table.', 'They', 'are', 'near a table'),
 ('The small book was near the chair.', 'The small book', 'was', 'near the chair', 'past', ('small',)),
 ('The bags were near the cars.', 'The bags', 'were', 'near the cars', 'past'),
 ('The teacher is near the bus.', 'The teacher', 'is', 'near the bus'),
 ('These books are on those tables', 'These books', 'are', 'on those tables'),
 ('  THE  BOOK  IS  UNDER  THE  CHAIR.  ', 'THE  BOOK', 'IS', 'UNDER  THE  CHAIR'),
]:
    add('affirmative', *args)
for args in [
 ('I am not near the bus.', 'I', 'am not', 'near the bus'),
 ('You are not on the chair.', 'You', 'are not', 'on the chair'),
 ("The girl isn't in the car.", 'The girl', "isn't", 'in the car'),
 ('The girls aren’t in the buses.', 'The girls', 'aren’t', 'in the buses'),
 ("He wasn't under a table.", 'He', "wasn't", 'under a table', 'past'),
 ('We weren’t under the chair.', 'We', 'weren’t', 'under the chair', 'past'),
 ('The boy is not on a table.', 'The boy', 'is not', 'on a table'),
 ('The boys were not near the chairs.', 'The boys', 'were not', 'near the chairs', 'past'),
 ('She isn’t near the red car.', 'She', 'isn’t', 'near the red car', 'present', (), ('red',)),
 ("They aren't near the empty bus.", 'They', "aren't", 'near the empty bus', 'present', (), ('empty',)),
 ('It was not on the old chair', 'It', 'was not', 'on the old chair', 'past', (), ('old',)),
 ('The quiet nurse is not under the tall tables.', 'The quiet nurse', 'is not', 'under the tall tables', 'present', ('quiet',), ('tall',)),
]:
    add('negative', *args)
for args in [
 ('Am I in the car?', 'I', 'Am', 'in the car'),
 ('Are you in a bus?', 'you', 'Are', 'in a bus'),
 ('Is the book on the table?', 'the book', 'Is', 'on the table'),
 ('Was he on a chair?', 'he', 'Was', 'on a chair', 'past'),
 ('Are the books under the table?', 'the books', 'Are', 'under the table'),
 ('Were we under the chairs?', 'we', 'Were', 'under the chairs', 'past'),
 ('Is she near the table?', 'she', 'Is', 'near the table'),
 ('Was the young teacher near the chair?', 'the young teacher', 'Was', 'near the chair', 'past', ('young',)),
 ('Were they near the cars?', 'they', 'Were', 'near the cars', 'past'),
 ('Is the bag near the blue bus?', 'the bag', 'Is', 'near the blue bus', 'present', (), ('blue',)),
 ('Are these bags on the small tables', 'these bags', 'Are', 'on the small tables', 'present', (), ('small',)),
 ('  IS  THE  TABLE  NEAR  THE  TABLE?  ', 'THE  TABLE', 'IS', 'NEAR  THE  TABLE'),
]:
    add('yes-no', *args)
for args in [
 ('Where am I?', 'I', 'am', 'Where'),
 ('Where are you?', 'you', 'are', 'Where'),
 ('Where is the book?', 'the book', 'is', 'Where'),
 ('Where was he?', 'he', 'was', 'Where', 'past'),
 ('Where were we?', 'we', 'were', 'Where', 'past'),
 ('Where are they?', 'they', 'are', 'Where'),
 ('Where is she?', 'she', 'is', 'Where'),
 ('Where were the books?', 'the books', 'were', 'Where', 'past'),
 ('Where was the tall teacher?', 'the tall teacher', 'was', 'Where', 'past', ('tall',)),
 ('Where are these buses?', 'these buses', 'are', 'Where'),
 ('Where is the red car', 'the red car', 'is', 'Where', 'present', ('red',)),
 ('  WHERE  IS  THE  CHAIR?  ', 'THE  CHAIR', 'IS', 'WHERE'),
]:
    add('where', *args)

# Four corrections per structure. Each owns a distinct complete control answer.
corrections = [
 ('affirmative', 'The books is near the car.', 'is', 'are', 'The books', 'are', 'near the car', 'present'),
 ('affirmative', 'I are under the table.', 'are', 'am', 'I', 'am', 'under the table', 'present'),
 ('affirmative', 'You was in the car.', 'was', 'were', 'You', 'were', 'in the car', 'past'),
 ('affirmative', 'The nurse were on the chair.', 'were', 'was', 'The nurse', 'was', 'on the chair', 'past'),
 ('negative', "The tables isn't near the car.", "isn't", "aren't", 'The tables', "aren't", 'near the car', 'present'),
 ('negative', 'The driver weren’t in the bus.', 'weren’t', 'wasn’t', 'The driver', 'wasn’t', 'in the bus', 'past'),
 ('negative', 'You is not under the chair.', 'is', 'are', 'You', 'are not', 'under the chair', 'present'),
 ('negative', 'I are not on the table.', 'are', 'am', 'I', 'am not', 'on the table', 'present'),
 ('yes-no', 'Is the cars near the bus?', 'Is', 'Are', 'the cars', 'Are', 'near the bus', 'present'),
 ('yes-no', 'Are I on the chair?', 'Are', 'Am', 'I', 'Am', 'on the chair', 'present'),
 ('yes-no', 'Was you under the table?', 'Was', 'Were', 'you', 'Were', 'under the table', 'past'),
 ('yes-no', 'Were the artist in the car?', 'Were', 'Was', 'the artist', 'Was', 'in the car', 'past'),
 ('where', 'Where is the chairs?', 'is', 'are', 'the chairs', 'are', 'Where', 'present'),
 ('where', 'Where are I?', 'are', 'am', 'I', 'am', 'Where', 'present'),
 ('where', 'Where was you?', 'was', 'were', 'you', 'were', 'Where', 'past'),
 ('where', 'Where were the driver?', 'were', 'was', 'the driver', 'was', 'Where', 'past'),
]
for i, (category, text, wrong, replacement, subject, verb, comp, tense) in enumerate(corrections):
    offset = 6 if category == 'where' else 0 if category == 'yes-no' else len(subject)
    q = span(text, wrong, offset)
    control_input = text[:q['start']] + replacement + text[q['end']:]
    control = next((f for f in fixtures if f['input'] == control_input and f['kind'] == 'correct'), None)
    if control is None:
        control = add(category, control_input, subject, verb, comp, tense, kind='control')
    else:
        assert control['expected'] == complete(control_input, category, subject, verb, comp, tense)
    e = failed('form-mismatch', 'partial', [q] if "'" in wrong or '’' in wrong else [])
    e['corrections'] = [dict(ruleId='AGREEMENT-001', edits=[dict(range=q, expected=wrong, replacement=replacement)])]
    fixtures.append(dict(id=f'33-error-{i+1:02}', category=category, kind='error', input=text, controlId=control['id'], expected=e))

# Scope refuses malformed complete phrases, extra tails and unopened carriers.
boundaries = [
 ('The book is on the planet.', 'unknown-word', 'planet'),
 ('Where is the robot?', 'unknown-word', 'robot'),
 ('The book is beside the table.', 'unknown-word', 'beside'),
 ('The book is in the table.', 'pair-not-licensed'),
 ('The book is on the car.', 'pair-not-licensed'),
 ('The book is under the bus.', 'pair-not-licensed'),
 ('The book is near the door.', 'pair-not-licensed'),
 ('The book is on table.', 'incomplete-NP'),
 ('The book is on a tables.', 'plural-article'),
 ('The book is on an chair.', 'article-sound'),
 ('The books is on this chairs.', 'two-errors'),
 ('The book is near these car.', 'determiner-number'),
 ('The book is near the.', 'missing-head'),
 ('The book on the table.', 'missing-be'),
 ('The book is near it.', 'location-pronoun'),
 ('The book is near the table on the chair.', 'two-PPs'),
 ('Near the table the book is.', 'preposed-PP'),
 ('The book is on the table today.', 'time-tail'),
 ('Where is the book yesterday?', 'time-tail'),
 ('The book can be on the table.', 'modal'),
 ('The book will be under the chair.', 'modal'),
 ('The book has been on the table.', 'perfect'),
 ('The book is being on the table.', 'progressive'),
 ('The book is kept on the table.', 'passive'),
 ('The book will have been near the car.', 'modal-perfect'),
 ('Where the book is?', 'word-order'),
 ('Where is the book on the table?', 'where-extra-PP'),
 ('Where is not the book?', 'negative-WH'),
 ('Is the book not under the chair?', 'negative-yes-no'),
 ("Isn't the book on the table?", 'negative-inversion'),
 ('What is the book near the table?', 'other-WH'),
 ('When is the book?', 'other-WH'),
 ('Be near the table.', 'imperative'),
 ('How near the table the book is!', 'exclamatory'),
 ('The book is near the chair and she smiles.', 'clause', 1),
 ('She smiles because the book is near the bus.', 'clause', 2),
 ('The book is on the table?', 'punctuation'),
 ('Where is the book.', 'punctuation'),
 ('The book is on the table..', 'punctuation-invalid'),
 ('The book are near a chairs.', 'two-errors'),
 # No amn't exists in this project's vocabulary. Do not rewrite the whole phrase.
 ("I isn't near the table.", 'unrepresentable-contraction'),
 ('Does the book be near the car?', 'do-be'),
 ('The book is near the table,', 'other-symbol'),
 ('The book is on the chair yesterday.', 'time-tail'),
 ('Who is near the bus?', 'other-WH'),
 ('Where is?', 'missing-subject'),
 ('The books is on the table.', 'plan-correction'),
]
# The plan's correction example belongs to errors, not refusal counts.
boundaries.pop()
for i, (text, category, *extra) in enumerate(boundaries):
    code = 'unknown-word' if category == 'unknown-word' else 'punctuation' if category.startswith('punctuation') or category == 'other-symbol' else 'unsupported-structure'
    e = failed(code, 'invalid' if category == 'punctuation-invalid' else 'unsupported', [span(text, extra[0])] if code == 'unknown-word' else [], extra[0] if category == 'clause' else None)
    if category == 'unrepresentable-contraction':
        e = failed('form-mismatch', 'partial', [span(text, "isn't")])
    fixtures.append(dict(id=f'33-boundary-{i+1:02}', category=category, kind='boundary', input=text, expected=e))

# Explicit migrations retain every old full answer and source identity; no originals edited in 33A.
migrations = []
for path, fid, subject, verb, comp, category, sattrs, cattrs in [
 ('tests/fixtures/stage28-development.json', '28-69', 'The book', 'is', 'near the table', 'affirmative', (), ()),
 ('tests/fixtures/stage29-development.json', '29-111', 'the book', 'is', 'Where', 'where', (), ()),
 ('tests/fixtures/stage32-acceptance.json', 'boundary-13', 'Our kind artist', 'is', 'near the empty chair', 'affirmative', ('kind',), ('empty',)),
]:
    raw = Path(path).read_bytes()
    original = next(f for f in json.loads(raw)['fixtures'] if f['id'] == fid)
    migrations.append(dict(input=original['input'], source=dict(path=path, id=fid, sha256=hashlib.sha256(raw).hexdigest()), original=original['expected'], reason='Stage33 explicitly licenses finite-be location complement or where complement; historical originals remain frozen; apply separate current-regression migration in 33B/C.', expected=complete(original['input'], category, subject, verb, comp, subject_attrs=sattrs, complement_attrs=cattrs)))

# Unique counting and coverage are checked without evaluating any linguistic output.
normalize = lambda s: re.sub(r'\s+', ' ', s.lower()).strip()
assert len({normalize(f['input']) for f in fixtures}) == len(fixtures)
for category in ['affirmative', 'negative', 'yes-no', 'where']:
    assert sum(f['kind'] == 'correct' and f['category'] == category for f in fixtures) == 12
    assert sum(f['kind'] == 'error' and f['category'] == category for f in fixtures) == 4
assert sum(f['kind'] == 'boundary' for f in fixtures) >= 40
payload = dict(stage=33, status='frozen-human-future-expectations', authoring='Manual grammatical slots; source-only offset arithmetic; no analyzer output used. 48 corrects + 16 errors + 15 additional full controls (one reuses a correct answer) + 46 refusals. Rule IDs fixed before implementation.', fixtures=fixtures)
for name, value in [('stage33-development', payload), ('stage33-migrations', dict(stage=33, status='planned-not-applied', migrations=migrations))]:
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    path = OUT / (name + '.json')
    if path.exists():
        assert path.read_bytes() == raw, 'Frozen answers changed; review explicitly, do not regenerate'
    else:
        path.write_bytes(raw)
        path.with_suffix('.sha256').write_text(hashlib.sha256(raw).hexdigest() + '\n')
print({k: sum(f['kind'] == k for f in fixtures) for k in ['correct', 'error', 'control', 'boundary']})
