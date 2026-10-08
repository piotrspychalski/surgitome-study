# SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
# Analiza odpowiedzi z ankiety SURGITOME-STUDY (tylko biblioteka standardowa Pythona 3.8+).
#
# Wejście: folder (przeszukiwany rekurencyjnie) albo pojedyncze pliki:
#  - .csv — eksport zgłoszeń z panelu Web3Forms (kolumna „Data” = JSON odpowiedzi; inne zgłoszenia, np. „Zgłoś uwagę”, są pomijane),
#  - .json — pobrane z ankiety („Pobierz odpowiedzi”) lub zapisane payloady,
#  - .eml (pojedyncze maile z Web3Forms) i .mbox (eksport skrzynki, np. Google Takeout) — z maila brany jest tylko JSON z pola „data”
#    (adres IP ze stopki Web3Forms jest pomijany).
# Każdy kod liczy się raz: ostatnie zgłoszenie (pole submitted) wygrywa. Kody sprawdzane ze skrótami w src/app/12-badanie-kody.js
# (zgłoszenia z kodem spoza listy, np. testowe, są wykluczane); opcjonalnie codes.csv — liczba zaproszonych (kody z wpisaną osobą).
# Obsługuje schemat 1 (pierwsza wersja: wszyscy oceniali 31 pozycji, status specjalista/rezydent) i 2 (wybór pozycji, role uczestników).
#
# Dostęp: zaproszeni (kod z zaproszenia, sprawdzany ze skrótami) albo otwarty (kod E-… wyliczony w przeglądarce z e-maila; nie da się
# go zweryfikować — przyjmowany, gdy ma właściwą postać). CVI domyślnie tylko z zaproszonych (--cvi-dostep wszyscy — także otwarci);
# chirurdzy z otwartego dostępu raportowani osobno.
# Grupy: CVI liczone w grupie eksperckiej (domyślnie chirurdzy: specjaliści i rezydenci; --grupa-cvi specjalisci | wszyscy);
# pozostałe role (lekarze innych specjalności, studenci, inni profesjonaliści medyczni, pacjenci) — osobno w podgrupach, SUS i przydatność — wszyscy
# oraz w podziale na role. Pozycja niewybrana przez uczestnika nie wchodzi do mianownika (jak „outside my expertise”).
#
# Dziedzina: odpowiedź „inna” z opisem znaczącym „wszystkie obszary” (np. „każda”, „wszystkie”, „ogólna”) → chirurgia ogólna; przed 8.10.2026
# pytanie nie miało podpowiedzi dla rezydentów i chirurgów bez wąskiego profilu. Przekodowanie jawne: raport.md i uczestnicy.csv (oryginał w dziedzina_inna).
#
# Pacjenci i studenci (od 7.10.2026) oceniają zrozumiałość pozycji, nie trafność (ratingMeasure = comprehensibility) — osobno, nigdy w CVI.
#
# Wyniki (folder --out, domyślnie wyniki/): wyniki.csv (pozycje, CVI), podgrupy.csv (I-CVI w podgrupach dziedzin i ról), zrozumialosc.csv,
# uczestnicy.csv (w tym odpowiedzi SUS_1…SUS_10 i przydatność), sus_pozycje.csv (SUS pozycja po pozycji), komentarze.csv, raport.md.
#
# Metody:
#  - I-CVI pozycji = odsetek ocen 3–4 wśród oceniających tę pozycję (bez „outside my expertise”, braków i pozycji niewybranych), z liczbą
#    oceniających; pozycje z < 3 oceniającymi oznaczone. Lynn MR. Nurs Res. 1986;35(6):382-5 (PMID 3640358); Polit DF, Beck CT.
#    Res Nurs Health. 2006;29(5):489-97 (PMID 16977646).
#  - Zmodyfikowana kappa: k* = (I-CVI − Pc) / (1 − Pc), Pc = [N! / (A! (N − A)!)] · 0,5^N (N oceniających, A ocen 3–4);
#    ocena: > 0,74 doskonała, 0,60–0,74 dobra, 0,40–0,59 dostateczna, < 0,40 słaba. Polit DF, Beck CT, Owen SV. Res Nurs Health.
#    2007;30(4):459-67 (PMID 17654487).
#  - S-CVI/Ave = średnia I-CVI; S-CVI/UA = odsetek pozycji z I-CVI = 1 (zgodność wszystkich oceniających daną pozycję).
#    Liczone dla pozycji z ≥ 1 oceniającym (oraz osobno: 29 operacji; pozycje z ≥ 3 oceniającymi).
#  - SUS: (pozycje nieparzyste: x − 1) + (parzyste: 5 − x), suma × 2,5 (0–100); średnia, SD (próby), mediana, IQR (kwartyle metodą
#    „inclusive”, jak statistics.quantiles); pozycje SUS osobno (odpowiedź 1–5 i wkład 0–4). Brooke J. SUS: a "quick and dirty" usability scale. 1996.
#
# Użycie: python3 tools/analiza_ankiety.py odpowiedzi/ [--out wyniki] [--codes codes.csv] [--pomin KOD1,KOD2] [--grupa-cvi chirurdzy] [--bez-weryfikacji]
import argparse, csv, email, email.policy, hashlib, html, json, mailbox, math, os, re, statistics, sys
from collections import Counter, OrderedDict

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ITEMS = [('esoph', 'Esofagektomia', 'Oesophagectomy'), ('dg', 'Resekcja dystalna', 'Distal gastrectomy'), ('tg', 'Gastrektomia całkowita', 'Total gastrectomy'),
         ('gebp', 'Gastroenterostomia omijająca', 'Bypass gastroenterostomy'), ('sleeve', 'Rękawowa resekcja (sleeve)', 'Sleeve gastrectomy'),
         ('rygb', 'Bypass Roux-en-Y (RYGB)', 'Roux-en-Y bypass (RYGB)'), ('oagb', 'Bypass jednozespoleniowy (OAGB)', 'One-anastomosis bypass (OAGB)'),
         ('ds', 'Przełączenie dwunastnicze', 'Duodenal switch'), ('bpd', 'BPD (Scopinaro)', 'BPD (Scopinaro)'), ('whip', 'Whipple (klasyczny)', 'Whipple (classic)'),
         ('pppd', 'Traverso-Longmire (PPPD)', 'Traverso-Longmire (PPPD)'), ('dp', 'Pankreatektomia dystalna', 'Distal pancreatectomy'),
         ('hj', 'Hepatikojejunostomia (Roux-en-Y)', 'Hepaticojejunostomy (Roux-en-Y)'), ('cdd', 'Choledochoduodenostomia', 'Choledochoduodenostomy'),
         ('drain', 'Operacje drenujące (Puestow, Frey)', 'Drainage procedures (Puestow, Frey)'), ('liver', 'Anatomia wątroby', 'Liver anatomy'),
         ('lv-guz', 'Guz: zakres resekcji', 'Tumour: extent of resection'), ('lv-b23', 'Bisegmentektomia II/III', 'Bisegmentectomy II/III'),
         ('lv-rh', 'Prawa hemihepatektomia', 'Right hemihepatectomy'), ('lv-lh', 'Lewa hemihepatektomia', 'Left hemihepatectomy'), ('lv-alpps', 'ALPPS', 'ALPPS'),
         ('oltx', 'Przeszczepienie wątroby', 'Liver transplantation'), ('sb', 'Resekcja jelita cienkiego', 'Small bowel resection'),
         ('zakres', 'Wybór zakresu resekcji', 'Choosing the extent of resection'), ('rh', 'Hemikolektomia prawa', 'Right hemicolectomy'),
         ('lh', 'Hemikolektomia lewa', 'Left hemicolectomy'), ('ar', 'Resekcja odbytnicy', 'Rectal resection'), ('ira', 'Kolektomia całkowita (IRA)', 'Total colectomy (IRA)'),
         ('ipaa', 'Zbiornik J (IPAA)', 'J-pouch (IPAA)'), ('hartmann', 'Hartmann', 'Hartmann'), ('ileo', 'Ileostomia', 'Ileostomy')]
MODULES = {'liver', 'zakres'}
FIELDS = OrderedDict([('colorectal', 'chirurgia kolorektalna'), ('upper', 'górny odcinek i bariatria'), ('hpb', 'HPB i transplantacja'),
                      ('general', 'chirurgia ogólna'), ('other', 'inna')])
FIELD_ALL = re.compile(r'\s*(ka[zż]d[aąey]|wszystk\w*|r[oó][zż]n\w*|(chirurgia\s+)?og[oó]ln\w*|all|any|every\w*|various|mixed|general(\s+surgery)?)\s*[.!]?\s*', re.I)
ROLES = OrderedDict([('surgeon', 'chirurg — specjalista'), ('resident', 'rezydent chirurgii'), ('physician', 'lekarz innej specjalności'),
                     ('student', 'student medycyny'), ('professional', 'inny profesjonalista medyczny'), ('patient', 'pacjent')])
CVI_GROUPS = {'chirurdzy': {'surgeon', 'resident'}, 'specjalisci': {'surgeon'}, 'wszyscy': set(ROLES)}
# część B (przydatność): stwierdzenia ze wszystkich zestawów (zestaw zależy od roli; ten sam klucz = to samo brzmienie)
USE = OrderedDict([('teaching', 'przydatny w nauczaniu studentów i rezydentów'), ('patients', 'przydatny w rozmowie z pacjentem o operacji'),
                   ('imaging', 'ułatwia interpretację TK / endoskopii po operacji'), ('recommend', 'poleciłbym koleżankom i kolegom'),
                   ('myPatients', 'pomaga zrozumieć anatomię pooperacyjną moich pacjentów'),
                   ('learn', 'pomaga mi zrozumieć anatomię po operacjach'), ('exam', 'przydatny w nauce i przed egzaminem'),
                   ('textbook', 'lepiej niż ryciny w podręcznikach'), ('recommendPeers', 'poleciłbym innym studentom'),
                   ('patientAnatomy', 'pomaga zrozumieć przewód pokarmowy pacjenta po operacji'), ('dailyWork', 'korzystał(a)bym w codziennej pracy'),
                   ('understandOp', 'pomógł mi zrozumieć, na czym polega operacja'), ('prepare', 'pomógłby przygotować się do operacji / zrozumieć stan po niej'),
                   ('layIntelligible', 'zrozumiały bez wiedzy medycznej'), ('recommendPatients', 'poleciłbym innym pacjentom')])
SUS_SHORT = ['chciał(a)bym często używać', 'niepotrzebnie skomplikowany (−)', 'łatwy w użyciu', 'potrzebna pomoc techniczna (−)', 'funkcje dobrze zintegrowane',
             'zbyt wiele niespójności (−)', 'szybko się nauczyć', 'uciążliwy (−)', 'czuję się pewnie', 'wiele trzeba się nauczyć (−)']
MARK = '{"study":"SURGITOME-STUDY"'


# ---------- wczytywanie ----------
def payloads_from_text(text):
    """Wszystkie payloady ankiety w tekście (treść maila: część tekstowa lub HTML, komórka CSV)."""
    out, dec = [], json.JSONDecoder()
    for variant in (text, html.unescape(text)):
        clean = variant.replace('\r', '').replace('\n', '')  # JSON.stringify nie wstawia znaków nowej linii; zawinięcia maila — tak
        i = clean.find(MARK)
        while i >= 0:
            try:
                obj, end = dec.raw_decode(clean, i)
                out.append(obj)
                i = clean.find(MARK, end)
            except ValueError:
                i = clean.find(MARK, i + 1)
        if out:
            return out
    return out


def payload_from_cell(v):
    """Komórka eksportu Web3Forms: JSON odpowiedzi albo JSON wszystkich pól z kluczem „data”."""
    try:
        j = json.loads(v)
    except Exception:
        return payloads_from_text(v)
    if isinstance(j, dict) and j.get('study') == 'SURGITOME-STUDY':
        return [j]
    if isinstance(j, dict):
        for k, x in j.items():
            if k.lower() == 'data' and isinstance(x, str):
                return payload_from_cell(x)
    return []


def payloads_from_message(msg):
    found = []
    parts = list(msg.walk()) if msg.is_multipart() else [msg]
    for ctype in ('text/plain', 'text/html'):
        for p in parts:
            if p.get_content_type() != ctype:
                continue
            try:
                txt = p.get_content()
            except Exception:
                raw = p.get_payload(decode=True) or b''
                txt = raw.decode(p.get_content_charset() or 'utf-8', 'replace')
            found += payloads_from_text(txt)
        if found:
            break
    date = msg.get('Date')
    return [(x, date) for x in found]


def load_file(path):
    out, low = [], path.lower()
    if low.endswith('.json'):
        with open(path, encoding='utf-8') as f:
            obj = json.load(f)
        objs = obj if isinstance(obj, list) else [obj]
        out += [(o, path, None) for o in objs if isinstance(o, dict) and o.get('study') == 'SURGITOME-STUDY']
    elif low.endswith('.csv'):
        with open(path, encoding='utf-8-sig', newline='') as f:
            for k, row in enumerate(csv.DictReader(f)):
                cells = [v for key, v in row.items() if key and key.strip().lower() == 'data' and v] or [v for v in row.values() if isinstance(v, str) and MARK in v]
                for v in cells:
                    out += [(p, '%s#%d' % (path, k + 2), row.get('Submitted At')) for p in payload_from_cell(v)]
    elif low.endswith('.eml'):
        with open(path, 'rb') as f:
            msg = email.message_from_binary_file(f, policy=email.policy.default)
        out += [(p, path, d) for p, d in payloads_from_message(msg)]
    elif low.endswith('.mbox'):
        mb = mailbox.mbox(path)
        try:
            for k, m in enumerate(mb):
                msg = email.message_from_bytes(m.as_bytes(), policy=email.policy.default)
                out += [(p, '%s#%d' % (path, k + 1), d) for p, d in payloads_from_message(msg)]
        finally:
            mb.close()
    return out


def load_folder(folder):
    """Lista (payload, źródło, data) ze wszystkich plików folderu (albo z jednego pliku)."""
    paths = [folder] if os.path.isfile(folder) else [os.path.join(r, f) for r, _, fs in os.walk(folder) for f in sorted(fs)]
    out = []
    for path in paths:
        try:
            out += load_file(path)
        except Exception as e:  # uszkodzony plik nie zatrzymuje analizy
            print('UWAGA: pominięto %s (%s)' % (path, e), file=sys.stderr)
    return out


def code_hashes(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        m = re.search(r'STUDY_CODES = (\{.*?\});', f.read(), re.S)
    return json.loads(m.group(1)) if m else None


def valid_code(code, cfg, cache={}):
    if re.fullmatch(r'E-[0-9a-f]{12}', code or ''):   # kod z e-maila (udział otwarty) — bez listy skrótów
        return True
    if code not in cache:
        cache[code] = bool(re.fullmatch(r'[A-HJ-NP-Z2-9]{6}', code or '')) and \
            hashlib.pbkdf2_hmac('sha256', code.encode(), cfg['salt'].encode(), cfg['iter']).hex() in cfg['hashes']
    return cache[code]


def select_latest(entries):
    """Ostatnie zgłoszenie każdego kodu (submitted; przy remisie — numer zgłoszenia). Zwraca (wybrane, zastąpione, duplikaty)."""
    uniq, dup = OrderedDict(), 0
    for p, src, date in entries:
        key = (p.get('code'), p.get('submitted'), p.get('submission'))
        if key in uniq:
            dup += 1
            continue
        uniq[key] = (p, src, date)
    best = OrderedDict()
    for p, src, date in uniq.values():
        c = p.get('code')
        if c not in best or (p.get('submitted') or '', p.get('submission') or 0) > (best[c][0].get('submitted') or '', best[c][0].get('submission') or 0):
            best[c] = (p, src, date)
    return list(best.values()), len(uniq) - len(best), dup


def recode_fields(parts):
    """Dziedzina „inna” z opisem typu „każda” / „wszystkie” → „general” (wada pytania przed 8.10.2026); zwraca kody przekodowanych."""
    out = []
    for p in parts:
        d = p.get('demographics') or {}
        if d.get('field') == 'other' and FIELD_ALL.fullmatch(d.get('fieldOther') or ''):
            d['field'] = 'general'; d['fieldRecoded'] = True; out.append(p.get('code'))
    return out


def access_of(p):
    """Dostęp: zaproszenie albo otwarty (kod z e-maila); starsze odpowiedzi bez pola — z postaci kodu."""
    return p.get('access') or ('open' if re.fullmatch(r'E-[0-9a-f]{12}', p.get('code') or '') else 'invited')


def measure_of(p):
    """Co mierzy ocena pozycji: trafność (eksperci, profesjonaliści) albo zrozumiałość (pacjenci i studenci od wersji 7.10.2026)."""
    return p.get('ratingMeasure') or 'accuracy'


def role_of(p):
    """Rola uczestnika; schemat 1 nie miał ról — status specjalista/rezydent."""
    d = p.get('demographics') or {}
    if d.get('role') in ROLES:
        return d['role']
    return {'specialist': 'surgeon', 'resident': 'resident'}.get(d.get('status'), 'unknown')


def item_rows(p):
    """Pozycje uczestnika: id → (wybrana, ocena 1–4 albo None, poza dziedziną). Schemat 1: wszystkie wybrane."""
    out = {}
    for x in p.get('items', []):
        sel = x.get('selected', True) is not False
        r = x.get('rating')
        out[x.get('id')] = (sel, r if sel and isinstance(r, int) and 1 <= r <= 4 and not x.get('na') else None, sel and bool(x.get('na')))
    return out


# ---------- statystyka ----------
def icvi(ratings):
    """ratings: oceny 1–4 (bez NA). Zwraca słownik N, A, I-CVI, Pc, kappa, ocena kappa."""
    n = len(ratings)
    a = sum(1 for r in ratings if r >= 3)
    if n == 0:
        return {'N': 0, 'A': 0, 'icvi': None, 'pc': None, 'kappa': None, 'kappa_ocena': ''}
    i = a / n
    pc = math.comb(n, a) * 0.5 ** n
    k = (i - pc) / (1 - pc) if pc < 1 else None
    ocena = '' if k is None else 'doskonała' if k > 0.74 else 'dobra' if k >= 0.60 else 'dostateczna' if k >= 0.40 else 'słaba'
    return {'N': n, 'A': a, 'icvi': i, 'pc': pc, 'kappa': k, 'kappa_ocena': ocena}


def scvi(icvis):
    v = [x for x in icvis if x is not None]
    if not v:
        return None, None, 0
    return sum(v) / len(v), sum(1 for x in v if x == 1) / len(v), len(v)


def sus_score(a):
    if not isinstance(a, list) or len(a) != 10 or any(not isinstance(x, int) or not 1 <= x <= 5 for x in a):
        return None
    return sum((x - 1) if i % 2 == 0 else (5 - x) for i, x in enumerate(a)) * 2.5


def describe(xs):
    xs = [x for x in xs if x is not None]
    d = {'n': len(xs), 'srednia': None, 'sd': None, 'mediana': None, 'q1': None, 'q3': None}
    if xs:
        d['srednia'] = float(statistics.mean(xs))
        d['mediana'] = statistics.median(xs)
        if len(xs) > 1:
            d['sd'] = statistics.stdev(xs)
            q = statistics.quantiles(xs, n=4, method='inclusive')
            d['q1'], d['q3'] = q[0], q[2]
        else:
            d['sd'], d['q1'], d['q3'] = 0.0, xs[0], xs[0]
    return d


def fmt(x, nd=2):
    if x is None:
        return '—'
    if isinstance(x, float):
        return ('%.' + str(nd) + 'f') % x
    return str(x)


def minutes_between(a, b):
    from datetime import datetime
    try:
        t0 = datetime.fromisoformat(a.replace('Z', '+00:00')); t1 = datetime.fromisoformat(b.replace('Z', '+00:00'))
        return (t1 - t0).total_seconds() / 60
    except Exception:
        return None


# ---------- analiza ----------
def analyse(parts, cvi_roles=CVI_GROUPS['chirurdzy'], cvi_access=('invited',)):
    """parts: payloady (po wyborze ostatniego zgłoszenia). CVI w grupie ról cvi_roles; podgrupy dziedzin (w tej grupie) i ról (wszyscy)."""
    res = {'items': [], 'fields': OrderedDict(), 'roles': OrderedDict(), 'participants': [], 'comments': [], 'cvi_roles': sorted(cvi_roles)}
    rows = [(p, role_of(p), item_rows(p)) for p in parts]
    acc = [x for x in rows if measure_of(x[0]) == 'accuracy']          # oceny trafności
    und = [x for x in rows if measure_of(x[0]) == 'comprehensibility']  # oceny zrozumiałości — nigdy w CVI
    group = [x for x in acc if x[1] in cvi_roles and access_of(x[0]) in cvi_access]
    open_surg = [x for x in acc if x[1] in ('surgeon', 'resident') and access_of(x[0]) == 'open']   # analiza dodatkowa
    res['comprehension'] = []; res['open_items'] = OrderedDict(); res['n_open_surgeons'] = len(open_surg); res['cvi_access'] = list(cvi_access)
    res['n_group'] = len(group)
    for p, role, its in rows:
        for x in p.get('items', []):
            if (x.get('comment') or '').strip() and x.get('selected', True) is not False:
                res['comments'].append({'kod': p.get('code'), 'rola': role, 'pozycja': x.get('id'), 'ocena': 'NA' if x.get('na') else x.get('rating'), 'komentarz': x['comment'].strip()})
        for k, lab in (('missing', 'czego brakuje'), ('incorrect', 'co jest błędne')):
            t = ((p.get('open') or {}).get(k) or '').strip()
            if t:
                res['comments'].append({'kod': p.get('code'), 'rola': role, 'pozycja': 'pytanie: ' + lab, 'ocena': '', 'komentarz': t})
    for n, (iid, pl, en) in enumerate(ITEMS, 1):
        g = [(p, its.get(iid, (True, None, False))) for p, role, its in group]
        ratings = [r for _, (sel, r, na) in g if r is not None]
        na = sum(1 for _, (sel, r, na_) in g if na_)
        unsel = sum(1 for _, (sel, r, na_) in g if not sel)
        st = icvi(ratings)
        ms = [x.get('ms') for p, _ in g for x in p.get('items', []) if x.get('id') == iid and x.get('selected', True) is not False and isinstance(x.get('ms'), (int, float))]
        seen = [(x.get('variantsSeen'), x.get('variants')) for p, _ in g for x in p.get('items', []) if x.get('id') == iid and x.get('variants') and x.get('selected', True) is not False]
        row = OrderedDict([('n', n), ('id', iid), ('nazwa_pl', pl), ('nazwa_en', en), ('rodzaj', 'moduł' if iid in MODULES else 'operacja'),
                           ('oceniajacych_N', st['N']), ('ocen_3_4', st['A']), ('I_CVI', st['icvi']), ('Pc', st['pc']), ('kappa', st['kappa']),
                           ('kappa_ocena', st['kappa_ocena']), ('ponizej_3_oceniajacych', 'TAK' if st['N'] < 3 else ''),
                           ('I_CVI_ponizej_0_78', 'TAK' if st['icvi'] is not None and st['icvi'] < 0.78 else ''),
                           ('n1', ratings.count(1)), ('n2', ratings.count(2)), ('n3', ratings.count(3)), ('n4', ratings.count(4)),
                           ('n_poza_dziedzina', na), ('n_niewybrane', unsel), ('n_brak_oceny', len(g) - len(ratings) - na - unsel),
                           ('srednia_ocena', statistics.mean(ratings) if ratings else None),
                           ('mediana_czasu_s', statistics.median(ms) / 1000 if ms else None),
                           ('obejrzane_warianty_mediana', statistics.median([a / b for a, b in seen if b]) if seen else None),
                           ('komentarzy', sum(1 for c in res['comments'] if c['pozycja'] == iid))])
        res['items'].append(row)
        for f in FIELDS:  # dziedziny chirurgii — w grupie CVI
            rf = [its.get(iid, (True, None, False))[1] for p, role, its in group if (p.get('demographics') or {}).get('field') == f]
            res['fields'].setdefault(f, {})[iid] = icvi([r for r in rf if r is not None])
        for rl in ROLES:  # role — trafność oceniana przez uczestników danej roli
            rr = [its.get(iid, (True, None, False))[1] for p, role, its in acc if role == rl]
            res['roles'].setdefault(rl, {})[iid] = icvi([r for r in rr if r is not None])
        res['open_items'][iid] = icvi([r for r in (its.get(iid, (True, None, False))[1] for p, role, its in open_surg) if r is not None])
        uu = [(role, its.get(iid, (True, None, False))) for p, role, its in und]
        ur = [r for role, (sel, r, na_) in uu if r is not None]
        crow = OrderedDict([('n', n), ('id', iid), ('nazwa_pl', pl), ('oceniajacych_N', len(ur)), ('ocen_3_4', sum(1 for r in ur if r >= 3)),
                            ('odsetek_3_4', (sum(1 for r in ur if r >= 3) / len(ur)) if ur else None), ('srednia', statistics.mean(ur) if ur else None),
                            ('nie_potrafi_ocenic', sum(1 for role, (sel, r, na_) in uu if na_)), ('niewybrane', sum(1 for role, (sel, r, na_) in uu if not sel))])
        for rl in ('patient', 'student'):
            rr = [r for role, (sel, r, na_) in uu if role == rl and r is not None]
            crow[rl + '_N'] = len(rr); crow[rl + '_odsetek_3_4'] = (sum(1 for r in rr if r >= 3) / len(rr)) if rr else None
        res['comprehension'].append(crow)
    res['scvi_all'] = scvi([r['I_CVI'] for r in res['items']])
    res['scvi_ops'] = scvi([r['I_CVI'] for r in res['items'] if r['rodzaj'] == 'operacja'])
    res['scvi_n3'] = scvi([r['I_CVI'] for r in res['items'] if r['oceniajacych_N'] >= 3])
    res['scvi_fields'] = OrderedDict((f, scvi([v['icvi'] for v in d.values()])) for f, d in res['fields'].items())
    res['scvi_roles'] = OrderedDict((f, scvi([v['icvi'] for v in d.values()])) for f, d in res['roles'].items())
    res['n_comprehension'] = len(und)
    res['scvi_open'] = scvi([v['icvi'] for v in res['open_items'].values()])
    cv = [c['odsetek_3_4'] for c in res['comprehension'] if c['odsetek_3_4'] is not None]
    res['comprehension_ave'] = (sum(cv) / len(cv), len(cv)) if cv else (None, 0)
    # uczestnicy
    for p, role, its in rows:
        d = p.get('demographics') or {}
        s = sus_score(p.get('sus'))
        u = p.get('usefulness') or {}
        sus = p.get('sus') if isinstance(p.get('sus'), list) and len(p['sus']) == 10 else [None] * 10
        res['participants'].append(OrderedDict([
            ('kod', p.get('code')), ('schemat', p.get('schema')), ('zgloszenie_nr', p.get('submission')), ('wyslano', p.get('submitted')), ('start', p.get('started')),
            ('minuty_od_startu', minutes_between(p.get('started') or '', p.get('submitted') or '')), ('minuty_aktywne', (p.get('activeMs') or 0) / 60000),
            ('wersja_sha', (p.get('version') or {}).get('sha')), ('jezyk', p.get('lang')), ('urzadzenie', (p.get('device') or {}).get('type')),
            ('dostep', access_of(p)), ('rola', role), ('miara_oceny', measure_of(p)), ('w_grupie_cvi', role in cvi_roles and measure_of(p) == 'accuracy' and access_of(p) in cvi_access), ('zestaw_przydatnosci', p.get('usefulnessSet') or 'surgeon'), ('kraj', d.get('country')), ('dziedzina', d.get('field')), ('dziedzina_inna', d.get('fieldOther')), ('dziedzina_przekodowana', bool(d.get('fieldRecoded'))),
            ('rok_rezydentury', d.get('residentYear')), ('lata_od_specjalizacji', d.get('yearsSinceSpec')), ('resekcje_rocznie', d.get('resectionsPerYear')),
            ('specjalnosc', d.get('specialty')), ('specjalnosc_inna', d.get('specialtyOther')), ('rok_studiow', d.get('studyYear')),
            ('zawod', d.get('profession')), ('zawod_inny', d.get('professionOther')), ('wczesniej_uzywal', d.get('usedBefore')),
            ('wybranych_pozycji', sum(1 for v in its.values() if v[0])), ('ocenionych_pozycji', sum(1 for v in its.values() if v[1] is not None or v[2])),
            ('zakonczyl_wczesniej', p.get('finishedEarly')), ('SUS', s)] + [('SUS_%d' % (i + 1), sus[i]) for i in range(10)]
            + [('przydatnosc_' + k, u.get(k)) for k in USE]))
    P = res['participants']
    res['sus'] = describe([x['SUS'] for x in P])
    res['sus_roles'] = OrderedDict((rl, describe([x['SUS'] for x in P if x['rola'] == rl])) for rl in ROLES)
    res['sus_items'] = []
    for i in range(10):
        v = [x['SUS_%d' % (i + 1)] for x in P if isinstance(x['SUS_%d' % (i + 1)], int)]
        contrib = [(a - 1) if i % 2 == 0 else (5 - a) for a in v]
        dd, dc = describe(v), describe(contrib)
        res['sus_items'].append(OrderedDict([('pozycja', i + 1), ('opis', SUS_SHORT[i]), ('n', dd['n']), ('srednia_odpowiedz', dd['srednia']),
                                             ('mediana_odpowiedz', dd['mediana']), ('srednia_wklad_0_4', dc['srednia'])]))
    res['use'] = OrderedDict()
    for k in USE:
        v = [x['przydatnosc_' + k] for x in P if isinstance(x['przydatnosc_' + k], int)]
        dd = describe(v); dd['zgoda_4_5'] = (sum(1 for x in v if x >= 4) / len(v)) if v else None
        res['use'][k] = dd
    res['time_total'] = describe([x['minuty_od_startu'] for x in P])
    res['time_active'] = describe([x['minuty_aktywne'] for x in P])
    return res


def counts(parts, key, label=None):
    c = Counter(str((p.get('demographics') or {}).get(key)) for p in parts)
    return ', '.join('%s: %d' % ((label or {}).get(k, k), v) for k, v in c.most_common())


def write_outputs(res, parts, out, meta):
    os.makedirs(out, exist_ok=True)
    def wcsv(name, rows):
        with open(os.path.join(out, name), 'w', newline='', encoding='utf-8') as f:
            if not rows:
                f.write('')
                return
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            for r in rows:
                w.writerow({k: (('%.4f' % v) if isinstance(v, float) else v) for k, v in r.items()})
    wcsv('wyniki.csv', res['items'])
    sub = []
    for iid, pl, en in ITEMS:
        r = OrderedDict([('id', iid), ('nazwa_pl', pl)])
        for f in FIELDS:
            s = res['fields'][f][iid]; r['dziedzina_' + f + '_N'] = s['N']; r['dziedzina_' + f + '_I_CVI'] = s['icvi']
        for rl in ROLES:
            s = res['roles'][rl][iid]; r['rola_' + rl + '_N'] = s['N']; r['rola_' + rl + '_I_CVI'] = s['icvi']
        s = res['open_items'][iid]; r['chirurdzy_otwarci_N'] = s['N']; r['chirurdzy_otwarci_I_CVI'] = s['icvi']
        sub.append(r)
    wcsv('podgrupy.csv', sub)
    wcsv('uczestnicy.csv', res['participants'])
    wcsv('sus_pozycje.csv', res['sus_items'])
    wcsv('zrozumialosc.csv', res['comprehension'])
    wcsv('komentarze.csv', res['comments'])
    n, P = len(parts), res['participants']
    L = ['# SURGITOME-STUDY — wyniki ankiety', '',
         'Zgłoszeń wczytanych: %d; po usunięciu duplikatów i wyborze ostatniego zgłoszenia każdego kodu — uczestnicy: **%d**.' % (meta['loaded'], n)]
    if meta.get('superseded'):
        L.append('Zgłoszenia zastąpione późniejszym tego samego kodu: %d.' % meta['superseded'])
    if meta.get('invalid'):
        L.append('Wykluczone (kod spoza listy, np. testowy): %s.' % ', '.join(sorted(meta['invalid'])))
    if meta.get('skipped'):
        L.append('Wykluczone na życzenie (--pomin): %s.' % ', '.join(sorted(meta['skipped'])))
    if meta.get('recoded'):
        L.append('Przekodowano dziedzinę „inna” → „chirurgia ogólna” (opis oznaczający wszystkie obszary, np. „każda”; pytanie bez podpowiedzi przed 8.10.2026): %s.' % ', '.join(sorted(meta['recoded'])))
    na = Counter(access_of(p) for p in parts)
    L.append('Dostęp: z zaproszenia %d, otwarty (kod z e-maila) %d.' % (na.get('invited', 0), na.get('open', 0)))
    if meta.get('invited') is not None:
        L.append('Zaproszeni (kody z wpisaną osobą w codes.csv): %d; odsetek uczestnictwa zaproszonych: %s.' % (meta['invited'], fmt(na.get('invited', 0) / meta['invited'] * 100 if meta['invited'] else None, 1) + ' %'))
    if meta.get('unassigned'):
        L.append('UWAGA: zgłoszenia z kodów bez przypisanej osoby w codes.csv: %s.' % ', '.join(sorted(meta['unassigned'])))
    shas = Counter((p.get('version') or {}).get('sha') for p in parts)
    sch = Counter(p.get('schema') for p in parts)
    L += ['Wersja aplikacji (sha) w odpowiedziach: ' + ', '.join('%s (%d)' % (k, v) for k, v in shas.items()) + '; schemat odpowiedzi: ' + ', '.join('%s (%d)' % kv for kv in sch.items()), '',
          '## Uczestnicy', '',
          '- rola: ' + ', '.join('%s: %d' % (ROLES.get(k, k), v) for k, v in Counter(x['rola'] for x in P).most_common()),
          '- kraj: ' + counts(parts, 'country'),
          '- dziedzina (chirurdzy): ' + counts([p for p in parts if role_of(p) in ('surgeon', 'resident')], 'field', FIELDS),
          '- lata od specjalizacji (chirurdzy specjaliści): ' + counts([p for p in parts if role_of(p) == 'surgeon'], 'yearsSinceSpec'),
          '- rok rezydentury: ' + counts([p for p in parts if role_of(p) == 'resident'], 'residentYear'),
          '- resekcje przewodu pokarmowego rocznie (chirurdzy): ' + counts([p for p in parts if role_of(p) in ('surgeon', 'resident')], 'resectionsPerYear'),
          '- specjalność (lekarze innych specjalności): ' + counts([p for p in parts if role_of(p) == 'physician'], 'specialty'),
          '- rok studiów: ' + counts([p for p in parts if role_of(p) == 'student'], 'studyYear'),
          '- zawód (inni profesjonaliści medyczni): ' + counts([p for p in parts if role_of(p) == 'professional'], 'profession'),
          '- wcześniej używał(a) SURGITOME: ' + counts(parts, 'usedBefore', {'True': 'tak', 'False': 'nie'}),
          '- język ankiety: ' + ', '.join('%s: %d' % kv for kv in Counter(p.get('lang') for p in parts).most_common()),
          '- urządzenie: ' + ', '.join('%s: %d' % kv for kv in Counter((p.get('device') or {}).get('type') for p in parts).most_common()),
          '- wybrane pozycje (z 31): mediana %s; ocenione: mediana %s; zakończone wcześniej: %d' % (
              fmt(statistics.median([x['wybranych_pozycji'] for x in P]) if P else None, 0), fmt(statistics.median([x['ocenionych_pozycji'] for x in P]) if P else None, 0),
              sum(1 for x in P if x['zakonczyl_wczesniej'])),
          '- czas od zgody do wysłania [min]: mediana %s (IQR %s–%s); czas aktywny w atlasie [min]: mediana %s (IQR %s–%s)' % (
              fmt(res['time_total']['mediana'], 1), fmt(res['time_total']['q1'], 1), fmt(res['time_total']['q3'], 1),
              fmt(res['time_active']['mediana'], 1), fmt(res['time_active']['q1'], 1), fmt(res['time_active']['q3'], 1)), '',
          '## Trafność treści (CVI)', '',
          'Grupa ekspercka: %s, dostęp: %s — uczestników: %d. Pozycje niewybrane i „poza moją dziedziną” nie wchodzą do mianownika.' % (', '.join(ROLES[r] for r in res['cvi_roles']), ' i '.join({'invited': 'z zaproszenia', 'open': 'otwarty'}[a] for a in res['cvi_access']), res['n_group']),
          'S-CVI/Ave = %s, S-CVI/UA = %s (pozycje z ≥ 1 oceniającym: %d z 31).' % (fmt(res['scvi_all'][0], 3), fmt(res['scvi_all'][1], 3), res['scvi_all'][2]),
          'Same operacje (29): S-CVI/Ave = %s, S-CVI/UA = %s. Pozycje z ≥ 3 oceniającymi (%d): S-CVI/Ave = %s, S-CVI/UA = %s.' % (
              fmt(res['scvi_ops'][0], 3), fmt(res['scvi_ops'][1], 3), res['scvi_n3'][2], fmt(res['scvi_n3'][0], 3), fmt(res['scvi_n3'][1], 3)), '',
          '| # | Pozycja | N | 3–4 | I-CVI | k* | ocena k* | 1/2/3/4 | poza dziedz. | niewybrana | uwagi |', '|---|---|---|---|---|---|---|---|---|---|---|']
    for r in res['items']:
        flags = []
        if r['ponizej_3_oceniajacych']: flags.append('< 3 oceniających')
        if r['I_CVI_ponizej_0_78']: flags.append('I-CVI < 0,78')
        L.append('| %d | %s%s | %d | %d | %s | %s | %s | %d/%d/%d/%d | %d | %d | %s |' % (
            r['n'], r['nazwa_pl'], ' (moduł)' if r['rodzaj'] == 'moduł' else '', r['oceniajacych_N'], r['ocen_3_4'], fmt(r['I_CVI']), fmt(r['kappa']),
            r['kappa_ocena'], r['n1'], r['n2'], r['n3'], r['n4'], r['n_poza_dziedzina'], r['n_niewybrane'], '; '.join(flags)))
    L += ['', 'S-CVI/Ave w podgrupach dziedzin (grupa ekspercka): ' + ('; '.join('%s: %s (pozycji %d)' % (FIELDS[f], fmt(v[0], 3), v[2]) for f, v in res['scvi_fields'].items() if v[2]) or '—'),
          'Chirurdzy z otwartego dostępu (analiza dodatkowa, poza CVI głównym): %d; S-CVI/Ave = %s, S-CVI/UA = %s (pozycji %d); I-CVI pozycji: podgrupy.csv.' % (
              res['n_open_surgeons'], fmt(res['scvi_open'][0], 3), fmt(res['scvi_open'][1], 3), res['scvi_open'][2]),
          'S-CVI/Ave w podziale na role (oceny trafności): ' + ('; '.join('%s: %s (pozycji %d)' % (ROLES[f], fmt(v[0], 3), v[2]) for f, v in res['scvi_roles'].items() if v[2]) or '—') + '. I-CVI pozycji w podgrupach: podgrupy.csv.', '',
          '## Zrozumiałość (pacjenci i studenci)', '',
          'Uczestników oceniających zrozumiałość: %d (poza CVI). Średni odsetek ocen 3–4 („w większości” / „w pełni zrozumiałe”): %s (pozycji %d); szczegóły: zrozumialosc.csv.' % (
              res['n_comprehension'], fmt(res['comprehension_ave'][0] * 100 if res['comprehension_ave'][0] is not None else None, 0) + ' %', res['comprehension_ave'][1]), '',
          '## Użyteczność (SUS)', '',
          'Wszyscy: n = %d; średnia %s (SD %s); mediana %s (IQR %s–%s).' % (res['sus']['n'], fmt(res['sus']['srednia'], 1), fmt(res['sus']['sd'], 1),
                                                                           fmt(res['sus']['mediana'], 1), fmt(res['sus']['q1'], 1), fmt(res['sus']['q3'], 1)),
          'W podziale na role: ' + ('; '.join('%s: n = %d, średnia %s (SD %s)' % (ROLES[rl], d['n'], fmt(d['srednia'], 1), fmt(d['sd'], 1)) for rl, d in res['sus_roles'].items() if d['n']) or '—') + '.', '',
          '| SUS | Stwierdzenie | n | średnia odpowiedź 1–5 | mediana | średni wkład 0–4 |', '|---|---|---|---|---|---|']
    for s in res['sus_items']:
        L.append('| %d | %s | %d | %s | %s | %s |' % (s['pozycja'], s['opis'], s['n'], fmt(s['srednia_odpowiedz'], 2), fmt(s['mediana_odpowiedz'], 1), fmt(s['srednia_wklad_0_4'], 2)))
    L += ['', 'Odpowiedzi SUS każdego uczestnika: uczestnicy.csv (SUS_1…SUS_10); pozycje parzyste są sformułowane negatywnie (wkład = 5 − odpowiedź).', '',
          '## Przydatność (Likert 1–5; zestaw stwierdzeń zależy od roli)', '', '| Stwierdzenie | role | n | mediana (IQR) | średnia | zgoda 4–5 |', '|---|---|---|---|---|---|']
    for k, lab in USE.items():
        d = res['use'][k]
        if not d['n']:
            continue
        rl = ', '.join(sorted({ROLES.get(x['rola'], x['rola']) for x in P if isinstance(x.get('przydatnosc_' + k), int)}))
        L.append('| %s | %s | %d | %s (%s–%s) | %s | %s |' % (lab, rl, d['n'], fmt(d['mediana'], 1), fmt(d['q1'], 1), fmt(d['q3'], 1), fmt(d['srednia'], 2),
                                                             fmt(d['zgoda_4_5'] * 100 if d['zgoda_4_5'] is not None else None, 0) + ' %'))
    L += ['', 'Komentarze do pozycji i odpowiedzi na pytania otwarte: komentarze.csv (%d).' % len(res['comments']), '',
          'Metody: Lynn 1986 (PMID 3640358); Polit i Beck 2006 (PMID 16977646); Polit, Beck i Owen 2007 (PMID 17654487); raportowanie wg CHERRIES (Eysenbach 2004, PMID 15471760).']
    with open(os.path.join(out, 'raport.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


def main(argv=None):
    ap = argparse.ArgumentParser(description='Analiza ankiety SURGITOME-STUDY')
    ap.add_argument('folder'); ap.add_argument('--out', default=os.path.join(R, 'wyniki'))
    ap.add_argument('--codes', default=os.path.join(R, 'codes.csv')); ap.add_argument('--kody', default=os.path.join(R, 'src', 'app', '12-badanie-kody.js'))
    ap.add_argument('--pomin', default='', help='kody do wykluczenia, np. pilotaż: ABC234,XYZ567,E-0123456789ab')
    ap.add_argument('--grupa-cvi', default='chirurdzy', choices=sorted(CVI_GROUPS), help='grupa ekspercka dla CVI (domyślnie chirurdzy: specjaliści i rezydenci)')
    ap.add_argument('--cvi-dostep', default='zaproszeni', choices=['zaproszeni', 'wszyscy'], help='CVI tylko z zaproszonych (domyślnie) albo także z otwartego dostępu')
    ap.add_argument('--bez-weryfikacji', action='store_true', help='nie sprawdzaj kodów ze skrótami (tylko testy)')
    a = ap.parse_args(argv)
    entries = load_folder(a.folder)
    meta = {'loaded': len(entries), 'invalid': set(), 'skipped': set()}
    skip = {x.strip().upper() for x in a.pomin.split(',') if x.strip()}
    cfg = None if a.bez_weryfikacji else code_hashes(a.kody)
    keep = []
    for p, src, d in entries:
        c = p.get('code')
        if str(c or '').upper() in skip:   # bez względu na wielkość liter (kody otwarte E-… mają małe litery)
            meta['skipped'].add(c); continue
        if cfg is not None and not valid_code(c, cfg):
            meta['invalid'].add(str(c)); continue
        keep.append((p, src, d))
    chosen, meta['superseded'], meta['duplicates'] = select_latest(keep)
    parts = [p for p, _, _ in chosen]
    meta['recoded'] = recode_fields(parts)
    if os.path.exists(a.codes):
        with open(a.codes, newline='', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        assigned = {r['kod'] for r in rows if (r.get('osoba') or '').strip()}
        meta['invited'] = len(assigned)
        meta['unassigned'] = {p.get('code') for p in parts if access_of(p) == 'invited' and p.get('code') not in assigned}
    res = analyse(parts, CVI_GROUPS[a.grupa_cvi], ('invited',) if a.cvi_dostep == 'zaproszeni' else ('invited', 'open'))
    write_outputs(res, parts, a.out, meta)
    print('uczestników: %d (grupa CVI: %d) | S-CVI/Ave %s | S-CVI/UA %s | SUS średnia %s → %s' % (
        len(parts), res['n_group'], fmt(res['scvi_all'][0], 3), fmt(res['scvi_all'][1], 3), fmt(res['sus']['srednia'], 1), a.out))
    return res, meta


if __name__ == '__main__':
    main()
