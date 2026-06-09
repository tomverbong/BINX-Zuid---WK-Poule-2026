import json
import re
import shutil
import datetime as dt
from pathlib import Path
from openpyxl import load_workbook
EXCEL_FILE = 'WK2026_poule_beheer.xlsx'
SRC_DIR = Path('src')
SITE_DIR = Path('site')
months = {'januari':1,'februari':2,'maart':3,'april':4,'mei':5,'juni':6,'juli':7,'augustus':8,'september':9,'oktober':10,'november':11,'december':12}
def time_to_str(v):
    if v is None: return ''
    if isinstance(v, dt.datetime): return v.strftime('%H:%M')
    if isinstance(v, dt.time): return v.strftime('%H:%M')
    return str(v)
def parse_dutch_date(text):
    if not isinstance(text, str): return None
    m = re.search(r'(\d{1,2})\s+([a-zé]+)\s+(\d{4})', text.lower())
    if not m: return None
    day = int(m.group(1)); month = months.get(m.group(2)); year = int(m.group(3))
    if not month: return None
    return dt.date(year, month, day)
def extract_data(excel_file):
    wb = load_workbook(excel_file, data_only=True)
    ws = wb['Stand']; stand=[]; participants=[]
    for r in range(3, ws.max_row + 1):
        name = ws.cell(r,2).value
        if not name: continue
        rank = ws.cell(r,1).value
        stand.append({'rang': int(rank) if isinstance(rank,(int,float)) and rank is not None else rank, 'deelnemer': str(name), 'punten_wedstrijden': ws.cell(r,3).value or 0, 'punten_bonus': ws.cell(r,4).value or 0, 'totaal': ws.cell(r,5).value or 0})
        participants.append(str(name))
    ws = wb['Deadlines']; deadlines=[]
    for r in range(3, ws.max_row + 1):
        onderdeel = ws.cell(r,1).value; datum = ws.cell(r,2).value
        if onderdeel: deadlines.append({'onderdeel': str(onderdeel), 'datum': str(datum) if datum is not None else ''})
    ws = wb['Puntentelling']; rules=[]
    for r in range(3, ws.max_row + 1):
        onderdeel = ws.cell(r,1).value; punten = ws.cell(r,2).value; voorbeeld = ws.cell(r,3).value
        if onderdeel: rules.append({'onderdeel': str(onderdeel), 'punten': punten, 'voorbeeld': '' if voorbeeld is None else str(voorbeeld)})
    ws = wb['Bonus_beheer']; bonus_participants=[]
    for c in range(4, ws.max_column + 1, 2):
        name = ws.cell(1,c).value
        if name: bonus_participants.append((c, str(name)))
    bonus_questions=[]
    for r in range(3, ws.max_row + 1):
        nr = ws.cell(r,1).value; vraag = ws.cell(r,2).value; correct = ws.cell(r,3).value
        if vraag == 'Totaal (bonus)': continue
        if vraag:
            answers={}; points={}
            for c, name in bonus_participants:
                answers[name] = ws.cell(r,c).value; points[name] = ws.cell(r,c+1).value
            bonus_questions.append({'nr': nr, 'vraag': str(vraag), 'correct_antwoord': '' if correct is None else str(correct), 'antwoorden': answers, 'punten': points})
    bonus_totals = {name: ws.cell(ws.max_row, c+1).value or 0 for c, name in bonus_participants}
    ws = wb['Wedstrijden_beheer']; wedstrijd_participants=[]
    for c in range(5, ws.max_column + 1, 2):
        name = ws.cell(1,c).value
        if name and not str(name).startswith('_'): wedstrijd_participants.append((c, str(name)))
    stage=''; date_label=''; date_iso=''; matches=[]; phase_keywords={'Groepsfase','Zestiende finales','Achtste finales','Kwartfinales','Halve finales','Troostfinale','Finale','(Verliezers)finale','Verliezersfinale'}
    for r in range(3, ws.max_row + 1):
        a = ws.cell(r,1).value; b = ws.cell(r,2).value; c = ws.cell(r,3).value; d = ws.cell(r,4).value
        if isinstance(a,str) and b is None and c is None and d is None:
            if a.strip() in phase_keywords or a.strip().lower() in {p.lower() for p in phase_keywords}: stage = a.strip()
            else:
                date_label = a.strip(); parsed = parse_dutch_date(date_label); date_iso = parsed.isoformat() if parsed else ''
            continue
        if b is not None and d is not None:
            predictions={}; points={}
            for col,name in wedstrijd_participants:
                predictions[name]=ws.cell(r,col).value; points[name]=ws.cell(r,col+1).value
            matches.append({'fase': stage, 'datum': date_label, 'datum_iso': date_iso, 'tijd': time_to_str(a), 'thuis': str(b), 'uitslag': '' if c is None else str(c), 'uit': str(d), 'predictions': predictions, 'points': points})
    return {'meta': {'titel': 'WK 2026 Poule – live', 'bronbestand': EXCEL_FILE, 'laatst_ververst': dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'layout':'excel-vergelijking', 'deployment':'github-pages-github-actions'}, 'summary': {'deelnemers': len(participants), 'wedstrijden': len(matches), 'ingevulde_uitslagen': sum(1 for m in matches if m['uitslag']), 'ingevulde_voorspellingen': sum(1 for m in matches for pred in m['predictions'].values() if pred not in (None, '')), 'fasen': sorted({m['fase'] for m in matches if m['fase']})}, 'participants': participants, 'stand': stand, 'deadlines': deadlines, 'rules': rules, 'bonus_questions': bonus_questions, 'bonus_totals': bonus_totals, 'matches': matches}
def build_site():
    if not Path(EXCEL_FILE).exists(): raise FileNotFoundError(f'{EXCEL_FILE} niet gevonden. Plaats het Excelbestand in de root van de repository.')
    data = extract_data(EXCEL_FILE)
    SITE_DIR.mkdir(exist_ok=True)
    for filename in ['index.html','style.css','app.js']:
        shutil.copy2(SRC_DIR / filename, SITE_DIR / filename)
    with open(SITE_DIR / 'data.js','w',encoding='utf-8') as f:
        f.write('window.POULE_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
    print('Site bijgewerkt in ./site')
if __name__ == '__main__': build_site()
