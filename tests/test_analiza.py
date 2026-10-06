# SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
# Test analizy (tools/analiza_ankiety.py) na przykładzie policzonym ręcznie; pliki: .json, .eml (Web3Forms: tekst i HTML z encjami), .mbox.
#
# Przykład — 4 uczestników (AAAAAA i BBBBBB: chirurgia kolorektalna; CCCCCC i DDDDDD: górny odcinek):
#   esoph: 4, 3, 2, „outside expertise” → N = 3, A = 2, I-CVI = 2/3 = 0,6667; Pc = C(3,2)·0,5³ = 3/8 = 0,375;
#          k* = (0,6667 − 0,375) / (1 − 0,375) = 0,2917 / 0,625 = 0,4667 → „dostateczna”
#   dg:    4, 4, 4, „outside expertise” → N = 3, A = 3, I-CVI = 1; Pc = 1/8; k* = (1 − 0,125) / 0,875 = 1 → „doskonała”
#   tg:    1 (tylko AAAAAA) → N = 1, A = 0, I-CVI = 0, oznaczona < 3 oceniających; pozostałe 28 pozycji bez ocen
#   S-CVI/Ave (pozycje z ≥ 1 oceniającym) = (0,6667 + 1 + 0) / 3 = 0,5556; S-CVI/UA = 1/3 = 0,3333
#   podgrupy esoph: kolorektalna 4, 3 → I-CVI 1; górny odcinek 2 (DDDDDD: NA) → N = 1, I-CVI 0
#   SUS: A [5,1,5,1,5,1,5,1,5,1] = 100; B [3]×10 = 50; C [4,2,…] = (3+3)·5·2,5 = 75; D [1,5,…] = 0
#        średnia 56,25; SD = √((43,75² + 6,25² + 18,75² + 56,25²)/3) = √(5468,75/3) = 42,6956; mediana (50+75)/2 = 62,5;
#        kwartyle (inclusive) z [0, 50, 75, 100]: Q1 = 0 + 0,75·50 = 37,5; Q3 = 75 + 0,25·25 = 81,25
#   AAAAAA wysłał dwa razy: wcześniejsze zgłoszenie (esoph = 1) musi zostać zastąpione późniejszym (esoph = 4).
import email.message, email.policy, hashlib, json, mailbox, os, shutil, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
import analiza_ankiety as AN

IDS = [i[0] for i in AN.ITEMS]


def write(path, text, mode='w'):
    with open(path, mode) as f:
        f.write(text)


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def payload(code, submitted, ratings, field, sus, submission=1, comment=''):
    items = []
    for n, iid in enumerate(IDS, 1):
        r = ratings.get(iid)
        items.append({'n': n, 'id': iid, 'kind': 'module' if iid in AN.MODULES else 'operation', 'rating': None if r in (None, 'NA') else r, 'na': r == 'NA',
                      'comment': comment if iid == 'esoph' else '', 'ms': 60000 if iid in ratings else 0, 'variants': 7 if iid == 'esoph' else 1,
                      'variantsSeen': 7 if iid == 'esoph' else 1, 'ratedAt': submitted if iid in ratings else None})
    return {'study': 'SURGITOME-STUDY', 'schema': 1, 'code': code, 'version': {'base': 'v1.1.0', 'sha': 'a' * 40}, 'lang': 'en',
            'device': {'type': 'desktop'}, 'consent': {'at': '2026-11-02T10:00:00.000Z', 'info': '2026-10-06'}, 'started': '2026-11-02T10:00:00.000Z',
            'submitted': submitted, 'submission': submission, 'activeMs': 1200000, 'demographics': {'country': 'PL', 'field': field, 'status': 'specialist',
            'yearsSinceSpec': '10-19', 'residentYear': None, 'resectionsPerYear': '50-99', 'usedBefore': False}, 'rated': len(ratings), 'total': 31,
            'finishedEarly': len(ratings) < 31, 'items': items, 'sus': sus, 'susScore': AN.sus_score(sus), 'susLang': 'en',
            'usefulness': {'teaching': 5, 'patients': 4, 'imaging': 3, 'recommend': 5}, 'open': {'missing': 'Stoma reversal' if code == 'BBBBBB' else '', 'incorrect': ''}}


def web3forms_mail(p, html_only=False):
    """Mail jak z Web3Forms: część tekstowa „pole : wartość” i HTML z encjami (&#x2F; &#x3A; &quot;)."""
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


class TestAnaliza(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp(prefix='surgitome-study-')
        d = os.path.join(cls.dir, 'odpowiedzi'); os.makedirs(os.path.join(d, 'maile'))
        A_old = payload('AAAAAA', '2026-11-02T10:20:00.000Z', {'esoph': 1, 'dg': 4, 'tg': 1}, 'colorectal', [3] * 10)
        A = payload('AAAAAA', '2026-11-02T11:00:00.000Z', {'esoph': 4, 'dg': 4, 'tg': 1}, 'colorectal', [5, 1] * 5, submission=2, comment='Stump: name the "IL side-to-side" variant / ok')
        B = payload('BBBBBB', '2026-11-02T10:30:00.000Z', {'esoph': 3, 'dg': 4}, 'colorectal', [3] * 10)
        C = payload('CCCCCC', '2026-11-02T10:40:00.000Z', {'esoph': 2, 'dg': 4}, 'upper', [4, 2] * 5)
        D = payload('DDDDDD', '2026-11-02T10:50:00.000Z', {'esoph': 'NA', 'dg': 'NA'}, 'upper', [1, 5] * 5)
        X = payload('ZZZZZZ', '2026-11-02T10:55:00.000Z', {'esoph': 1, 'dg': 1}, 'general', [3] * 10)  # kod spoza listy
        write(os.path.join(d, 'A_stare.json'), json.dumps(A_old))
        write(os.path.join(d, 'A.json'), json.dumps(A, indent=2))          # jak „Pobierz odpowiedzi (JSON)”
        write(os.path.join(d, 'maile', 'B.eml'), bytes(web3forms_mail(B)), 'wb')
        write(os.path.join(d, 'maile', 'C_html.eml'), bytes(web3forms_mail(C, html_only=True)), 'wb')
        write(os.path.join(d, 'maile', 'B_kopia.eml'), bytes(web3forms_mail(B)), 'wb')  # ten sam mail dwa razy
        mb = mailbox.mbox(os.path.join(d, 'skrzynka.mbox')); mb.add(web3forms_mail(D)); mb.add(web3forms_mail(X)); mb.flush(); mb.close()
        # skróty kodów jak w 12-badanie-kody.js: lista bez ZZZZZZ
        salt, it = '00ff', 1000
        cfg = {'salt': salt, 'iter': it, 'hashes': [hashlib.pbkdf2_hmac('sha256', c.encode(), salt.encode(), it).hex() for c in ('AAAAAA', 'BBBBBB', 'CCCCCC', 'DDDDDD')]}
        cls.kody = os.path.join(cls.dir, 'kody.js'); write(cls.kody, '  var STUDY_CODES = ' + json.dumps(cfg) + ';\n')
        cls.codes = os.path.join(cls.dir, 'codes.csv')
        write(cls.codes, 'kod,osoba,link\nAAAAAA,Ekspert 1,x\nBBBBBB,Ekspert 2,x\nCCCCCC,Ekspert 3,x\nDDDDDD,,x\nEEEEEE,Ekspert 5,x\n')
        cls.out = os.path.join(cls.dir, 'wyniki')
        cls.res, cls.meta = AN.main([d, '--out', cls.out, '--kody', cls.kody, '--codes', cls.codes])
        cls.items = {r['id']: r for r in cls.res['items']}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir)

    def test_wczytanie_i_wybor_ostatniego(self):
        self.assertEqual(self.meta['loaded'], 7)                     # 2× A (.json), B ×2, C, D, Z
        self.assertEqual(self.meta['invalid'], {'ZZZZZZ'})
        self.assertEqual(self.meta['duplicates'], 1)                 # B_kopia.eml
        self.assertEqual(self.meta['superseded'], 1)                 # wcześniejsze zgłoszenie AAAAAA
        self.assertEqual(sorted(p['kod'] for p in self.res['participants']), ['AAAAAA', 'BBBBBB', 'CCCCCC', 'DDDDDD'])
        a = [p for p in self.res['participants'] if p['kod'] == 'AAAAAA'][0]
        self.assertEqual(a['zgloszenie_nr'], 2)
        self.assertEqual(self.meta['invited'], 4)
        self.assertEqual(self.meta['unassigned'], {'DDDDDD'})

    def test_icvi_i_kappa(self):
        e = self.items['esoph']
        self.assertEqual((e['oceniajacych_N'], e['ocen_3_4'], e['n_poza_dziedzina']), (3, 2, 1))
        self.assertAlmostEqual(e['I_CVI'], 0.6667, places=4)
        self.assertAlmostEqual(e['Pc'], 0.375, places=6)
        self.assertAlmostEqual(e['kappa'], 0.4667, places=4)
        self.assertEqual(e['kappa_ocena'], 'dostateczna')
        self.assertEqual(e['I_CVI_ponizej_0_78'], 'TAK')
        d = self.items['dg']
        self.assertEqual((d['oceniajacych_N'], d['I_CVI'], d['Pc'], d['kappa'], d['kappa_ocena']), (3, 1.0, 0.125, 1.0, 'doskonała'))
        t = self.items['tg']
        self.assertEqual((t['oceniajacych_N'], t['I_CVI'], t['ponizej_3_oceniajacych']), (1, 0.0, 'TAK'))
        self.assertIsNone(self.items['ileo']['I_CVI'])
        self.assertEqual(self.items['ileo']['n_brak_oceny'], 4)

    def test_scvi(self):
        ave, ua, n = self.res['scvi_all']
        self.assertEqual(n, 3)
        self.assertAlmostEqual(ave, 0.5556, places=4)
        self.assertAlmostEqual(ua, 0.3333, places=4)

    def test_podgrupy(self):
        self.assertEqual(self.res['fields']['colorectal']['esoph']['icvi'], 1.0)
        self.assertEqual(self.res['fields']['upper']['esoph']['N'], 1)
        self.assertEqual(self.res['fields']['upper']['esoph']['icvi'], 0.0)

    def test_sus(self):
        self.assertEqual(AN.sus_score([5, 1] * 5), 100)
        self.assertEqual(AN.sus_score([3] * 10), 50)
        self.assertEqual(AN.sus_score([4, 2] * 5), 75)
        self.assertEqual(AN.sus_score([1, 5] * 5), 0)
        self.assertIsNone(AN.sus_score([3] * 9 + [None]))
        s = self.res['sus']
        self.assertEqual(s['n'], 4)
        self.assertAlmostEqual(s['srednia'], 56.25, places=6)
        self.assertAlmostEqual(s['sd'], 42.6956, places=4)
        self.assertEqual((s['mediana'], s['q1'], s['q3']), (62.5, 37.5, 81.25))

    def test_komentarze_i_pliki(self):
        c = [x for x in self.res['comments'] if x['pozycja'] == 'esoph']
        self.assertEqual(len(c), 1)
        self.assertEqual(c[0]['komentarz'], 'Stump: name the "IL side-to-side" variant / ok')
        self.assertTrue(any(x['komentarz'] == 'Stoma reversal' for x in self.res['comments']))
        for f in ('wyniki.csv', 'podgrupy.csv', 'uczestnicy.csv', 'komentarze.csv', 'raport.md'):
            self.assertTrue(os.path.getsize(os.path.join(self.out, f)) > 0, f)
        rap = read(os.path.join(self.out, 'raport.md'))
        self.assertIn('S-CVI/Ave = 0.556, S-CVI/UA = 0.333', rap)
        self.assertIn('ZZZZZZ', rap)
        self.assertNotIn('153.19.102.13', rap + read(os.path.join(self.out, 'uczestnicy.csv')))


if __name__ == '__main__':
    r = unittest.main(exit=False, verbosity=1).result
    print('errors', json.dumps([str(t) for t, _ in r.failures + r.errors]))
