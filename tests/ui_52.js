// SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// Telefon i język polski: przełącznik PL/EN na ekranach ankiety i w atlasie, panel oceny jako arkusz otwierany przyciskiem „Oceń”,
// ✓ w menu ☰, samouczek z krokiem „Ocena”, SUS w oryginale angielskim z tłumaczeniem własnym (*) pod każdym zdaniem, payload (język, typ urządzenia: telefon)
const {boot,sleep,toAtlas,TEST_CODE}=require('./badanie_boot.js');
const fails=[], allErrs=[]; function ok(c,m){ if(!c) fails.push(m); }
const h2=b=>{ const e=b.D.querySelector('#stOv h2'); return e&&!b.$('stOv').hidden?e.textContent:''; };
const phone=w=>{ Object.defineProperty(w.screen,'width',{value:390}); Object.defineProperty(w.screen,'height',{value:844});
  w.matchMedia=q=>({matches:/max-width|pointer: coarse/.test(q),addEventListener(){}}); };
(async()=>{
  const b=boot({k:TEST_CODE,store:{},mobile:true,langs:['en-GB'],before:phone}); const {$,D,w}=b; await sleep(500);
  ok(D.documentElement.classList.contains('mobile'),'brak trybu telefonu');
  ok(h2(b)==='Participant information','start EN: '+h2(b));
  D.querySelector('#stOv .stlang').click(); await sleep(30);
  ok(h2(b)==='Informacja dla uczestnika'&&w.__sgStudy.state().lang==='pl'&&D.documentElement.lang==='pl','przełączenie na PL: '+h2(b));
  ok(D.querySelector('#stOv').textContent.includes('[numer i data do uzupełnienia]'),'PL: brak miejsca na opinię komisji');
  ok(D.querySelector('#stOv .stlang').textContent==='English','przycisk języka po polsku');
  await toAtlas(b,{country:'DE',role:'surgeon',field:'other',years:'>=20',res:'>=100',used:'yes'}).catch(e=>fails.push('toAtlas: '+e));
  // „inna” dziedzina bez opisu blokuje przejście
  ok(w.__sgStudy.state().phase==='demo'&&$('stDemoErr').textContent==='Odpowiedz na wszystkie pytania.','„Inna” bez opisu przepuszcza: '+w.__sgStudy.state().phase);
  ok(/wybierz chirurgię ogólną/.test($('stFieldHint').textContent)&&!$('stFieldHint').closest('.stq').hidden,'PL: brak podpowiedzi przy dziedzinie');
  ok(/bez wąskiego profilu/.test(D.querySelector('input[name=stField][value=general]').parentNode.textContent)&&D.querySelector('input[name=stField][value=other]').parentNode.textContent==='Inna dziedzina','PL: etykiety dziedziny');
  $('stFieldOther').value='chirurgia endokrynna'; $('stFieldOther').dispatchEvent(new w.Event('input'));
  $('stDemoNext').click(); await sleep(30); ok(h2(b)==='Które pozycje chcesz ocenić?','wybór pozycji PL: '+h2(b));
  ok($('stSelCount').textContent==='Zaznaczone: 0 / 31','licznik wyboru: '+$('stSelCount').textContent);
  $('stSelAll').click(); $('stSelNext').click(); await sleep(30); ok(h2(b)==='Jak oceniać','instrukcja PL: '+h2(b));
  ok(D.querySelectorAll('#stOv .stlist li').length===5,'instrukcja: punktów '+D.querySelectorAll('#stOv .stlist li').length);
  $('stHowGo').click(); await sleep(600);
  // samouczek na telefonie: 7 kroków, ostatni „Ocena”
  ok(!$('tour').hidden,'samouczek nie wystartował');
  for(let i=0;i<6;i++){ $('tourNext').click(); await sleep(150); }
  ok($('tourTitle').textContent==='Ocena'&&/Oceń/.test($('tourText').textContent)&&$('tourNum').textContent==='Samouczek · 7 / 7','ostatni krok samouczka: '+$('tourTitle').textContent+' | '+$('tourNum').textContent);
  $('tourNext').click(); await sleep(50); ok($('tour').hidden,'„Gotowe” nie zamyka samouczka');
  // panel oceny jako arkusz
  ok(D.documentElement.classList.contains('study')&&!$('stBar').hidden,'pasek badania');
  ok($('stRateBtn').textContent==='Oceń'&&$('stFinBtn').textContent==='Zakończ'&&$('stFinBtn').getAttribute('aria-label')==='Zakończ ankietę'&&$('stProgTxt').textContent==='0 / 31'&&$('stProg').getAttribute('aria-label')==='Ocenione: 0 / 31'&&$('stHelpBtn').getAttribute('aria-label')==='Instrukcja','pasek PL (telefon): '+$('stRateBtn').textContent+' | '+$('stFinBtn').textContent+' | '+$('stProgTxt').textContent);
  ok(!$('stRate').classList.contains('open'),'arkusz otwarty od razu');
  $('stRateBtn').click(); ok($('stRate').classList.contains('open')&&$('stRateBtn').getAttribute('aria-expanded')==='true','„Oceń” nie otwiera arkusza');
  ok($('stRNum').textContent==='Pozycja 1 z 31'&&$('stRName').textContent==='Esofagektomia'&&$('stRQ').textContent==='Trójwymiarowe przedstawienie anatomii pooperacyjnej jest trafne','panel PL: '+$('stRNum').textContent+' | '+$('stRQ').textContent);
  ok(/ma 7 wariantów/.test($('stRVar').textContent)&&$('stRL4').textContent==='bardzo trafne'&&$('stRNAL').textContent==='Poza moją dziedziną / nie potrafię ocenić','teksty skali PL: '+$('stRVar').textContent);
  $('stR2').click(); await sleep(30); ok(/Zapisano/.test($('stRSaved').textContent),'brak „Zapisano”');
  $('stRClose').click(); ok(!$('stRate').classList.contains('open'),'„Zamknij” nie zamyka arkusza');
  // ✓ w menu ☰
  $('mMenuBtn').click(); await sleep(30);
  const chip=[...D.querySelectorAll('#mMenuBody .mchip')].find(c=>c.textContent.indexOf('Esofagektomia')===0);
  ok(chip&&chip.querySelector('.stck'),'brak ✓ w menu telefonu'); $('mMenuClose').click();
  // następna pozycja z arkusza zamyka arkusz; liczba wariantów w dopełniaczu (4 warianty)
  $('stRateBtn').click(); $('stRNext').click(); await sleep(500);
  ok(!$('stRate').classList.contains('open')&&$('stRNum').textContent==='Pozycja 2 z 31'&&/ma 4 warianty/.test($('stRVar').textContent),'następna pozycja: '+$('stRNum').textContent+' | '+$('stRVar').textContent);
  // przełącznik języka w atlasie (fLang) zmienia ankietę
  $('fLang').click(); await sleep(30);
  ok(w.__sgStudy.state().lang==='en'&&$('stRNum').textContent==='Item 2 of 31'&&$('stRateBtn').textContent==='Rate','fLang → EN: '+$('stRNum').textContent);
  $('fLang').click(); await sleep(30); ok(w.__sgStudy.state().lang==='pl','fLang → PL');
  // pytania końcowe po polsku; SUS w oryginale angielskim z polską notą
  $('stFinBtn').click(); await sleep(30); ok(h2(b)==='Zakończyć ankietę?','potwierdzenie PL: '+h2(b)); $('stFinGo').click(); await sleep(30);
  ok(h2(b)==='Pytania końcowe','pytania końcowe PL: '+h2(b));
  ok(D.querySelector('.stsqt').textContent==='I think that I would like to use this system frequently.'&&/oryginalnym brzmieniu angielskim/.test(D.querySelector('#stOv').textContent),'SUS w PL: brak oryginału lub noty');
  const pls=[...D.querySelectorAll('.stsqpl')];
  ok(pls.length===10&&pls[0].textContent==='Myślę, że chciał(a)bym często korzystać z tego systemu.*'&&pls.every(x=>/\*$/.test(x.textContent)),'SUS w PL: tłumaczenia z * pod oryginałem: '+pls.length);
  ok($('stSusFoot')&&$('stSusFoot').textContent==='* tłumaczenie własne','SUS w PL: brak przypisu „* tłumaczenie własne”');
  ok(/Strongly disagree\s*zdecydowanie się nie zgadzam\*/.test(D.querySelector('.stsus .stanch').textContent),'SUS w PL: kotwice bez tłumaczenia: '+D.querySelector('.stsus .stanch').textContent);
  ok([...D.querySelectorAll('.stsqt')][10].textContent==='SURGITOME byłby przydatny w nauczaniu studentów i rezydentów.','przydatność PL');
  [5,1,4,2,4,2,4,2,4,2].forEach((v,i)=>D.querySelector('input[name=stSus'+i+'][value="'+v+'"]').click());
  ['teaching','patients','imaging','recommend'].forEach(k=>D.querySelector('input[name=stUse_'+k+'][value="4"]').click());
  $('stSubmit').click(); await sleep(300);
  ok(b.fetches.length===1,'wysłanie: '+b.fetches.length);
  const p=b.fetches.length&&JSON.parse(b.fetches[0].body.data);
  ok(p&&p.lang==='pl'&&p.susLang==='en'&&p.susHelp==='pl-own'&&p.susScore===80,'payload: język / SUS '+(p&&p.susScore));
  ok(p&&p.device.type==='phone'&&p.device.layout==='mobile'&&p.device.screen==='390x844','urządzenie: '+JSON.stringify(p&&p.device));
  ok(p&&p.demographics.field==='other'&&p.demographics.fieldOther==='chirurgia endokrynna'&&p.demographics.yearsSinceSpec==='>=20'&&p.demographics.residentYear===null&&p.demographics.country==='DE'&&p.demographics.countryChoice==='other'&&p.demographics.role==='surgeon','metryczka: '+JSON.stringify(p&&p.demographics));
  ok(h2(b)==='Dziękuję!','podziękowanie PL: '+h2(b));
  allErrs.push(...b.errs);
  console.log('telefon, PL, arkusz oceny, menu, samouczek, SUS, payload: sprawdzone');
  console.log('errors',JSON.stringify(allErrs.concat(fails))); process.exit(0);
})();
