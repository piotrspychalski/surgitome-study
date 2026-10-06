# SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
# Analiza odpowiedzi z ankiety eksperckiej SURGITOME-STUDY (tylko biblioteka standardowa Pythona 3.8+).
#
# Wejście: folder z plikami .json (pobrane z ankiety lub zapisane payloady), .eml (pojedyncze maile z Web3Forms) i .mbox (eksport skrzynki,
# np. Google Takeout) — przeszukiwany rekurencyjnie. Z maili brany jest wyłącznie JSON z pola „data” (adres IP ze stopki Web3Forms jest pomijany).
# Każdy kod liczy się raz: ostatnie zgłoszenie (pole submitted) wygrywa. Kody sprawdzane ze skrótami w src/app/12-badanie-kody.js
# (zgłoszenia z kodem spoza listy, np. testowe, są wykluczane); opcjonalnie codes.csv — liczba zaproszonych (kody z wpisaną osobą).
#
# Wyniki (folder --out, domyślnie wyniki/): wyniki.csv (pozycje), podgrupy.csv (I-CVI w podgrupach dziedzin), uczestnicy.csv,
# komentarze.csv, raport.md.
#
# Metody:
#  - I-CVI pozycji = odsetek ocen 3–4 wśród oceniających tę pozycję (bez „outside my expertise” i bez braków), z liczbą oceniających;
#    pozycje z < 3 oceniającymi oznaczone. Lynn MR. Nurs Res. 1986;35(6):382-5 (PMID 3640358); Polit DF, Beck CT. Res Nurs Health.
#    2006;29(5):489-97 (PMID 16977646).
#  - Zmodyfikowana kappa: k* = (I-CVI − Pc) / (1 − Pc), Pc = [N! / (A! (N − A)!)] · 0,5^N (N oceniających, A ocen 3–4);
#    ocena: > 0,74 doskonała, 0,60–0,74 dobra, 0,40–0,59 dostateczna, < 0,40 słaba. Polit DF, Beck CT, Owen SV. Res Nurs Health.
#    2007;30(4):459-67 (PMID 17654487).
#  - S-CVI/Ave = średnia I-CVI; S-CVI/UA = odsetek pozycji z I-CVI = 1 (zgodność wszystkich oceniających daną pozycję).
#    Liczone dla pozycji z ≥ 1 oceniającym (oraz osobno: 29 operacji; pozycje z ≥ 3 oceniającymi).
#  - SUS: (pozycje nieparzyste: x − 1) + (parzyste: 5 − x), suma × 2,5 (0–100); średnia, SD (próby), mediana, IQR (kwartyle metodą
#    „inclusive”, jak statistics.quantiles). Brooke J. SUS: a "quick and dirty" usability scale. 1996.
#
# Użycie: python3 tools/analiza_ankiety.py odpowiedzi/ [--out wyniki] [--codes codes.csv] [--pomin KOD1,KOD2] [--bez-weryfikacji]
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
USE = OrderedDict([('teaching', 'nauczanie studentów i rezydentów'), ('patients', 'rozmowa z pacjentem'), ('imaging', 'interpretacja TK / endoskopii'),
                   ('recommend', 'poleciłbym kolegom')])
MARK = '{"study":"SURGITOME-STUDY"'


# ---------- wczytywanie ----------
def payloads_from_text(text):
    """Wszystkie payloady ankiety w tekście (treść maila: część tekstowa lub HTML)."""
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


def load_folder(folder):
    """Lista (payload, źródło, data maila) ze wszystkich plików folderu."""
    out = []
    for root, _, files in os.walk(folder):
        for fn in sorted(files):
            path = os.path.join(root, fn)
            low = fn.lower()
            try:
                if low.endswith('.json'):
                    with open(path, encoding='utf-8') as f:
                        obj = json.load(f)
                    objs = obj if isinstance(obj, list) else [obj]
                    out += [(o, path, None) for o in objs if isinstance(o, dict) and o.get('study') == 'SURGITOME-STUDY']
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
        d['srednia'] = statistics.mean(xs)
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
def analyse(parts):
    """parts: lista payloadów (po wyborze ostatniego zgłoszenia). Zwraca słownik z wynikami."""
    res = {'items': [], 'fields': OrderedDict(), 'participants': [], 'comments': []}
    by_item = {i[0]: [] for i in ITEMS}
    for p in parts:
        its = {x.get('id'): x for x in p.get('items', [])}
        for iid, _, _ in ITEMS:
            x = its.get(iid) or {}
            by_item[iid].append((p, x))
            if (x.get('comment') or '').strip():
                res['comments'].append({'kod': p.get('code'), 'pozycja': iid, 'ocena': 'NA' if x.get('na') else x.get('rating'), 'komentarz': x['comment'].strip()})
        for k, lab in (('missing', 'czego brakuje'), ('incorrect', 'co jest błędne')):
            t = ((p.get('open') or {}).get(k) or '').strip()
            if t:
                res['comments'].append({'kod': p.get('code'), 'pozycja': 'pytanie: ' + lab, 'ocena': '', 'komentarz': t})
    for n, (iid, pl, en) in enumerate(ITEMS, 1):
        rows = by_item[iid]
        ratings = [x['rating'] for _, x in rows if isinstance(x.get('rating'), int) and 1 <= x['rating'] <= 4 and not x.get('na')]
        na = sum(1 for _, x in rows if x.get('na'))
        st = icvi(ratings)
        ms = [x.get('ms') for _, x in rows if isinstance(x.get('ms'), (int, float))]
        seen = [(x.get('variantsSeen'), x.get('variants')) for _, x in rows if x.get('variants')]
        row = OrderedDict([('n', n), ('id', iid), ('nazwa_pl', pl), ('nazwa_en', en), ('rodzaj', 'moduł' if iid in MODULES else 'operacja'),
                           ('oceniajacych_N', st['N']), ('ocen_3_4', st['A']), ('I_CVI', st['icvi']), ('Pc', st['pc']), ('kappa', st['kappa']),
                           ('kappa_ocena', st['kappa_ocena']), ('ponizej_3_oceniajacych', 'TAK' if st['N'] < 3 else ''),
                           ('I_CVI_ponizej_0_78', 'TAK' if st['icvi'] is not None and st['icvi'] < 0.78 else ''),
                           ('n1', ratings.count(1)), ('n2', ratings.count(2)), ('n3', ratings.count(3)), ('n4', ratings.count(4)),
                           ('n_poza_dziedzina', na), ('n_brak_oceny', len(rows) - len(ratings) - na),
                           ('srednia_ocena', statistics.mean(ratings) if ratings else None),
                           ('mediana_czasu_s', statistics.median(ms) / 1000 if ms else None),
                           ('obejrzane_warianty_mediana', statistics.median([a / b for a, b in seen if b]) if seen else None),
                           ('komentarzy', sum(1 for _, x in rows if (x.get('comment') or '').strip()))])
        res['items'].append(row)
        for f in FIELDS:
            rf = [x['rating'] for p, x in rows if (p.get('demographics') or {}).get('field') == f and isinstance(x.get('rating'), int) and 1 <= x['rating'] <= 4 and not x.get('na')]
            res['fields'].setdefault(f, {})[iid] = icvi(rf)
    ic = [r['I_CVI'] for r in res['items']]
    res['scvi_all'] = scvi(ic)
    res['scvi_ops'] = scvi([r['I_CVI'] for r in res['items'] if r['rodzaj'] == 'operacja'])
    res['scvi_n3'] = scvi([r['I_CVI'] for r in res['items'] if r['oceniajacych_N'] >= 3])
    res['scvi_fields'] = OrderedDict((f, scvi([v['icvi'] for v in d.values()])) for f, d in res['fields'].items())
    # uczestnicy
    for p in parts:
        d = p.get('demographics') or {}
        s = sus_score(p.get('sus'))
        u = p.get('usefulness') or {}
        rated = sum(1 for x in p.get('items', []) if x.get('rating') or x.get('na'))
        res['participants'].append(OrderedDict([
            ('kod', p.get('code')), ('zgloszenie_nr', p.get('submission')), ('wyslano', p.get('submitted')), ('start', p.get('started')),
            ('minuty_od_startu', minutes_between(p.get('started') or '', p.get('submitted') or '')), ('minuty_aktywne', (p.get('activeMs') or 0) / 60000),
            ('wersja_sha', (p.get('version') or {}).get('sha')), ('jezyk', p.get('lang')), ('urzadzenie', (p.get('device') or {}).get('type')),
            ('kraj', d.get('country')), ('dziedzina', d.get('field')), ('dziedzina_inna', d.get('fieldOther')), ('status', d.get('status')),
            ('rok_rezydentury', d.get('residentYear')), ('lata_od_specjalizacji', d.get('yearsSinceSpec')), ('resekcje_rocznie', d.get('resectionsPerYear')),
            ('wczesniej_uzywal', d.get('usedBefore')), ('ocenionych_pozycji', rated), ('zakonczyl_wczesniej', p.get('finishedEarly')),
            ('SUS', s)] + [('SUS_%d' % (i + 1), (p.get('sus') or [None] * 10)[i] if isinstance(p.get('sus'), list) and len(p['sus']) == 10 else None) for i in range(10)]
            + [('przydatnosc_' + k, u.get(k)) for k in USE]))
    res['sus'] = describe([x['SUS'] for x in res['participants']])
    res['use'] = OrderedDict()
    for k in USE:
        v = [x['przydatnosc_' + k] for x in res['participants'] if isinstance(x['przydatnosc_' + k], int)]
        dd = describe(v); dd['zgoda_4_5'] = (sum(1 for x in v if x >= 4) / len(v)) if v else None
        res['use'][k] = dd
    res['time_total'] = describe([x['minuty_od_startu'] for x in res['participants']])
    res['time_active'] = describe([x['minuty_aktywne'] for x in res['participants']])
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
            s = res['fields'][f][iid]
            r[f + '_N'] = s['N']; r[f + '_I_CVI'] = s['icvi']
        sub.append(r)
    wcsv('podgrupy.csv', sub)
    wcsv('uczestnicy.csv', res['participants'])
    wcsv('komentarze.csv', res['comments'])
    n = len(parts)
    L = ['# SURGITOME-STUDY — wyniki ankiety eksperckiej', '',
         'Zgłoszeń wczytanych: %d; po usunięciu duplikatów i wyborze ostatniego zgłoszenia każdego kodu — uczestnicy: **%d**.' % (meta['loaded'], n)]
    if meta.get('superseded'):
        L.append('Zgłoszenia zastąpione późniejszym tego samego kodu: %d.' % meta['superseded'])
    if meta.get('invalid'):
        L.append('Wykluczone (kod spoza listy, np. testowy): %s.' % ', '.join(sorted(meta['invalid'])))
    if meta.get('skipped'):
        L.append('Wykluczone na życzenie (--pomin): %s.' % ', '.join(sorted(meta['skipped'])))
    if meta.get('invited') is not None:
        L.append('Zaproszeni (kody z wpisaną osobą w codes.csv): %d; odsetek uczestnictwa: %s.' % (meta['invited'], fmt(n / meta['invited'] * 100 if meta['invited'] else None, 1) + ' %'))
    if meta.get('unassigned'):
        L.append('UWAGA: zgłoszenia z kodów bez przypisanej osoby w codes.csv: %s.' % ', '.join(sorted(meta['unassigned'])))
    shas = Counter((p.get('version') or {}).get('sha') for p in parts)
    L += ['Wersja aplikacji (sha) w odpowiedziach: ' + ', '.join('%s (%d)' % (k, v) for k, v in shas.items()), '',
          '## Uczestnicy', '',
          '- kraj: ' + counts(parts, 'country'),
          '- dziedzina: ' + counts(parts, 'field', FIELDS),
          '- status: ' + counts(parts, 'status', {'specialist': 'specjalista', 'resident': 'rezydent'}) + ((' (rok rezydentury: ' + counts([p for p in parts if (p.get('demographics') or {}).get('status') == 'resident'], 'residentYear') + ')') if any((p.get('demographics') or {}).get('status') == 'resident' for p in parts) else ''),
          '- lata od specjalizacji: ' + counts([p for p in parts if (p.get('demographics') or {}).get('status') == 'specialist'], 'yearsSinceSpec'),
          '- resekcje przewodu pokarmowego rocznie: ' + counts(parts, 'resectionsPerYear'),
          '- wcześniej używał(a) SURGITOME: ' + counts(parts, 'usedBefore', {'True': 'tak', 'False': 'nie'}),
          '- język ankiety: ' + ', '.join('%s: %d' % kv for kv in Counter(p.get('lang') for p in parts).most_common()),
          '- urządzenie: ' + ', '.join('%s: %d' % kv for kv in Counter((p.get('device') or {}).get('type') for p in parts).most_common()),
          '- ocenione pozycje (z 31): mediana %s; komplet 31/31: %d; zakończone wcześniej: %d' % (
              fmt(statistics.median([x['ocenionych_pozycji'] for x in res['participants']]) if parts else None, 0),
              sum(1 for x in res['participants'] if x['ocenionych_pozycji'] == 31), sum(1 for x in res['participants'] if x['zakonczyl_wczesniej'])),
          '- czas od zgody do wysłania [min]: mediana %s (IQR %s–%s); czas aktywny w atlasie [min]: mediana %s (IQR %s–%s)' % (
              fmt(res['time_total']['mediana'], 1), fmt(res['time_total']['q1'], 1), fmt(res['time_total']['q3'], 1),
              fmt(res['time_active']['mediana'], 1), fmt(res['time_active']['q1'], 1), fmt(res['time_active']['q3'], 1)), '',
          '## Trafność treści (CVI)', '',
          'S-CVI/Ave = %s, S-CVI/UA = %s (pozycje z ≥ 1 oceniającym: %d z 31).' % (fmt(res['scvi_all'][0], 3), fmt(res['scvi_all'][1], 3), res['scvi_all'][2]),
          'Same operacje (29): S-CVI/Ave = %s, S-CVI/UA = %s. Pozycje z ≥ 3 oceniającymi (%d): S-CVI/Ave = %s, S-CVI/UA = %s.' % (
              fmt(res['scvi_ops'][0], 3), fmt(res['scvi_ops'][1], 3), res['scvi_n3'][2], fmt(res['scvi_n3'][0], 3), fmt(res['scvi_n3'][1], 3)), '',
          '| # | Pozycja | N | 3–4 | I-CVI | k* | ocena k* | 1/2/3/4 | poza dziedz. | uwagi |', '|---|---|---|---|---|---|---|---|---|---|']
    for r in res['items']:
        flags = []
        if r['ponizej_3_oceniajacych']: flags.append('< 3 oceniających')
        if r['I_CVI_ponizej_0_78']: flags.append('I-CVI < 0,78')
        L.append('| %d | %s%s | %d | %d | %s | %s | %s | %d/%d/%d/%d | %d | %s |' % (
            r['n'], r['nazwa_pl'], ' (moduł)' if r['rodzaj'] == 'moduł' else '', r['oceniajacych_N'], r['ocen_3_4'], fmt(r['I_CVI']), fmt(r['kappa']),
            r['kappa_ocena'], r['n1'], r['n2'], r['n3'], r['n4'], r['n_poza_dziedzina'], '; '.join(flags)))
    L += ['', 'S-CVI/Ave w podgrupach dziedzin: ' + '; '.join('%s: %s (pozycji %d)' % (FIELDS[f], fmt(v[0], 3), v[2]) for f, v in res['scvi_fields'].items() if v[2]) + ' — I-CVI pozycji w podgrupach: podgrupy.csv.', '',
          '## Użyteczność (SUS)', '',
          'n = %d; średnia %s (SD %s); mediana %s (IQR %s–%s).' % (res['sus']['n'], fmt(res['sus']['srednia'], 1), fmt(res['sus']['sd'], 1),
                                                                  fmt(res['sus']['mediana'], 1), fmt(res['sus']['q1'], 1), fmt(res['sus']['q3'], 1)), '',
          '## Przydatność (Likert 1–5)', '', '| Stwierdzenie | n | mediana (IQR) | średnia | zgoda 4–5 |', '|---|---|---|---|---|']
    for k, lab in USE.items():
        d = res['use'][k]
        L.append('| %s | %d | %s (%s–%s) | %s | %s |' % (lab, d['n'], fmt(d['mediana'], 1), fmt(d['q1'], 1), fmt(d['q3'], 1), fmt(d['srednia'], 2),
                                                        fmt(d['zgoda_4_5'] * 100 if d['zgoda_4_5'] is not None else None, 0) + ' %'))
    L += ['', 'Komentarze do pozycji i odpowiedzi na pytania otwarte: komentarze.csv (%d).' % len(res['comments']), '',
          'Metody: Lynn 1986 (PMID 3640358); Polit i Beck 2006 (PMID 16977646); Polit, Beck i Owen 2007 (PMID 17654487); raportowanie wg CHERRIES (Eysenbach 2004, PMID 15471760).']
    with open(os.path.join(out, 'raport.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


def main(argv=None):
    ap = argparse.ArgumentParser(description='Analiza ankiety SURGITOME-STUDY')
    ap.add_argument('folder'); ap.add_argument('--out', default=os.path.join(R, 'wyniki'))
    ap.add_argument('--codes', default=os.path.join(R, 'codes.csv')); ap.add_argument('--kody', default=os.path.join(R, 'src', 'app', '12-badanie-kody.js'))
    ap.add_argument('--pomin', default='', help='kody do wykluczenia, np. pilotaż: ABC234,XYZ567')
    ap.add_argument('--bez-weryfikacji', action='store_true', help='nie sprawdzaj kodów ze skrótami (tylko testy)')
    a = ap.parse_args(argv)
    entries = load_folder(a.folder)
    meta = {'loaded': len(entries), 'invalid': set(), 'skipped': set()}
    skip = {x.strip().upper() for x in a.pomin.split(',') if x.strip()}
    cfg = None if a.bez_weryfikacji else code_hashes(a.kody)
    keep = []
    for p, src, d in entries:
        c = p.get('code')
        if c in skip:
            meta['skipped'].add(c); continue
        if cfg is not None and not valid_code(c, cfg):
            meta['invalid'].add(str(c)); continue
        keep.append((p, src, d))
    chosen, meta['superseded'], meta['duplicates'] = select_latest(keep)
    parts = [p for p, _, _ in chosen]
    if os.path.exists(a.codes):
        with open(a.codes, newline='', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        assigned = {r['kod'] for r in rows if (r.get('osoba') or '').strip()}
        meta['invited'] = len(assigned)
        meta['unassigned'] = {p.get('code') for p in parts if p.get('code') not in assigned}
    res = analyse(parts)
    write_outputs(res, parts, a.out, meta)
    print('uczestników: %d | S-CVI/Ave %s | S-CVI/UA %s | SUS średnia %s → %s' % (len(parts), fmt(res['scvi_all'][0], 3), fmt(res['scvi_all'][1], 3), fmt(res['sus']['srednia'], 1), a.out))
    return res, meta


if __name__ == '__main__':
    main()
