# Test „klikany” w prawdziwym Chromium (Playwright): python3 tests/klikany_chromium.py ankieta [desktop|mobile] | tour "hartmann:hartmann,frey:frey" | mobile
# Zrzuty trafiają do zrzuty/. Wymaga: pip install playwright && playwright install chromium (albo zmienna CHROME ze ścieżką).
# Test „klikany”: prawdziwy Chromium (WebGL przez SwiftShader), kliknięcia i klawiatura jak u użytkownika
import sys, time, json
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
# SURGITOME-STUDY: strona testowa z dodatkowym kodem TEST23 (jego skrót tylko w dist/surgitome-test.html, nigdy w stronie publikowanej)
def test_html():
    import re, hashlib
    src = open(os.path.join(HERE, '..', 'dist', 'surgitome.html'), encoding='utf-8').read()
    cfg = json.loads(re.search(r'var STUDY_CODES = (\{.*?\});', src).group(1))
    h = hashlib.pbkdf2_hmac('sha256', b'TEST23', cfg['salt'].encode(), cfg['iter']).hex()
    out = os.path.join(HERE, '..', 'dist', 'surgitome-test.html')
    open(out, 'w', encoding='utf-8').write(src.replace('"hashes": [', '"hashes": ["%s", ' % h))
    return 'file://' + out
HTML_T = test_html()
HTML = HTML_T + '?k=TEST23'
# scenariusze atlasu: sesja ankiety od razu w fazie atlasu (bez ekranów ankiety i samouczka)
ATLAS_STATE = json.dumps({'v': 1, 'code': 'TEST23', 'lang': 'pl', 'phase': 'atlas', 'consent': {'at': '2026-10-06T00:00:00Z', 'info': '2026-10-06'}, 'started': '2026-10-06T00:00:00Z',
    'demo': {}, 'items': {}, 'cur': 'esoph', 'activeMs': 0, 'sus': [None] * 10, 'use': {}, 'open': {'missing': '', 'incorrect': ''}, 'finishedEarly': False, 'tourDone': True, 'submissions': []})
SENT = []
def web3forms(r):
    # wysyłka ankiety nigdy nie wychodzi do Web3Forms: odpowiedź udawana (FAIL=1 — błąd serwisu)
    try: SENT.append(json.loads(r.request.post_data or '{}'))
    except Exception: SENT.append({})
    if os.environ.get('FAIL') == '1': return r.fulfill(status=429, content_type='application/json', body='{"success":false,"message":"Too many requests"}')
    return r.fulfill(status=200, content_type='application/json', body='{"success":true,"message":"Email sent successfully!"}')
LIB = {'three.min.js': os.path.join(HERE, '..', 'node_modules', 'three', 'build', 'three.min.js'), 'OrbitControls.js': os.path.join(HERE, '..', 'node_modules', 'three', 'examples', 'js', 'controls', 'OrbitControls.js')}
log = []
def route(r):
    u = r.request.url
    for k, p in LIB.items():
        if u.endswith(k): return r.fulfill(path=p, content_type='application/javascript')
    if 'fonts.g' in u: return r.abort()
    if 'api.web3forms.com' in u: return web3forms(r)
    if 'gc.zgo.at' in u or 'goatcounter' in u: return r.abort()
    return r.continue_()
def page_for(b, mobile, size=None, preview=False):
    vp = size or ({'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900})
    ctx = b.new_context(locale='pl-PL', viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    ctx.add_init_script("try { localStorage.setItem('surgitome-intro', '1'); localStorage.setItem('surgitome-tour', '1'); if (!localStorage.getItem('surgitome-study:TEST23')) localStorage.setItem('surgitome-study:TEST23', %s); } catch (e) {}" % json.dumps(ATLAS_STATE) + (" window.__SG_PREVIEW = true;" if preview else ''))
    p = ctx.new_page(); p.route('**/*', route)
    p.on('console', lambda m: log.append(('console.' + m.type, m.text)) if m.type in ('error', 'warning') else None)
    p.on('pageerror', lambda e: log.append(('pageerror', str(e))))
    p.goto(HTML); p.wait_for_timeout(2500); return p
def study_page(b, mobile, locale):
    # czysty kontekst (pierwsze wejście), bez zapisanej sesji ankiety
    vp = {'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}
    ctx = b.new_context(locale=locale, viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    p = ctx.new_page(); p.route('**/*', route)
    p.on('console', lambda m: log.append(('console.' + m.type, m.text)) if m.type in ('error', 'warning') else None)
    p.on('pageerror', lambda e: log.append(('pageerror', str(e))))
    return p
def tap(p, sel, mobile):
    if mobile: p.tap(sel)
    else: p.click(sel)
def survey(b, mobile):
    pre = 'an_m' if mobile else 'an_d'; n = [0]
    def sh(name): n[0] += 1; shot(p, '%s%02d_%s' % (pre, n[0], name))
    p = study_page(b, mobile, 'pl-PL' if mobile else 'en-GB')
    if not mobile:
        p.goto(HTML_T); p.wait_for_timeout(2500); sh('zaproszenie')
        p.fill('#stCode', 'abcdef'); p.click('#stOv form .btn.primary'); p.wait_for_timeout(800); sh('zly_kod')
    p.goto(HTML_T + '?k=TEST23'); p.wait_for_timeout(2500)
    log.append(('state', 'adres po wejściu: ' + p.evaluate("() => location.href.split('/').pop()")))
    if mobile: tap(p, '#stOv .stlang', mobile); p.wait_for_timeout(300)
    sh('informacja'); tap(p, '#stConsent', mobile); tap(p, '#stStart', mobile); p.wait_for_timeout(300)
    p.select_option('#stCountry', 'PL'); tap(p, 'input[name=stField][value=colorectal]', mobile)
    tap(p, 'input[name=stStatus][value=%s]' % ('resident' if mobile else 'specialist'), mobile)
    if mobile: p.select_option('#stResYear', '4')
    else: p.select_option('#stYears', '10-19')
    p.select_option('#stRes', '50-99'); tap(p, 'input[name=stUsed][value=no]', mobile); p.wait_for_timeout(200); sh('metryczka')
    tap(p, '#stDemoNext', mobile); p.wait_for_timeout(300); sh('instrukcja'); tap(p, '#stHowGo', mobile); p.wait_for_timeout(2500)
    for _ in range(6): tap(p, '#tourNext', mobile); p.wait_for_timeout(450)
    p.wait_for_timeout(600); sh('samouczek_ocena'); tap(p, '#tourNext', mobile); p.wait_for_timeout(800)
    settle(p, 0); p.wait_for_timeout(1500)
    if mobile: tap(p, '#stRateBtn', mobile); p.wait_for_timeout(500)
    tap(p, '#stR4', mobile); p.fill('#stRCom', 'Ivor Lewis side-to-side: blind stump longer than usual.' if not mobile else 'Wariant McKeown — bok-do-boku: kikut za długi.')
    p.wait_for_timeout(600); sh('ocena_pozycji')
    if mobile: tap(p, '#stRClose', mobile); p.wait_for_timeout(400)
    tap(p, '#variants .vbtn:nth-of-type(3)' if not mobile else '#mNext', mobile); p.wait_for_timeout(2600)
    for v in (3, 4, 2, 3):
        if mobile: tap(p, '#stRateBtn', mobile); p.wait_for_timeout(400)
        tap(p, '#stRNext', mobile); p.wait_for_timeout(1800)
        if mobile: tap(p, '#stRateBtn', mobile); p.wait_for_timeout(400)
        tap(p, '#stR%d' % v, mobile); p.wait_for_timeout(300)
        if mobile: tap(p, '#stRClose', mobile); p.wait_for_timeout(300)
    sh('postep_i_znaczniki')
    if mobile: tap(p, '#mMenuBtn', mobile); p.wait_for_timeout(500); sh('menu_znaczniki'); tap(p, '#mMenuClose', mobile); p.wait_for_timeout(300)
    else:
        p.click('#cats .cat:has-text("Liver")'); p.wait_for_timeout(2500); tap(p, '#stNA' if False else '#stRNA', mobile); p.wait_for_timeout(400); sh('modul_poza_dziedzina')
    tap(p, '#stFinBtn', mobile); p.wait_for_timeout(400); sh('zakonczyc'); tap(p, '#stFinGo', mobile); p.wait_for_timeout(400); sh('pytania_koncowe')
    for i, v in enumerate([4, 2, 5, 1, 4, 2, 5, 1, 4, 2]): tap(p, 'input[name=stSus%d][value="%d"]' % (i, v), mobile)
    for k, v in (('teaching', 5), ('patients', 4), ('imaging', 4), ('recommend', 5)): tap(p, 'input[name=stUse_%s][value="%d"]' % (k, v), mobile)
    p.fill('#stOpen_missing', 'Stoma reversal; intestinal transplantation.' if not mobile else 'Zamknięcie stomii.')
    p.evaluate("() => document.getElementById('stOv').scrollTo(0, 1e6)"); p.wait_for_timeout(300); sh('pytania_wypelnione')
    tap(p, '#stSubmit', mobile); p.wait_for_timeout(1500); sh('wyslano')
    if SENT:
        d = json.loads(SENT[-1].get('data', '{}'))
        log.append(('state', '%s: temat %s | sha %s | pozycji %d, ocenionych %d | SUS %s | jezyk %s | urzadzenie %s | czas esoph %s ms' % (
            pre, SENT[-1].get('subject'), (d.get('version') or {}).get('sha', '')[:12], len(d.get('items', [])), d.get('rated', -1), d.get('susScore'), d.get('lang'), (d.get('device') or {}).get('type'),
            next((x['ms'] for x in d.get('items', []) if x['id'] == 'esoph'), None))))
    # błąd wysyłki: ponowne wysłanie z odpowiedzią 429
    os.environ['FAIL'] = '1'; tap(p, '#stBackAtlas', mobile); p.wait_for_timeout(800); tap(p, '#stFinBtn', mobile); p.wait_for_timeout(300); tap(p, '#stFinGo', mobile); p.wait_for_timeout(300)
    tap(p, '#stSubmit', mobile); p.wait_for_timeout(1200); p.evaluate("() => document.getElementById('stOv').scrollTo(0, 1e6)"); p.wait_for_timeout(300); sh('blad_wysylki'); os.environ['FAIL'] = '0'
    # wznowienie po przeładowaniu bez kodu w adresie
    p.goto(HTML_T); p.wait_for_timeout(2500); log.append(('state', pre + ' po przeładowaniu: ' + p.evaluate("() => __sgStudy.state().phase + ' / ' + __sgStudy.state().cur")))
def shot(p, name): p.screenshot(path=os.path.join(HERE, '..', 'zrzuty', '%s.png') % name)
def state(p): return p.evaluate("() => ({ title: document.getElementById('pTitle').textContent, frame: (document.querySelector('.step[aria-current=\"true\"], .step.on') || {}).textContent || '', cap: (document.getElementById('capTitle')||{}).textContent || '' })")

def settle(p, frac=None, maxs=40):
    for _ in range(maxs * 4):
        st = p.evaluate("() => { const S=__sgTest.state(); return { tw: !__sgTest.controls.enabled, m: S.m, playing: S.playing }; }")
        if not st['tw'] and (frac is None and not st['playing'] or frac is not None and st['m'] >= frac): return st
        p.wait_for_timeout(250)
    return st
def stepclick(p, i): p.evaluate("(i) => document.querySelectorAll('.srow1 .step')[i].click()", i)
def pick(p, q, mobile=False):
    if mobile: p.tap('#mMenuBtn'); p.wait_for_timeout(300); p.tap('#mq'); p.keyboard.type(q); p.wait_for_timeout(300); p.tap('#mqres .qitem')
    else: p.click('#q'); p.keyboard.type(q); p.wait_for_timeout(200); p.keyboard.press('Enter')
    p.wait_for_timeout(700)
scen = sys.argv[1]
with sync_playwright() as pw:
    b = pw.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}), args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    if scen == 'ankieta':
        # SURGITOME-STUDY: cała ankieta — komputer (EN) i telefon (PL), zrzuty an_d*/an_m* w zrzuty/
        for mob in ([False, True] if len(sys.argv) < 3 else [sys.argv[2] == 'mobile']): survey(b, mob)
    elif scen == 'tour':
        p = page_for(b, False)
        for q, name in [(x.split(':')[0], x.split(':')[1]) for x in sys.argv[2].split(',')]:
            pick(p, q); settle(p, 0); shot(p, 't_%s_0' % name)
            steps = p.evaluate("() => [...document.querySelectorAll('.srow1 .step')].map(b=>b.textContent)")
            iv = len(steps) - 3; stepclick(p, iv); settle(p); shot(p, 't_%s_post' % name)
            stepclick(p, len(steps) - 2); p.wait_for_timeout(1500)
            for k in range(60):
                if p.is_visible('#choice'): shot(p, 't_%s_choice' % name); p.keyboard.press('1'); p.wait_for_timeout(400)
                done = p.evaluate("() => document.getElementById('hudNote') ? document.getElementById('hudNote').textContent : ''")
                p.wait_for_timeout(1000)
                if k in (6, 59): shot(p, 't_%s_endo%d' % (name, k))
            log.append(('state', name + ' | ' + p.evaluate("() => document.getElementById('pTitle').textContent")))
    elif scen == 'mobile':
        p = page_for(b, True); shot(p, 'm00_start')
        p.tap('#mMenuBtn'); p.wait_for_timeout(500); shot(p, 'm01_menu')
        p.tap('#mq'); p.keyboard.type('zbiornik'); p.wait_for_timeout(400); shot(p, 'm02_search')
        p.tap('#mqres .qitem'); p.wait_for_timeout(700); shot(p, 'm03_ipaa_early'); settle(p, 0); p.wait_for_timeout(1500); shot(p, 'm03_ipaa')
        steps = p.evaluate("() => [...document.querySelectorAll('.srow1 .step')].length")
        stepclick(p, 4); settle(p); shot(p, 'm05_ipaa_var_end')
        pick(p, 'hartmann', True); settle(p, 0); shot(p, 'm06_hartmann'); stepclick(p, 3); settle(p); shot(p, 'm07_hartmann_post')
        pick(p, 'frey', True); stepclick(p, 4); p.wait_for_timeout(8000); shot(p, 'm08_frey_endo')
        log.append(('state', p.evaluate("() => document.getElementById('mProcName').textContent")))
    elif scen == 'trials':
        # widok podzielony badań: komputer, telefon pionowo i poziomo
        for dev, mob, size in [('d', False, None), ('mp', True, {'width': 390, 'height': 844}), ('ml', True, {'width': 844, 'height': 390})]:
            p = page_for(b, mob, size, preview=True)
            for q in (sys.argv[2].split(',') if len(sys.argv) > 2 else ['ethos', 'scar']):
                pick(p, q, mob); p.wait_for_timeout(1500); settle(p, 0); shot(p, 'tr_%s_%s_1start' % (q, dev))
                stepclick(p, 1)
                for frac in (0.3, 0.55, 0.8):
                    settle(p, frac); shot(p, 'tr_%s_%s_2int%02d' % (q, dev, int(frac * 100)))
                stepclick(p, 2); p.wait_for_timeout(2200); shot(p, 'tr_%s_%s_3post' % (q, dev))
                log.append(('state', dev + ' ' + q + ' | ' + p.evaluate("() => [...document.querySelectorAll('.sh b')].map(x=>x.textContent).join(' / ')")))
    elif scen == 'meso':
        # krezka, naczynia i węzły w hemikolektomiach prawych: zakres resekcji, podwiązanie, usunięcie, stan po
        p = page_for(b, False)
        pick(p, 'hemikolektomia prawa')
        for v in range(3):
            p.evaluate("(v) => document.querySelectorAll('#variants .vbtn')[v].click()", v); p.wait_for_timeout(1500)
            steps = p.evaluate("() => [...document.querySelectorAll('.srow1 .step')].map(b=>b.textContent)")
            stepclick(p, 1); settle(p); shot(p, 'me_v%d_1resect' % v)
            stepclick(p, 2); settle(p, 1.55); shot(p, 'me_v%d_2tie' % v)
            stepclick(p, 3); settle(p); shot(p, 'me_v%d_3remove' % v)
            stepclick(p, 4); settle(p); shot(p, 'me_v%d_4post' % v)
            log.append(('state', p.evaluate("() => document.getElementById('pTitle').textContent")))
    elif scen == 'guz':
        # przesuwalny guz: przeciągnięcie myszą w kadrze „Prawidłowa”, potem przebieg kadrów (guz zostaje przy swoim odcinku)
        p = page_for(b, False); pick(p, 'hemikolektomia prawa'); settle(p, 0); p.wait_for_timeout(800); shot(p, 'gz_0start')
        scr = "(w) => { const v=new THREE.Vector3(...w).project(__sgTest.cam), r=document.getElementById('viewport').getBoundingClientRect(); return [r.left+(v.x+1)/2*r.width, r.top+(1-v.y)/2*r.height]; }"
        a0 = p.evaluate(scr, p.evaluate("() => __sgTest.tumour()"))
        for target, name in [([8.9, 1.0, 0.4], 'desc'), ([-6.4, 0.5, 1.6], 'asc')]:
            a1 = p.evaluate(scr, target)
            p.mouse.move(a0[0], a0[1]); p.mouse.down(); p.mouse.move((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, steps=8); p.mouse.move(a1[0], a1[1], steps=8); p.mouse.up(); p.wait_for_timeout(600)
            log.append(('state', name + ' guz: ' + json.dumps(p.evaluate("() => __sgTest.tumour()")) + ' | zapis: ' + str(p.evaluate("() => localStorage.getItem('surgitome-guz-pos')"))))
            shot(p, 'gz_1moved_' + name)
            for i, fr in [(1, 'resect'), (3, 'remove'), (4, 'post')]:
                stepclick(p, i); settle(p); shot(p, 'gz_2%s_%s' % (name, fr))
            stepclick(p, 0); settle(p, 0); p.wait_for_timeout(800)
            a0 = p.evaluate(scr, p.evaluate("() => __sgTest.tumour()"))
    elif scen == 'zakres':
        # wybór zakresu resekcji: guz przeciągany kolejno wzdłuż jelita grubego, zrzut przy każdym położeniu
        p = page_for(b, False); pick(p, 'wybór zakresu'); p.wait_for_timeout(1500)
        scr = "(w) => { const v=new THREE.Vector3(...w).project(__sgTest.cam), r=document.getElementById('viewport').getBoundingClientRect(); return [r.left+(v.x+1)/2*r.width, r.top+(1-v.y)/2*r.height]; }"
        surf = "(t) => { const L=ANAT._lib, P=L.C_COL.getPointAt(t), T=L.C_COL.getTangentAt(t), n=new THREE.Vector3(0.2,0,1); n.sub(T.clone().multiplyScalar(n.dot(T))).normalize(); return P.addScaledVector(n, L.COL_R(t)*0.97).toArray(); }"
        for tt, name in [(0.02, 'katnica'), (0.25, 'watrobowe'), (0.35, 'poprzecznica'), (0.49, 'sledzionowe'), (0.6, 'zstepnica'), (0.8, 'esica'), (0.88, 'odbytnica_gorna'), (0.93, 'odbytnica_srodkowa'), (0.98, 'odbytnica_dolna')]:
            a0 = p.evaluate(scr, p.evaluate("() => __sgTest.tumour()")); a1 = p.evaluate(scr, p.evaluate(surf, tt))
            p.mouse.move(a0[0], a0[1]); p.mouse.down(); p.mouse.move((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, steps=6); p.mouse.move(a1[0], a1[1], steps=6); p.mouse.up(); p.wait_for_timeout(500)
            log.append(('state', name + ' | ' + p.evaluate("() => document.getElementById('capTitle').textContent")))
            shot(p, 'zk_%s' % name)
    print(json.dumps([l for l in log if 'fonts' not in l[1] and 'ERR_FAILED' not in l[1]], ensure_ascii=False, indent=0)[:3000])
    b.close()
