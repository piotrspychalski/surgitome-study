# SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
# Test analizy (tools/analiza_ankiety.py) na przykładzie policzonym ręcznie; pliki: eksport CSV z Web3Forms, .json, .eml (tekst i HTML z encjami), .mbox;
# schemat 1 (bez ról i wyboru pozycji) i 2.
#
# Uczestnicy (grupa CVI domyślnie: chirurdzy — specjaliści i rezydenci):
#   AAAAAA chirurg, kolorektalna, wszystkie pozycje (schemat 2)  — esoph 4, dg 4, tg 1;            SUS [5,1]×5 = 100
#   BBBBBB status „specialist” (schemat 1 → chirurg), kolorektalna — esoph 3, dg 4, tg bez oceny;  SUS [3]×10  = 50
#   CCCCCC rezydent, górny odcinek, wybrane: esoph, dg             — esoph 2, dg 4;                SUS [4,2]×5 = 75
#   DDDDDD chirurg, górny odcinek, wybrane: esoph, dg             — esoph i dg „poza dziedziną”;   SUS [1,5]×5 = 0
#   EEEEEE pacjent, wybrane: esoph (eksport CSV), ocena ZROZUMIAŁOŚCI — esoph 1;                   SUS [3]×10  = 50  → poza CVI
#   FFFFFF lekarz innej specjalności, wybrane: esoph (eksport CSV)  — esoph 4 (trafność);           SUS brak         → poza CVI (grupa chirurdzy)
#   E-0123456789ab chirurg z OTWARTEGO dostępu (kod z e-maila, CSV)  — esoph 1;                       SUS brak         → poza CVI głównym
#     chirurdzy otwarci: esoph 1 → N = 1, I-CVI 0; --cvi-dostep wszyscy: esoph 4, 3, 2, 1 → N = 4, I-CVI = 0,5;
#     podgrupa roli „chirurg” (opisowa, każdy dostęp): esoph A 4, B 3, otwarty 1 → N = 3, I-CVI = 2/3
# CVI (A–D):
#   esoph: 4, 3, 2, NA → N = 3, A = 2, I-CVI = 2/3 = 0,6667; Pc = C(3,2)·0,5³ = 0,375; k* = (0,6667 − 0,375)/0,625 = 0,4667 → „dostateczna”
#   dg:    4, 4, 4, NA → N = 3, I-CVI = 1; Pc = 0,125; k* = 1 → „doskonała”
#   tg:    A 1; B bez oceny (wybrana); C, D niewybrana → N = 1, I-CVI = 0, < 3 oceniających; niewybrane 2, brak oceny 1
#   ileo:  A, B bez oceny; C, D niewybrana → I-CVI brak; brak oceny 2, niewybrane 2
#   S-CVI/Ave = (0,6667 + 1 + 0)/3 = 0,5556; S-CVI/UA = 1/3
#   podgrupy: kolorektalna (A, B) esoph 4, 3 → 1; górny odcinek (C, D) esoph 2 → N = 1, 0; rola „lekarz” esoph 4 → 1
#   zrozumiałość (E): esoph 1 → N = 1, odsetek 3–4 = 0; średnia z pozycji z ocenami = 0 (1 pozycja)
#   --grupa-cvi wszyscy (tylko oceny trafności: A, B, C, D, F): esoph 4, 3, 2, 4 → N = 4, A = 3, I-CVI = 0,75
# SUS (wszyscy): [100, 50, 75, 0, 50] → średnia 55; SD = √((45² + 5² + 20² + 55² + 5²)/4) = √(5500/4) = 37,0810; mediana 50;
#   kwartyle (inclusive) z [0, 50, 50, 75, 100]: Q1 = 50, Q3 = 75. Role: chirurg (A, B, D) średnia 50, rezydent 75, pacjent 50.
#   SUS pozycja 1: odpowiedzi 5, 3, 4, 1, 3 → średnia 3,2; wkład 4, 2, 3, 0, 2 → 2,2. Pozycja 2: 1, 3, 2, 5, 3 → 2,8; wkład (5 − x) → 2,2.
# AAAAAA wysłał dwa razy: wcześniejsze zgłoszenie (esoph = 1) zastąpione późniejszym; BBBBBB — ten sam mail dwa razy (duplikat).
import csv, email.message, email.policy, hashlib, io, json, mailbox, os, shutil, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
import analiza_ankiety as AN

IDS = [i[0] for i in AN.ITEMS]


def write(path, text, mode='w'):
    with open(path, mode) as f:
        f.write(text)


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def payload(code, submitted, ratings, demo, sus, submission=1, comment='', sel=None, schema=2, measure=None, use=None, useset=None, access=None):
    items = []
    for n, iid in enumerate(IDS, 1):
        r = ratings.get(iid); s = sel is None or iid in sel
        x = {'n': n, 'id': iid, 'kind': 'module' if iid in AN.MODULES else 'operation', 'rating': None if r in (None, 'NA') or not s else r, 'na': s and r == 'NA',
             'comment': comment if iid == 'esoph' else '', 'ms': 60000 if iid in ratings else 0, 'variants': 7 if iid == 'esoph' else 1,
             'variantsSeen': 7 if iid == 'esoph' else 1, 'ratedAt': submitted if iid in ratings else None}
        if schema == 2:
            x['selected'] = s
        items.append(x)
    p = {'study': 'SURGITOME-STUDY', 'schema': schema, 'code': code, 'version': {'base': 'v1.1.0', 'sha': 'a' * 40}, 'lang': 'en',
         'device': {'type': 'desktop'}, 'consent': {'at': '2026-11-02T10:00:00.000Z', 'info': '2026-10-07'}, 'started': '2026-11-02T10:00:00.000Z',
         'submitted': submitted, 'submission': submission, 'activeMs': 1200000, 'demographics': dict({'country': 'PL', 'usedBefore': False}, **demo),
         'rated': len(ratings), 'total': len(sel) if sel else 31, 'finishedEarly': True, 'items': items, 'sus': sus, 'susScore': AN.sus_score(sus), 'susLang': 'en',
         'usefulness': use or {'teaching': 5, 'patients': 4, 'imaging': 3, 'recommend': 5}, 'open': {'missing': 'Stoma reversal' if code == 'BBBBBB' else '', 'incorrect': ''}}
    if schema == 2:
        p['selected'] = sel or IDS
    if measure:
        p['ratingMeasure'] = measure; p['usefulnessSet'] = useset
    if access:
        p['access'] = access; p['idType'] = 'email-hash'
    return p


def web3forms_mail(p, html_only=False):
    """Mail jak z Web3Forms: część tekstowa „pole : wartość” i HTML z encjami (&#x2F; &#x3A; &quot;) oraz stopką z IP."""
    data = json.dumps(p, ensure_ascii=False, separators=(',', ':'))
    m = email.message.EmailMessage(policy=email.policy.SMTP)
    m['Subject'] = 'SURGITOME-STUDY ' + p['code']; m['From'] = 'notify+x@web3forms.com'; m['To'] = 'x@example.com'; m['Date'] = 'Mon, 02 Nov 2026 12:00:00 +0000'
    txt = 'Kod : %s\nOcenione pozycje : %d / 31\ndata : %s' % (p['code'], p['rated'], data)
    esc = data.replace('&', '&amp;').replace('"', '&quot;').replace('/', '&#x2F;').replace(':', '&#x3A;')
    htm = '<html><body><div>data</div><div>\r\n                                %s\r\n                              </div><p>Visitor IP: 153.19.102.13.</p></body></html>' % esc
    if html_only:
        m.set_content(htm, subtype='html', cte='quoted-printable')
    else:
        m.set_content(txt, cte='quoted-printable'); m.add_alternative(htm, subtype='html', cte='quoted-printable')
    return m


def web3forms_csv(payloads):
    """Eksport z panelu Web3Forms: kolumna „Data” = JSON odpowiedzi; zgłoszenie „Zgłoś uwagę” — JSON wszystkich pól (do pominięcia)."""
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(['Submitted At', 'Adres Strony', 'Data', 'Kod', 'Ocenione Pozycje', 'Subject', 'SUS', 'Uwaga', 'Wersja'])
    for p in payloads:
        w.writerow([p['submitted'], '', json.dumps(p, ensure_ascii=False, separators=(',', ':')), p['code'], '%d / %d' % (p['rated'], p['total']),
                    'SURGITOME-STUDY ' + p['code'], p['susScore'], '', 'aaaaaaa'])
    w.writerow(['2026-09-30T12:56:04.000Z', 'https://piotrspychalski.github.io/surgitome/', json.dumps({'subject': 'SURGITOME — uwaga', 'Uwaga': 'test2'}), '', '', 'SURGITOME — uwaga', '', 'test2', ''])
    return '﻿' + buf.getvalue()


class TestAnaliza(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp(prefix='surgitome-study-')
        d = os.path.join(cls.dir, 'odpowiedzi'); os.makedirs(os.path.join(d, 'maile'))
        surg = lambda f: {'role': 'surgeon', 'field': f, 'yearsSinceSpec': '10-19', 'resectionsPerYear': '50-99'}
        A_old = payload('AAAAAA', '2026-11-02T10:20:00.000Z', {'esoph': 1, 'dg': 4, 'tg': 1}, surg('colorectal'), [3] * 10)
        A = payload('AAAAAA', '2026-11-02T11:00:00.000Z', {'esoph': 4, 'dg': 4, 'tg': 1}, surg('colorectal'), [5, 1] * 5, submission=2, comment='Stump: name the "IL side-to-side" variant / ok')
        B = payload('BBBBBB', '2026-11-02T10:30:00.000Z', {'esoph': 3, 'dg': 4}, {'status': 'specialist', 'field': 'colorectal', 'yearsSinceSpec': '5-9'}, [3] * 10, schema=1)
        C = payload('CCCCCC', '2026-11-02T10:40:00.000Z', {'esoph': 2, 'dg': 4}, {'role': 'resident', 'field': 'upper', 'residentYear': '4'}, [4, 2] * 5, sel=['esoph', 'dg'])
        D = payload('DDDDDD', '2026-11-02T10:50:00.000Z', {'esoph': 'NA', 'dg': 'NA'}, surg('upper'), [1, 5] * 5, sel=['esoph', 'dg'])
        E = payload('EEEEEE', '2026-11-02T10:52:00.000Z', {'esoph': 1}, {'role': 'patient'}, [3] * 10, sel=['esoph'], measure='comprehensibility', useset='patient',
                    use={'understandOp': 5, 'prepare': 4, 'layIntelligible': 5, 'recommendPatients': 4})
        F = payload('FFFFFF', '2026-11-02T10:53:00.000Z', {'esoph': 4}, {'role': 'physician', 'specialty': 'gastro'}, [None] * 10, sel=['esoph'], measure='accuracy', useset='physician',
                    use={'myPatients': 4, 'imaging': 5, 'teaching': 4, 'recommend': 4})
        X = payload('ZZZZZZ', '2026-11-02T10:55:00.000Z', {'esoph': 1, 'dg': 1}, surg('general'), [3] * 10)  # kod spoza listy
        write(os.path.join(d, 'A_stare.json'), json.dumps(A_old))
        write(os.path.join(d, 'A.json'), json.dumps(A, indent=2))          # jak „Pobierz odpowiedzi (JSON)”
        write(os.path.join(d, 'maile', 'B.eml'), bytes(web3forms_mail(B)), 'wb')
        write(os.path.join(d, 'maile', 'C_html.eml'), bytes(web3forms_mail(C, html_only=True)), 'wb')
        write(os.path.join(d, 'maile', 'B_kopia.eml'), bytes(web3forms_mail(B)), 'wb')  # ten sam mail dwa razy
        mb = mailbox.mbox(os.path.join(d, 'skrzynka.mbox')); mb.add(web3forms_mail(D)); mb.add(web3forms_mail(X)); mb.flush(); mb.close()
        G = payload('E-0123456789ab', '2026-11-02T10:54:00.000Z', {'esoph': 1}, surg('general'), [None] * 10, sel=['esoph'], measure='accuracy', useset='surgeon', use={'recommend': 1}, access='open')
        write(os.path.join(d, 'submissions-web3forms.csv'), web3forms_csv([E, F, G]))
        salt, it = '00ff', 1000
        cfg = {'salt': salt, 'iter': it, 'hashes': [hashlib.pbkdf2_hmac('sha256', c.encode(), salt.encode(), it).hex() for c in ('AAAAAA', 'BBBBBB', 'CCCCCC', 'DDDDDD', 'EEEEEE', 'FFFFFF')]}
        cls.kody = os.path.join(cls.dir, 'kody.js'); write(cls.kody, '  var STUDY_CODES = ' + json.dumps(cfg) + ';\n')
        cls.codes = os.path.join(cls.dir, 'codes.csv')
        write(cls.codes, 'kod,osoba,link\nAAAAAA,Ekspert 1,x\nBBBBBB,Ekspert 2,x\nCCCCCC,Ekspert 3,x\nDDDDDD,,x\nEEEEEE,Pacjent 1,x\nFFFFFF,Lekarz 1,x\n')
        cls.out = os.path.join(cls.dir, 'wyniki')
        cls.src = d
        cls.res, cls.meta = AN.main([d, '--out', cls.out, '--kody', cls.kody, '--codes', cls.codes])
        cls.items = {r['id']: r for r in cls.res['items']}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir)

    def test_wczytanie_i_wybor_ostatniego(self):
        self.assertEqual(self.meta['loaded'], 10)                    # 2× A (.json), B ×2, C, D, Z, E, F i G (CSV; wiersz „Zgłoś uwagę” pominięty)
        self.assertEqual(self.meta['invalid'], {'ZZZZZZ'})
        self.assertEqual(self.meta['duplicates'], 1)                 # B_kopia.eml
        self.assertEqual(self.meta['superseded'], 1)                 # wcześniejsze zgłoszenie AAAAAA
        self.assertEqual(sorted(p['kod'] for p in self.res['participants']), ['AAAAAA', 'BBBBBB', 'CCCCCC', 'DDDDDD', 'E-0123456789ab', 'EEEEEE', 'FFFFFF'])
        P = {p['kod']: p for p in self.res['participants']}
        self.assertEqual(P['AAAAAA']['zgloszenie_nr'], 2)
        self.assertEqual((P['BBBBBB']['rola'], P['CCCCCC']['rola'], P['EEEEEE']['rola']), ('surgeon', 'resident', 'patient'))
        self.assertEqual((P['CCCCCC']['wybranych_pozycji'], P['BBBBBB']['wybranych_pozycji'], P['EEEEEE']['w_grupie_cvi'], P['FFFFFF']['w_grupie_cvi']), (2, 31, False, False))
        self.assertEqual((P['EEEEEE']['miara_oceny'], P['EEEEEE']['zestaw_przydatnosci'], P['AAAAAA']['miara_oceny']), ('comprehensibility', 'patient', 'accuracy'))
        self.assertEqual(self.res['n_group'], 4)
        self.assertEqual(self.meta['invited'], 5)
        self.assertEqual(self.meta['unassigned'], {'DDDDDD'})       # kod z e-maila nie jest „nieprzypisanym zaproszeniem”
        self.assertEqual((P['E-0123456789ab']['dostep'], P['E-0123456789ab']['w_grupie_cvi'], P['AAAAAA']['dostep']), ('open', False, 'invited'))

    def test_przekodowanie_dziedziny(self):
        P = [{'code': c, 'demographics': {'role': 'resident', 'field': f, 'fieldOther': t}} for c, f, t in
             [('E-1', 'other', 'Kazda'), ('E-2', 'other', ' wszystkie. '), ('E-3', 'other', 'chirurgia endokrynna'), ('E-4', 'upper', 'każda'),
              ('E-5', 'other', 'Chirurgia ogólna'), ('E-6', 'other', 'Każda poza bariatrią')]]
        self.assertEqual(AN.recode_fields(P), ['E-1', 'E-2', 'E-5'])
        self.assertEqual([p['demographics']['field'] for p in P], ['general', 'general', 'other', 'upper', 'general', 'other'])
        self.assertEqual(P[0]['demographics']['fieldOther'], 'Kazda')

    def test_icvi_i_kappa(self):
        e = self.items['esoph']
        self.assertEqual((e['oceniajacych_N'], e['ocen_3_4'], e['n_poza_dziedzina'], e['n_niewybrane']), (3, 2, 1, 0))
        self.assertAlmostEqual(e['I_CVI'], 0.6667, places=4)
        self.assertAlmostEqual(e['Pc'], 0.375, places=6)
        self.assertAlmostEqual(e['kappa'], 0.4667, places=4)
        self.assertEqual(e['kappa_ocena'], 'dostateczna')
        self.assertEqual(e['I_CVI_ponizej_0_78'], 'TAK')
        d = self.items['dg']
        self.assertEqual((d['oceniajacych_N'], d['I_CVI'], d['Pc'], d['kappa'], d['kappa_ocena']), (3, 1.0, 0.125, 1.0, 'doskonała'))
        t = self.items['tg']
        self.assertEqual((t['oceniajacych_N'], t['I_CVI'], t['ponizej_3_oceniajacych'], t['n_niewybrane'], t['n_brak_oceny']), (1, 0.0, 'TAK', 2, 1))
        i = self.items['ileo']
        self.assertIsNone(i['I_CVI'])
        self.assertEqual((i['n_brak_oceny'], i['n_niewybrane']), (2, 2))

    def test_scvi(self):
        ave, ua, n = self.res['scvi_all']
        self.assertEqual(n, 3)
        self.assertAlmostEqual(ave, 0.5556, places=4)
        self.assertAlmostEqual(ua, 0.3333, places=4)

    def test_podgrupy_i_role(self):
        self.assertEqual(self.res['fields']['colorectal']['esoph']['icvi'], 1.0)
        self.assertEqual((self.res['fields']['upper']['esoph']['N'], self.res['fields']['upper']['esoph']['icvi']), (1, 0.0))
        self.assertEqual((self.res['roles']['patient']['esoph']['N'], self.res['roles']['patient']['esoph']['icvi']), (0, None))   # pacjent: zrozumiałość, nie trafność
        self.assertEqual((self.res['roles']['physician']['esoph']['N'], self.res['roles']['physician']['esoph']['icvi']), (1, 1.0))
        r = self.res['roles']['surgeon']['esoph']                     # rola „chirurg” (opisowo, każdy dostęp): A 4, B 3, otwarty 1 → 2/3
        self.assertEqual(r['N'], 3); self.assertAlmostEqual(r['icvi'], 0.6667, places=4)
        res, _ = AN.main([self.src, '--out', self.out + '-wszyscy', '--kody', self.kody, '--codes', self.codes, '--grupa-cvi', 'wszyscy'])
        e = [r for r in res['items'] if r['id'] == 'esoph'][0]
        self.assertEqual((e['oceniajacych_N'], e['ocen_3_4'], e['I_CVI'], res['n_group']), (4, 3, 0.75, 5))   # bez otwartego (dostęp: zaproszeni)
        res, _ = AN.main([self.src, '--out', self.out + '-otwarci', '--kody', self.kody, '--codes', self.codes, '--cvi-dostep', 'wszyscy'])
        e = [r for r in res['items'] if r['id'] == 'esoph'][0]
        self.assertEqual((e['oceniajacych_N'], e['ocen_3_4'], e['I_CVI'], res['n_group']), (4, 2, 0.5, 5))

    def test_dostep_otwarty(self):
        self.assertEqual(self.items['esoph']['oceniajacych_N'], 3)       # otwarty chirurg poza CVI głównym
        self.assertEqual((self.res['n_open_surgeons'], self.res['open_items']['esoph']['N'], self.res['open_items']['esoph']['icvi']), (1, 1, 0.0))
        rap = read(os.path.join(self.out, 'raport.md'))
        self.assertIn('Dostęp: z zaproszenia 6, otwarty (kod z e-maila) 1.', rap)
        self.assertIn('Chirurdzy z otwartego dostępu (analiza dodatkowa, poza CVI głównym): 1;', rap)

    def test_pomin(self):
        # --pomin bez względu na wielkość liter — także kody otwarte E-… (małe litery w części szesnastkowej)
        res, meta = AN.main([self.src, '--out', self.out + '-pomin', '--kody', self.kody, '--codes', self.codes, '--pomin', 'aaaaaa, E-0123456789AB'])
        self.assertEqual(meta['skipped'], {'AAAAAA', 'E-0123456789ab'})
        self.assertEqual((len(res['participants']), res['n_open_surgeons']), (5, 0))
        self.assertIn('Wykluczone na życzenie (--pomin): AAAAAA, E-0123456789ab.', read(os.path.join(self.out + '-pomin', 'raport.md')))

    def test_zrozumialosc(self):
        c = {r['id']: r for r in self.res['comprehension']}
        self.assertEqual((c['esoph']['oceniajacych_N'], c['esoph']['ocen_3_4'], c['esoph']['odsetek_3_4'], c['esoph']['patient_N'], c['esoph']['niewybrane']), (1, 0, 0.0, 1, 0))
        self.assertEqual((c['dg']['oceniajacych_N'], c['dg']['niewybrane']), (0, 1))
        self.assertEqual((self.res['n_comprehension'], self.res['comprehension_ave']), (1, (0.0, 1)))
        self.assertEqual(self.items['esoph']['oceniajacych_N'], 3)       # ocena pacjenta nie trafia do CVI

    def test_przydatnosc(self):
        self.assertEqual((self.res['use']['understandOp']['n'], self.res['use']['teaching']['n'], self.res['use']['myPatients']['n']), (1, 5, 1))
        self.assertAlmostEqual(self.res['use']['understandOp']['srednia'], 5.0)
        rap = read(os.path.join(self.out, 'raport.md'))
        self.assertIn('pomógł mi zrozumieć, na czym polega operacja | pacjent | 1 |', rap)
        self.assertNotIn('lepiej niż ryciny', rap)                    # stwierdzenia bez odpowiedzi nie trafiają do tabeli

    def test_sus(self):
        self.assertEqual(AN.sus_score([5, 1] * 5), 100)
        self.assertEqual(AN.sus_score([3] * 10), 50)
        self.assertEqual(AN.sus_score([4, 2] * 5), 75)
        self.assertEqual(AN.sus_score([1, 5] * 5), 0)
        self.assertIsNone(AN.sus_score([3] * 9 + [None]))
        s = self.res['sus']
        self.assertEqual(s['n'], 5)
        self.assertAlmostEqual(s['srednia'], 55, places=6)
        self.assertAlmostEqual(s['sd'], 37.0810, places=4)
        self.assertEqual((s['mediana'], s['q1'], s['q3']), (50, 50, 75))
        r = self.res['sus_roles']
        self.assertEqual((r['surgeon']['n'], r['surgeon']['srednia'], r['resident']['srednia'], r['patient']['srednia']), (3, 50, 75, 50))
        i1, i2 = self.res['sus_items'][0], self.res['sus_items'][1]
        self.assertAlmostEqual(i1['srednia_odpowiedz'], 3.2); self.assertAlmostEqual(i1['srednia_wklad_0_4'], 2.2)
        self.assertAlmostEqual(i2['srednia_odpowiedz'], 2.8); self.assertAlmostEqual(i2['srednia_wklad_0_4'], 2.2)
        P = {p['kod']: p for p in self.res['participants']}
        self.assertEqual([P['CCCCCC']['SUS_%d' % k] for k in range(1, 11)], [4, 2] * 5)

    def test_komentarze_i_pliki(self):
        c = [x for x in self.res['comments'] if x['pozycja'] == 'esoph']
        self.assertEqual(len(c), 1)
        self.assertEqual(c[0]['komentarz'], 'Stump: name the "IL side-to-side" variant / ok')
        self.assertTrue(any(x['komentarz'] == 'Stoma reversal' for x in self.res['comments']))
        for f in ('wyniki.csv', 'podgrupy.csv', 'zrozumialosc.csv', 'uczestnicy.csv', 'sus_pozycje.csv', 'komentarze.csv', 'raport.md'):
            self.assertTrue(os.path.getsize(os.path.join(self.out, f)) > 0, f)
        rap = read(os.path.join(self.out, 'raport.md'))
        self.assertIn('S-CVI/Ave = 0.556, S-CVI/UA = 0.333', rap)
        self.assertIn('ZZZZZZ', rap)
        self.assertNotIn('153.19.102.13', rap + read(os.path.join(self.out, 'uczestnicy.csv')))


if __name__ == '__main__':
    r = unittest.main(exit=False, verbosity=1).result
    print('errors', json.dumps([str(t) for t, _ in r.failures + r.errors]))
