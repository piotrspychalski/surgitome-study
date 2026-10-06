// SURGITOME — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// SURGITOME-STUDY: badania ECOPOP (ETHOS, SCAR) ukryte całkowicie — brak w danych, kategoriach, wyszukiwarce (PL/EN), ulubionych (także zapisanych
// wcześniej w wersji głównej na tym samym urządzeniu), menu telefonu i w „Dalej” po ostatniej pozycji. node tests/ui_32.js [mobile]
const {boot,sleep}=require('./badanie_boot.js');
const MOB=process.argv.includes('mobile'); const fails=[], allErrs=[]; function ok(c,m){ if(!c) fails.push(m); }
(async()=>{
  const b=boot({k:'TEST23',mobile:MOB,store:{'surgitome-fav':JSON.stringify(['ethos','rh','scar'])}}); const {$,D,w}=b; await sleep(600);
  ok(!w.ANAT.PROCS.some(p=>p.split||p.cat==='trials'),'badania w ANAT.PROCS'); ok(!w.ANAT.CATS.some(c=>c.id==='trials'),'kategoria „Badania” w ANAT.CATS');
  ok(w.ANAT.TRIALS&&w.ANAT.TRIALS.length===2,'ANAT.TRIALS (dane modułu badań) zniknęły — moduł widoku podzielonego może się nie uruchomić');
  // ulubione z wersji głównej: badania odfiltrowane, zabiegi zostają
  [...D.querySelectorAll('#cats .cat')][0].click(); await sleep(300);
  const favTabs=[...D.querySelectorAll('#tabs .tab')].map(t=>t.textContent);
  ok(favTabs.length===1&&/Hemikolektomia prawa|Right hemicolectomy/.test(favTabs[0]),'ulubione: '+favTabs.join(' | '));
  ok(![...D.querySelectorAll('#cats .cat')].some(c=>/Badania|Trials/.test(c.textContent)),'kategoria „Badania” w pasku');
  // wyszukiwarka: nazwy badań, numery rejestrów, słowa kluczowe — bez wyników z badań (PL i EN)
  for(const lang of ['pl','en']){
    if(w.__sgStudy.state().lang!==lang) $('btnLang').click(); await sleep(30);
    const inp=MOB?$('mq'):$('q'), box=MOB?$('mqres'):$('qres');
    if(MOB) $('mMenuBtn').click();
    for(const q of ['ETHOS','SCAR','NCT','eFTR','ECOPOP']){
      inp.value=q; inp.dispatchEvent(new w.Event('input')); await sleep(30);
      const res=[...box.querySelectorAll('[role=option], .qr, button, div')].map(x=>x.textContent).join(' | ');
      ok(!/ETHOS|SCAR|eFTR/i.test(res),'wyszukiwarka ('+lang+') „'+q+'” pokazuje badanie: '+res.slice(0,160));
    }
    inp.value=''; inp.dispatchEvent(new w.Event('input')); if(MOB) $('mMenuClose').click();
  }
  // menu telefonu: brak kategorii „Badania”
  if(MOB){ $('mMenuBtn').click(); await sleep(30); ok(![...D.querySelectorAll('#mMenuBody .mchip')].some(c=>/Badania|Trials/.test(c.textContent)),'telefon: „Badania” w menu'); $('mMenuClose').click(); }
  // „Dalej” po ostatnim kadrze ostatniej pozycji (Ileostomia, ostatni wariant) nie prowadzi do badań
  [...D.querySelectorAll('#cats .cat')].find(c=>/Jelito grube|Large bowel/.test(c.textContent)).click(); await sleep(200);
  const tabs=[...D.querySelectorAll('#tabs .tab')]; tabs[tabs.length-1].click(); await sleep(500);
  const vb=D.querySelectorAll('#variants .vbtn'); vb[vb.length-1].click(); await sleep(500);
  for(let i=0;i<20;i++){ $('btnNext').click(); await sleep(60); }
  await sleep(500);
  const cur=w.ANAT.PROCS[w.__sgTest.state().an]; ok(cur.id==='ileo'&&!cur.split,'„Dalej” po ostatniej pozycji: '+cur.id);
  ok($('btnNext').disabled,'„Dalej” aktywne na końcu listy');
  allErrs.push(...b.errs);
  console.log('badania ukryte'+(MOB?' (telefon)':'')+': dane, kategorie, wyszukiwarka PL/EN, ulubione, „Dalej”');
  console.log('errors',JSON.stringify(allErrs.concat(fails))); process.exit(0);
})();
