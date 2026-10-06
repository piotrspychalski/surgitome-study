# SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
# Kody dostępu do ankiety: N nowych kodów (6 znaków, bez 0/O/1/I) → codes.csv (kod, osoba, link; poza repozytorium — .gitignore)
# i skróty kodów → src/app/12-badanie-kody.js (w stronie są tylko skróty; repozytorium jest publiczne).
# Skrót: PBKDF2-HMAC-SHA-256 (sól wspólna dla badania, ITER iteracji) — przy 32^6 ≈ 10^9 kombinacji zwykłe SHA-256 dałoby się
# odwrócić w kilka minut; PBKDF2 to samo SHA-256, tylko powtórzone, co spowalnia zgadywanie ok. 10^5 razy.
# Użycie: python3 tools/make_codes.py 25        (dopisuje 25 kodów; wcześniejsze zostają ważne)
#         python3 tools/make_codes.py --check    (zgodność codes.csv ze skrótami w stronie)
import csv, hashlib, json, os, re, secrets, sys

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CSV = os.path.join(R, 'codes.csv')
JS = os.path.join(R, 'src', 'app', '12-badanie-kody.js')
ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # 32 znaki: bez 0, O, 1, I
LEN, ITER = 6, 100000
URL = 'https://piotrspychalski.github.io/surgitome-study/?k='


def code_hash(code, salt, it=ITER):
    return hashlib.pbkdf2_hmac('sha256', code.encode('ascii'), salt.encode('ascii'), it).hex()


def read_js():
    if not os.path.exists(JS):
        return {'salt': secrets.token_hex(16), 'iter': ITER, 'hashes': []}
    m = re.search(r'STUDY_CODES = (\{.*?\});', open(JS, encoding='utf-8').read(), re.S)
    return json.loads(m.group(1))


def write_js(cfg):
    body = json.dumps(cfg, indent=None, separators=(', ', ': '))
    open(JS, 'w', encoding='utf-8').write(
        '  /* ---------- SURGITOME-STUDY: skróty kodów dostępu (PBKDF2-HMAC-SHA-256, sól badania) — plik generuje tools/make_codes.py, nie edytować ręcznie ---------- */\n'
        '  var STUDY_CODES = ' + body + ';\n')


def read_csv():
    if not os.path.exists(CSV):
        return []
    with open(CSV, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def main():
    cfg = read_js()
    rows = read_csv()
    if len(sys.argv) > 1 and sys.argv[1] == '--check':
        hs = set(cfg['hashes'])
        bad = [r['kod'] for r in rows if code_hash(r['kod'], cfg['salt'], cfg['iter']) not in hs]
        print('kodów w codes.csv: %d | skrótów w stronie: %d | kody bez skrótu: %s' % (len(rows), len(hs), bad or 'brak'))
        sys.exit(1 if bad else 0)
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    have = {r['kod'] for r in rows}
    new = []
    while len(new) < n:
        c = ''.join(secrets.choice(ALPHABET) for _ in range(LEN))
        if c not in have and c not in new:
            new.append(c)
    for c in new:
        rows.append({'kod': c, 'osoba': '', 'link': URL + c})
        h = code_hash(c, cfg['salt'], cfg['iter'])
        if h not in cfg['hashes']:
            cfg['hashes'].append(h)
    with open(CSV, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['kod', 'osoba', 'link'])
        w.writeheader()
        for r in rows:
            w.writerow({'kod': r['kod'], 'osoba': r.get('osoba', ''), 'link': r.get('link') or URL + r['kod']})
    write_js(cfg)
    print('nowe kody: %d | razem w codes.csv: %d | skrótów w stronie: %d' % (len(new), len(rows), len(cfg['hashes'])))
    print('Dalej: node build.js, testy, commit src/app/12-badanie-kody.js (codes.csv zostaje tylko u Ciebie).')


if __name__ == '__main__':
    main()
