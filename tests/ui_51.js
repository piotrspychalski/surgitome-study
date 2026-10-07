// SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// Przebieg ankiety (komputer, EN): zgoda blokuje dalej, metryczka, instrukcja, samouczek z krokiem „Rating”, ocena 1–4 i „outside expertise”,
// komentarz, klawisze w panelu oceny, obejrzane warianty i czas, następna/poprzednia pozycja, pytanie dla modułów, wznowienie po przeładowaniu,
// zakończenie wcześniej, SUS/przydatność (walidacja), wysłanie — kompletny payload bez danych osobowych, ponowne wysłanie, błąd wysyłki → pobranie JSON
const {boot,sleep,stored,toAtlas,TEST_CODE}=require('./badanie_boot.js');
const fails=[], allErrs=[]; function ok(c,m){ if(!c) fails.push(m); }
const B4=['esoph','dg','tg','gebp','sleeve','rygb','oagb','ds','bpd','whip','pppd','dp','hj','cdd','drain','liver','lv-guz','lv-b23','lv-rh','lv-lh','lv-alpps','oltx','sb','zakres','rh','lh','ar','ira','ipaa','hartmann','ileo'];
const h2=b=>{ const e=b.D.querySelector('#stOv h2'); return e&&!b.$('stOv').hidden?e.textContent:''; };
const key=(b,k,t)=>(t||b.D).dispatchEvent(new b.w.KeyboardEvent('keydown',{key:k,bubbles:true}));
const cur=b=>b.w.ANAT.PROCS[b.w.__sgTest.state().an].id;
function copyStorage(w){ const s={}, ss={}; for(let i=0;i<w.localStorage.length;i++){ const k=w.localStorage.key(i); s[k]=w.localStorage.getItem(k); } for(let i=0;i<w.sessionStorage.length;i++){ const k=w.sessionStorage.key(i); ss[k]=w.sessionStorage.getItem(k); } return {store:s,session:ss}; }
async function answerFinal(b){
  const SUS=[5,1,5,1,5,1,5,1,5,1];
  SUS.forEach((v,i)=>b.D.querySelector('input[name=stSus'+i+'][value="'+v+'"]').click());
  ['teaching','patients','imaging','recommend'].forEach((k,i)=>b.D.querySelector('input[name=stUse_'+k+'][value="'+(i+2)+'"]').click());
  const t=b.$('stOpen_missing'); t.value='Stoma reversal'; t.dispatchEvent(new b.w.Event('input'));
  await sleep(450);
}
(async()=>{
  let b=boot({k:TEST_CODE,store:{},langs:['en-US']}); const {$}=b; await sleep(500);
  // 1. zgoda blokuje dalej
  ok(h2(b)==='Participant information','start: '+h2(b)); ok($('stStart').disabled,'„Start” aktywny bez zgody');
  $('stStart').click(); await sleep(30); ok(h2(b)==='Participant information','bez zgody przechodzi dalej');
  $('stConsent').click(); ok(!$('stStart').disabled,'zgoda nie odblokowuje'); $('stStart').click(); await sleep(30);
  ok(h2(b)==='About you','po zgodzie: '+h2(b)); ok(b.w.__sgStudy.state().consent&&b.w.__sgStudy.state().started,'brak czasu zgody / startu');
  // 2. metryczka: walidacja; rezydent → rok szkolenia zamiast lat od specjalizacji; „inna” → pole tekstowe
  $('stDemoNext').click(); await sleep(30); ok($('stDemoErr').textContent==='Please answer all questions.','brak komunikatu walidacji metryczki');
  ok([...$('stCountry').options].length>200&&[...$('stCountry').options].some(o=>o.value==='DE'&&o.textContent==='Germany')&&![...$('stCountry').options].some(o=>o.value==='PL'),'lista krajów (bez Polski — osobna opcja)');
  ok($('stCountry').closest('.stsub').hidden,'lista krajów widoczna przed wyborem „Another country”');
  b.D.querySelector('input[name=stRole][value=resident]').click(); await sleep(10);
  ok(!$('stResYear').closest('.stq').hidden&&$('stYears').closest('.stq').hidden&&!b.D.querySelector('input[name=stField]').closest('.stq').hidden&&$('stSpec').closest('.stq').hidden,'rezydent: pola roku szkolenia / lat od specjalizacji');
  b.D.querySelector('input[name=stField][value=other]').click(); ok(!$('stFieldOther').hidden,'„Other” bez pola tekstowego');
  b.D.querySelector('input[name=stField][value=colorectal]').click(); ok($('stFieldOther').hidden,'pole „Other” nie znika');
  await toAtlas(b,{role:'resident',year:'4',field:'hpb'}).catch(e=>fails.push('toAtlas: '+e));
  const S0=b.w.__sgStudy.state();
  ok(S0.phase==='atlas'&&$('stOv').hidden,'nie dotarto do atlasu: '+S0.phase);
  ok(S0.demo.role==='resident'&&S0.demo.residentYear==='4'&&S0.demo.yearsSinceSpec===null&&S0.demo.field==='hpb'&&S0.demo.country==='PL'&&S0.demo.countryChoice==='PL'&&S0.demo.usedBefore===false&&S0.demo.specialty===null,'metryczka: '+JSON.stringify(S0.demo));
  ok(S0.sel&&S0.sel.length===31,'wybór pozycji: '+(S0.sel&&S0.sel.length));
  ok(b.D.documentElement.classList.contains('study')&&!$('stBar').hidden&&!$('stRate').hidden,'brak paska / panelu oceny');
  // 3. samouczek po wejściu do atlasu, z krokiem o ocenie; Esc pomija
  await sleep(500); ok(!$('tour').hidden,'samouczek nie wystartował po instrukcji');
  ok(/ \/ 7$/.test($('tourNum').textContent),'liczba kroków samouczka: '+$('tourNum').textContent);
  key(b,'Escape'); await sleep(30); ok($('tour').hidden,'Esc nie zamyka samouczka');
  // 4. panel oceny: pozycja 1, pytanie, przypomnienie o wariantach
  ok(cur(b)==='esoph'&&b.w.__sgTest.state().cat==='eso','start nie na pozycji 1 w kategorii: '+cur(b)+' / '+b.w.__sgTest.state().cat);
  ok($('stRNum').textContent==='Item 1 of 31'&&$('stRName').textContent==='Oesophagectomy','nagłówek panelu: '+$('stRNum').textContent+' | '+$('stRName').textContent);
  ok($('stRQ').textContent==='The 3D representation of the postoperative anatomy is accurate','pytanie: '+$('stRQ').textContent);
  ok(/has 7 variants/.test($('stRVar').textContent)&&!$('stRSeen').hidden,'przypomnienie o 7 wariantach: '+$('stRVar').textContent);
  ok($('stRL2').textContent==='somewhat accurate (major revision needed)'&&$('stRNAL').textContent==='Outside my expertise / cannot judge','etykiety skali');
  // 5. ocena, ✓ na zakładce, postęp
  $('stR3').click(); await sleep(30);
  let it=b.w.__sgStudy.state().items.esoph; ok(it.r===3&&!it.na&&it.at,'ocena 3 nie zapisana: '+JSON.stringify(it));
  ok($('stProgTxt').textContent==='Rated: 1 / 31','postęp: '+$('stProgTxt').textContent);
  const tabEso=[...b.D.querySelectorAll('#tabs .tab')].find(t=>t.textContent.indexOf('Oesophagectomy')===0);
  ok(tabEso&&tabEso.querySelector('.stck'),'brak ✓ na zakładce'); ok(/not viewed/.test($('stRSaved').textContent),'brak uwagi o nieobejrzanych wariantach: '+$('stRSaved').textContent);
  ok(stored(b.w).items.esoph.r===3,'ocena nie trafiła do localStorage');
  $('stRNA').click(); await sleep(30); it=b.w.__sgStudy.state().items.esoph;
  ok(it.na&&it.r===null&&!$('stR3').checked&&$('stProgTxt').textContent==='Rated: 1 / 31','„outside expertise”: '+JSON.stringify(it));
  $('stR4').click(); await sleep(30); it=b.w.__sgStudy.state().items.esoph; ok(it.r===4&&!it.na&&!$('stRNA').checked,'ocena po „outside expertise”');
  // 6. komentarz i klawisze w panelu (cyfry/strzałki nie zmieniają zabiegu ani kadru)
  const ta=$('stRCom'); ta.focus(); ta.value='Blind stump too long in the Ivor Lewis side-to-side variant'; ta.dispatchEvent(new b.w.Event('input'));
  const f0=b.w.__sgTest.state().frame; key(b,'2',ta); key(b,'ArrowRight',ta); key(b,' ',ta); await sleep(500);
  ok(cur(b)==='esoph'&&b.w.__sgTest.state().frame===f0,'klawisze w komentarzu sterują atlasem');
  ok(stored(b.w).items.esoph.c==='Blind stump too long in the Ivor Lewis side-to-side variant','komentarz nie zapisany');
  ta.blur();
  // 7. obejrzane warianty (≥ 2 s na wariancie) i czas na pozycji
  await sleep(2300); b.D.querySelectorAll('#variants .vbtn')[1].click(); await sleep(2600);
  it=b.w.__sgStudy.state().items.esoph;
  ok(it.seen.length===2&&$('stRSeen').textContent==='Variants viewed: 2 / 7','obejrzane warianty: '+JSON.stringify(it.seen)+' | '+$('stRSeen').textContent);
  ok(it.ms>=4000,'czas na pozycji: '+it.ms);
  // 8. następna / poprzednia pozycja
  $('stRNext').click(); await sleep(500);
  ok(cur(b)==='dg'&&b.w.__sgTest.state().cat==='upper'&&$('stRNum').textContent==='Item 2 of 31','następna pozycja: '+cur(b));
  ok(!$('stR4').checked&&$('stRCom').value==='','panel nie wyczyszczony dla nowej pozycji');
  $('stR2').click(); $('stRPrev').click(); await sleep(500);
  ok(cur(b)==='esoph'&&$('stR4').checked&&$('stRCom').value.indexOf('Blind stump')===0,'powrót do pozycji 1 bez jej oceny');
  ok($('stRPrev').disabled,'„Previous item” aktywne na pozycji 1');
  // 9. moduły: inne pytanie
  [...b.D.querySelectorAll('#cats .cat')].find(c=>c.textContent==='Liver').click(); await sleep(400);
  ok(cur(b)==='liver'&&$('stRQ').textContent==='The content is anatomically and clinically accurate'&&/teaching module/.test($('stRNum').textContent),'pytanie modułu: '+cur(b)+' | '+$('stRQ').textContent);
  ok(/go through all of its frames/.test($('stRVar').textContent)&&$('stRSeen').hidden,'pozycja bez wariantów: '+$('stRVar').textContent);
  // ostatnia pozycja: „Next” zamienia się w „Finish survey”
  [...b.D.querySelectorAll('#cats .cat')].find(c=>c.textContent==='Large bowel').click(); await sleep(300);
  const tabs=[...b.D.querySelectorAll('#tabs .tab')]; tabs[tabs.length-1].click(); await sleep(500);
  ok(cur(b)==='ileo'&&$('stRNext').textContent==='Finish survey','ostatnia pozycja: '+cur(b)+' | '+$('stRNext').textContent);
  allErrs.push(...b.errs);
  // 10. wznowienie po przeładowaniu (bez kodu w adresie): faza, pozycja, oceny, bez ponownego samouczka
  await sleep(1100); b.w.__sgStudy.save(); const snap=copyStorage(b.w);
  let r=boot({store:snap.store,session:snap.session,langs:['en-US']}); await sleep(700);
  const RS=r.w.__sgStudy.state();
  ok(RS&&RS.phase==='atlas'&&r.$('stOv').hidden&&cur(r)==='ileo','wznowienie: '+(RS&&RS.phase)+' / '+cur(r));
  ok(RS.items.esoph.r===4&&RS.items.dg.r===2&&RS.items.esoph.c.indexOf('Blind stump')===0,'wznowienie: oceny');
  ok(r.$('stProgTxt').textContent==='Rated: 2 / 31','wznowienie: postęp '+r.$('stProgTxt').textContent);
  await sleep(500); ok(r.$('tour').hidden,'samouczek pokazany ponownie po wznowieniu');
  // 11. zakończenie wcześniej → potwierdzenie → pytania końcowe; walidacja SUS i przydatności
  r.$('stFinBtn').click(); await sleep(30);
  ok(h2(r)==='Finish the survey?'&&/rated 2 of 31/.test(r.D.querySelector('#stOv').textContent),'potwierdzenie zakończenia: '+h2(r));
  [...r.D.querySelectorAll('#stOv button')].find(x=>x.textContent==='Continue rating').click(); await sleep(30);
  ok(r.$('stOv').hidden&&r.w.__sgStudy.state().phase==='atlas','„Continue rating” nie wraca do atlasu');
  r.$('stFinBtn').click(); r.$('stFinGo').click(); await sleep(30);
  ok(h2(r)==='Final questions'&&r.w.__sgStudy.state().finishedEarly,'pytania końcowe: '+h2(r));
  ok(r.D.querySelectorAll('.stsus .stsq').length===14&&r.D.querySelector('.stsqt').textContent==='I think that I would like to use this system frequently.','SUS: liczba pytań / brzmienie');
  r.$('stSubmit').click(); await sleep(30);
  ok(/14 missing/.test(r.$('stSendBox').textContent)&&r.D.querySelectorAll('.stmiss').length===14&&r.fetches.length===0,'walidacja pytań końcowych: '+r.$('stSendBox').textContent);
  await answerFinal(r);
  ok(r.D.querySelectorAll('.stmiss').length===0,'zaznaczenie braków nie znika');
  // 12. wysłanie: jedno żądanie do Web3Forms, temat z kodem, kompletny payload bez danych osobowych
  r.$('stSubmit').click(); await sleep(300);
  ok(r.fetches.length===1&&r.fetches[0].url==='https://api.web3forms.com/submit','żądań: '+r.fetches.length);
  const body=r.fetches[0].body, p=JSON.parse(body.data);
  ok(body.subject==='SURGITOME-STUDY '+TEST_CODE&&body.access_key&&body.from_name==='SURGITOME-STUDY','temat / klucz: '+body.subject);
  ok(body['SUS 1–10']==='5 1 5 1 5 1 5 1 5 1'&&body['Rola']==='resident'&&body['SUS']===100,'pola czytelne: '+body['SUS 1–10']+' | '+body['Rola']);
  const need=['study','schema','code','version','lang','device','consent','started','submitted','submission','activeMs','demographics','selected','rated','total','finishedEarly','items','sus','susScore','susLang','susHelp','usefulness','open'];
  ok(need.every(k=>k in p),'brak pól: '+need.filter(k=>!(k in p)));
  ok(p.study==='SURGITOME-STUDY'&&p.schema===2&&p.selected.length===31&&p.code===TEST_CODE&&p.lang==='en'&&p.version.base==='v1.1.0'&&/^[0-9a-f]{40}/.test(p.version.sha),'nagłówek payloadu: '+JSON.stringify(p.version));
  ok(p.device.type==='desktop'&&/^\d+x\d+$/.test(p.device.viewport),'urządzenie: '+JSON.stringify(p.device));
  ok(p.items.length===31&&JSON.stringify(p.items.map(x=>x.id))===JSON.stringify(B4),'pozycje: '+p.items.length);
  const e0=p.items[0], e1=p.items[1], liv=p.items.find(x=>x.id==='liver');
  ok(e0.rating===4&&!e0.na&&e0.comment.indexOf('Blind stump')===0&&e0.variants===7&&e0.variantsSeen===2&&e0.ms>=4000&&e0.kind==='operation'&&e0.n===1&&e0.selected===true,'pozycja 1: '+JSON.stringify(e0));
  ok(e1.rating===2&&liv.kind==='module'&&liv.rating===null&&!liv.na,'pozycje 2 / liver: '+JSON.stringify([e1,liv]));
  ok(p.rated===2&&p.total===31&&p.finishedEarly===true,'liczba ocenionych');
  ok(JSON.stringify(p.sus)==='[5,1,5,1,5,1,5,1,5,1]'&&p.susScore===100&&p.susLang==='en'&&p.susHelp===null,'SUS: '+p.sus+' → '+p.susScore);
  ok(p.usefulness.teaching===2&&p.usefulness.recommend===5&&Object.keys(p.usefulness).length===4&&p.usefulnessSet==='surgeon'&&p.ratingMeasure==='accuracy'&&p.open.missing==='Stoma reversal','przydatność / pytania otwarte / miara: '+p.usefulnessSet+' '+p.ratingMeasure);
  ok(Date.parse(p.started)<=Date.parse(p.submitted)&&p.consent.info==='2026-10-07-2'&&p.submission===1,'czasy / wersja informacji');
  ok(!/@|"ip"|"email"|"name"/i.test(body.data),'dane osobowe w payloadzie');
  ok(h2(r)==='Thank you!','po wysłaniu: '+h2(r));
  // 13. ponowne wysłanie: powrót do atlasu, zmiana oceny, drugie zgłoszenie z numerem 2
  r.$('stBackAtlas').click(); await sleep(50); ok(r.$('stOv').hidden&&r.w.__sgStudy.state().phase==='atlas','„Back to the atlas” po wysłaniu');
  r.$('stR1').click(); r.$('stFinBtn').click(); r.$('stFinGo').click(); await sleep(30);
  ok(r.D.querySelector('input[name=stSus0][value="5"]').checked,'pytania końcowe nie wypełnione ponownie');
  r.$('stSubmit').click(); await sleep(300);
  const p2=JSON.parse(r.fetches[1].body.data); ok(p2.submission===2&&p2.items[30].rating===1,'drugie zgłoszenie: '+p2.submission);
  allErrs.push(...r.errs);
  // 14. błąd wysyłki (odpowiedź serwisu i brak sieci): komunikat, pobranie JSON, instrukcja e-mail; stan zachowany
  for(const mode of ['fail','net']){
    const s2=copyStorage(r.w); const st=JSON.parse(s2.store['surgitome-study:'+TEST_CODE]); st.phase='final'; s2.store['surgitome-study:'+TEST_CODE]=JSON.stringify(st);
    const f=boot({store:s2.store,session:s2.session,fetch:mode,langs:['en-US']}); await sleep(700);
    f.$('stSubmit').click(); await sleep(300);
    const txt=f.$('stSendBox').textContent;
    ok(/could not be sent/.test(txt)&&(mode!=='fail'||/Limit exceeded/.test(txt))&&/SURGITOME-STUDY TEST23/.test(txt)&&f.$('stDownload'),'błąd wysyłki ('+mode+'): '+txt);
    let dl=null; f.w.HTMLAnchorElement.prototype.click=function(){ dl=this.download; }; f.$('stDownload').click();
    ok(dl&&/^SURGITOME-STUDY-TEST23-.*\.json$/.test(dl),'pobranie JSON ('+mode+'): '+dl);
    ok(f.w.__sgStudy.state().phase==='final'&&h2(f)==='Final questions','po błędzie zmiana ekranu');
    allErrs.push(...f.errs);
  }
  console.log('zgoda, metryczka, ocena, warianty, czas, wznowienie, wysłanie (×2), błąd wysyłki: sprawdzone');
  console.log('errors',JSON.stringify(allErrs.concat(fails))); process.exit(0);
})();
