// SURGITOME — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// Samouczek w SURGITOME-STUDY: startuje po instrukcji ankiety (raz na kod, bez informacji startowej), 7 kroków (ostatni: panel oceny i pasek postępu)
// z wycięciami w przyciemnieniu, klawisze, podświetlony przycisk do kliknięcia (język), EN, brak ponownego startu po wznowieniu, powtórka z opisu i z menu telefonu
const {boot,sleep,toAtlas}=require('./badanie_boot.js');
const fails=[], allErrs=[]; function ok(c,m){ if(!c) fails.push(m); }
// położenia elementów (JSDOM nie liczy układu): [x, y, szerokość, wysokość] w oknie 1024×768
const RD={btnLang:[930,12,78,32],q:[300,10,400,36],subbar:[0,88,1024,80],btnPrev:[16,690,92,38],strip:[118,690,700,38],btnNext:[826,690,92,38],fLbl:[650,236,42,42],fInfo:[650,140,42,42],viewport:[0,168,700,520],btnPlay:[16,736,90,30],stRate:[704,168,320,520],stBar:[0,56,1024,32]};
const RM={fLang:[970,190,42,42],mq:[24,330,976,40],mMenuBtn:[60,8,950,40],mDock:[0,700,1024,60],fLbl:[970,240,42,42],fInfo:[970,140,42,42],viewport:[0,88,1024,600],stBar:[0,48,1024,36]};
function geom(mobile){ return w=>{
  const R=mobile?RM:RD;
  w.Element.prototype.getBoundingClientRect=function(){ const k=this.id||(this.classList.contains('subbar')?'subbar':''), r=R[k];
    if(!r||this.closest('[hidden]')) return {left:0,top:0,right:0,bottom:0,width:0,height:0,x:0,y:0};
    return {left:r[0],top:r[1],width:r[2],height:r[3],right:r[0]+r[2],bottom:r[1]+r[3],x:r[0],y:r[1]}; };
  w.addEventListener('DOMContentLoaded',()=>{});
}; }
function cardSize(b){ const card=b.$('tourCard'); Object.defineProperty(card,'offsetWidth',{get:()=>360}); Object.defineProperty(card,'offsetHeight',{get:()=>210}); }
const key=(w,k)=>w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));
const holes=w=>[...w.document.querySelectorAll('#tourRings .tring')].map(r=>['left','top','width','height'].map(a=>parseFloat(r.style[a])));
const overlap=(a,b)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
function copyStorage(w){ const s={}, ss={}; for(let i=0;i<w.localStorage.length;i++){ const k=w.localStorage.key(i); s[k]=w.localStorage.getItem(k); } for(let i=0;i<w.sessionStorage.length;i++){ const k=w.sessionStorage.key(i); ss[k]=w.sessionStorage.getItem(k); } return {store:s,session:ss}; }
(async()=>{
  // 1. nowa sesja (język ankiety PL): informacja startowa SURGITOME nie pojawia się, samouczek dopiero po instrukcji ankiety
  let b=boot({k:'TEST23',store:{'surgitome-study-lang':'pl'},fresh:true,before:geom(false)}); cardSize(b); let {$,w}=b; await sleep(600);
  ok($('intro').hidden,'informacja startowa w wersji badawczej'); ok($('tour').hidden,'samouczek przed instrukcją ankiety');
  await toAtlas(b); await sleep(600);
  ok(!$('tour').hidden,'samouczek nie wystartował po instrukcji');
  ok($('tourTitle').textContent==='Język'&&$('tourNum').textContent==='Samouczek · 1 / 7','krok 1: '+$('tourTitle').textContent+' | '+$('tourNum').textContent);
  ok($('tourPrev').disabled,'„Wstecz” aktywne w kroku 1'); ok(w.document.activeElement===$('tourNext'),'fokus nie na „Dalej”');
  // 2. klawisze: strzałki przechodzą między krokami i nie zmieniają kadru pod spodem
  const cap0=$('capTitle').textContent; key(w,'ArrowRight'); await sleep(50);
  ok($('tourTitle').textContent==='Wyszukiwarka','→ nie przechodzi do kroku 2'); ok($('capTitle').textContent===cap0,'→ zmienia kadr pod samouczkiem');
  ok(!/badani/.test($('tourText').textContent),'krok Wyszukiwarka wspomina badania');
  key(w,'ArrowLeft'); key(w,'l'); await sleep(50); ok($('tourTitle').textContent==='Język','← nie wraca'); ok(w.__sgTest.state().labels,'klawisz L działa pod samouczkiem');
  // 3. podświetlony przełącznik języka można kliknąć: samouczek i ankieta przechodzą na EN i z powrotem
  ok(!$('tourLive').hidden,'brak klikalnego podświetlenia w kroku Język');
  $('tourLive').click(); await sleep(50);
  ok($('tourTitle').textContent==='Language'&&$('tourNext').textContent==='Next'&&w.document.documentElement.lang==='en'&&$('stRateBtn').textContent==='Rate','EN: '+$('tourTitle').textContent+' | '+$('tourNext').textContent);
  $('tourLive').click(); await sleep(50); ok($('tourTitle').textContent==='Język'&&w.__sgStudy.state().lang==='pl','powrót do PL');
  // 4. wszystkie kroki: tytuły, liczba wycięć, karta nie zasłania pojedynczego wycięcia
  const titles=[], counts=[]; $('ctxRow').hidden=false; $('btnPlay').hidden=false;
  for(let i=0;i<7;i++){ await sleep(650); titles.push($('tourTitle').textContent); const H=holes(w); counts.push(H.length);
    const c=$('tourCard'), cr=[parseFloat(c.style.left),parseFloat(c.style.top),360,210];
    if(H.length===1&&i<5) ok(!overlap(cr,H[0]),'karta zasłania podświetlenie w kroku '+(i+1)+': '+cr+' / '+H[0]);
    if(i<6) $('tourNext').click(); }
  console.log('kroki:',titles.join(' → '),'| wycięcia:',counts.join(','));
  ok(titles.join('|')==='Język|Wyszukiwarka|Nawigacja|Etykiety|Informacje|Animacje|Ocena','kolejność kroków: '+titles.join('|'));
  ok(counts.join(',')==='1,1,2,1,1,2,2','liczba wycięć: '+counts.join(','));
  ok($('tourNext').textContent==='Gotowe','ostatni krok bez „Gotowe”');
  $('tourNext').click(); await sleep(50);
  ok($('tour').hidden,'„Gotowe” nie zamyka'); ok(w.__sgStudy.state().tourDone,'brak zapisu w stanie ankiety');
  key(w,'ArrowRight'); await sleep(700); ok($('capTitle').textContent!==cap0,'→ nie działa po zamknięciu samouczka');
  allErrs.push(...b.errs);
  // 5. wznowienie sesji: samouczek nie startuje ponownie; powtórka z opisu zabiegu, „Pomiń”
  w.__sgStudy.save(); const snap=copyStorage(w);
  b=boot({store:snap.store,session:snap.session,before:geom(false)}); cardSize(b); await sleep(1100); const $3=b.$;
  ok($3('tour').hidden&&b.w.__sgStudy.state().phase==='atlas','samouczek pokazany ponownie po wznowieniu');
  $3('fInfo').click(); $3('btnTour').click(); await sleep(50);
  ok(!$3('tour').hidden&&$3('tourTitle').textContent==='Język','powtórka z opisu nie działa'); ok($3('panel').classList.contains('closed'),'opis nie zamknięty przy powtórce');
  $3('tourSkip').click(); ok($3('tour').hidden,'„Pomiń” nie zamyka');
  allErrs.push(...b.errs);
  // 6. telefon: wyszukiwarka w otwartym menu ☰, nawigacja = menu + pasek kadrów, ostatni krok — pasek z przyciskiem „Oceń”; powtórka z menu
  b=boot({k:'TEST23',store:{'surgitome-study-lang':'pl'},mobile:true,before:geom(true)}); cardSize(b); w=b.w; const $4=b.$; await sleep(500);
  await toAtlas(b); await sleep(700);
  ok(!$4('tour').hidden,'telefon: samouczek nie wystartował'); ok($4('tourHint').textContent==='Spróbuj: dotknij podświetlonego przycisku.','telefon: zła podpowiedź');
  $4('tourNext').click(); await sleep(120);
  ok(!$4('mMenu').hidden,'telefon: menu nie otwarte w kroku Wyszukiwarka'); ok(/☰/.test($4('tourText').textContent),'telefon: opis bez menu ☰');
  ok(holes(w).length===1&&holes(w)[0][1]<340,'telefon: wycięcie nie na polu wyszukiwania: '+JSON.stringify(holes(w)));
  $4('tourNext').click(); await sleep(150);
  ok($4('mMenu').hidden,'telefon: menu nie zamknięte po kroku Wyszukiwarka'); ok(holes(w).length===2,'telefon: nawigacja — wycięcia '+holes(w).length);
  $4('tourPrev').click(); await sleep(50); ok(!$4('mMenu').hidden,'telefon: „Wstecz” nie otwiera menu');
  for(let i=0;i<5;i++){ $4('tourNext').click(); await sleep(120); } await sleep(700);
  ok($4('tourTitle').textContent==='Ocena'&&/Oceń/.test($4('tourText').textContent)&&holes(w).length===1,'telefon: krok Ocena: '+$4('tourTitle').textContent+' | wycięcia '+holes(w).length);
  key(w,'Escape'); ok($4('mMenu').hidden&&$4('tour').hidden,'telefon: Esc nie zamyka menu i samouczka');
  $4('mMenuBtn').click(); const chip=[...w.document.querySelectorAll('#mMenuBody .mchip')].find(x=>x.textContent==='Samouczek');
  ok(chip,'telefon: brak „Samouczek” w menu'); if(chip){ chip.click(); await sleep(50); ok(!$4('tour').hidden&&$4('mMenu').hidden,'telefon: powtórka z menu'); }
  allErrs.push(...b.errs);
  console.log('errors',JSON.stringify(allErrs.concat(fails))); process.exit(0);
})();
