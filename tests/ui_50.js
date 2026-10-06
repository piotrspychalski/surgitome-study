// SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// Dostęp: bez kodu / zły kod / dobry kod (?k=, wpisany ręcznie, wznowienie z pamięci sesji i z localStorage), kod usuwany z adresu,
// brak WebCrypto, GoatCounter bez parametrów adresu, klawisze nie sterują atlasem pod ekranem ankiety, bez „Zgłoś uwagę”, informacji startowej i badań
const {boot,sleep,TEST_CODE,HTML}=require('./badanie_boot.js');
const fails=[], allErrs=[]; function ok(c,m){ if(!c) fails.push(m); }
const h2=b=>{ const e=b.D.querySelector('#stOv h2'); return e?e.textContent:''; };
const gateMsg=b=>{ const e=b.$('stGateMsg'); return e?e.textContent:''; };
(async()=>{
  // 1. bez kodu
  let b=boot({store:{},fresh:true}); await sleep(400); allErrs.push(...b.errs);
  ok(!b.$('stOv').hidden&&h2(b)==='Invitation required','bez kodu: brak ekranu zaproszenia ('+h2(b)+')');
  ok(gateMsg(b)==='','bez kodu: komunikat błędu '+gateMsg(b));
  ok(b.$('stBar').hidden&&!b.D.documentElement.classList.contains('study'),'bez kodu: pasek badania widoczny');
  ok(b.$('intro').hidden,'bez kodu: informacja startowa SURGITOME pokazana');
  ok(b.$('stOv').parentElement===b.D.body&&b.$('stRate').parentElement===b.$('main')&&b.$('stBar').parentElement===b.$('app'),'ekran ankiety / panel oceny / pasek w złym miejscu drzewa DOM');
  ok(!b.D.documentElement.classList.contains('stov'),'pod ekranem zaproszenia (bez sesji) wstrzymane renderowanie 3D'); ok(b.$('tour').hidden,'bez kodu: samouczek pokazany');
  ok(b.D.querySelector('#stOv a[href="mailto:piotr.spychalski@gumed.edu.pl"]'),'bez kodu: brak kontaktu');
  ok(b.w.getComputedStyle(b.$('fbBtn')).display==='none','przycisk „Zgłoś uwagę” widoczny');
  const cap0=b.$('capTitle').textContent; b.D.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); await sleep(500);
  ok(b.$('capTitle').textContent===cap0,'strzałka przewija kadr pod ekranem zaproszenia');
  b.D.querySelector('#stOv .stlang').click(); await sleep(50);
  ok(h2(b)==='Wymagane zaproszenie'&&b.w.localStorage.getItem('surgitome-study-lang')==='pl','zaproszenie PL: '+h2(b));
  // ręczne wpisanie kodu (małe litery, spacja)
  b.$('stCode').value=' test 23'; b.D.querySelector('#stOv form').dispatchEvent(new b.w.Event('submit',{cancelable:true})); await sleep(600);
  ok(h2(b)==='Informacja dla uczestnika','kod wpisany ręcznie nie otwiera ankiety (PL po wyborze na ekranie zaproszenia): '+h2(b));
  ok(b.w.sessionStorage.getItem('surgitome-study-k')===TEST_CODE&&b.w.localStorage.getItem('surgitome-study-last')===TEST_CODE,'kod nie zapamiętany');
  // 2. zły kod: niedozwolone znaki i kod spoza listy
  for(const k of ['O0I1AB','ABCDEF']){
    b=boot({k,store:{}}); await sleep(600); allErrs.push(...b.errs);
    ok(h2(b)==='Invitation required'&&gateMsg(b)==='This code is not valid. Please check it and try again.','zły kod '+k+': '+h2(b)+' | '+gateMsg(b));
    ok(b.w.location.search==='','zły kod '+k+' został w adresie: '+b.w.location.search);
    ok(!b.w.sessionStorage.getItem('surgitome-study-k'),'zły kod zapamiętany');
    b.$('stCode').value='ZZZZZZ'; b.D.querySelector('#stOv form').dispatchEvent(new b.w.Event('submit',{cancelable:true})); await sleep(600);
    ok(gateMsg(b)==='This code is not valid. Please check it and try again.','zły kod wpisany ręcznie: '+gateMsg(b));
  }
  // 3. dobry kod w adresie (małe litery): informacja dla uczestnika, kod usunięty z adresu (zostaje reszta parametrów)
  b=boot({url:'https://x.test/surgitome-study/?ref=mail&k=test23#x',store:{}}); await sleep(600); allErrs.push(...b.errs);
  ok(h2(b)==='Participant information','dobry kod: '+h2(b)); ok(b.w.location.search==='?ref=mail'&&b.w.location.hash==='#x','adres po usunięciu kodu: '+b.w.location.href);
  ok(b.w.__sgStudy.state().code===TEST_CODE&&b.w.__sgStudy.state().lang==='en','stan sesji / język domyślny EN');
  ok(b.D.documentElement.classList.contains('stov'),'pod ekranami ankiety renderowanie 3D nie jest wstrzymane (klasa stov)');
  ok(b.D.querySelector('#stOv').textContent.includes('[number and date to be added]'),'brak miejsca na opinię komisji bioetycznej');
  // 4. wznowienie bez kodu w adresie: z sessionStorage, z localStorage; nieaktualny zapamiętany kod — zaproszenie bez komunikatu błędu
  b=boot({session:{'surgitome-study-k':TEST_CODE},store:{}}); await sleep(600);
  ok(h2(b)==='Participant information','wznowienie z sessionStorage: '+h2(b));
  b=boot({store:{'surgitome-study-last':TEST_CODE}}); await sleep(600);
  ok(h2(b)==='Participant information','wznowienie z localStorage: '+h2(b));
  b=boot({store:{'surgitome-study-last':'ABCDEF'}}); await sleep(600);
  ok(h2(b)==='Invitation required'&&gateMsg(b)===''&&!b.w.localStorage.getItem('surgitome-study-last'),'nieaktualny kod: '+h2(b)+' | '+gateMsg(b));
  // 5. przeglądarka bez WebCrypto
  b=boot({k:TEST_CODE,noCrypto:true,store:{}}); await sleep(400);
  ok(/cannot verify/.test(gateMsg(b)),'brak WebCrypto: '+gateMsg(b));
  // 6. GoatCounter (tylko *.github.io): ścieżka bez parametrów adresu, zdarzenia zabiegów z przedrostkiem study/
  const gcScript=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>/location.hostname/.test(s)&&/gc.zgo.at/.test(s));
  b=boot({url:'https://piotrspychalski.github.io/surgitome-study/?k='+TEST_CODE,store:{}}); b.w.eval(gcScript); await sleep(600);
  ok(b.w.goatcounter&&b.w.goatcounter.path('/surgitome-study/?k=ABC&x=1')==='/surgitome-study/','GoatCounter: ścieżka z parametrami');
  ok(b.w.location.search==='','kod w adresie przed wczytaniem GoatCountera');
  ok(/'study\/zabieg\/'/.test(HTML),'zdarzenia zabiegów bez przedrostka study/');
  // 7. bez badań ETHOS/SCAR
  ok(!b.w.ANAT.PROCS.some(p=>p.split||p.cat==='trials')&&!b.w.ANAT.CATS.some(c=>c.id==='trials'),'badania w ANAT');
  ok(b.w.__sgStudy.items.length===31,'pozycji do oceny: '+b.w.__sgStudy.items.length);
  allErrs.push(...b.errs);
  console.log('zaproszenie, zły kod, dobry kod, wznowienie, WebCrypto, GoatCounter: sprawdzone');
  console.log('errors',JSON.stringify(allErrs.concat(fails))); process.exit(0);
})();
